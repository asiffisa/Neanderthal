import { NextRequest, NextResponse } from 'next/server';

function buildSystemInstruction(visualsPerParagraph: number = 3, topic: string = ''): string {
  const targetPerPara = Math.max(1, Math.min(5, Math.round(visualsPerParagraph)));
  const minPerPara = Math.max(1, targetPerPara - 1);
  const maxPerPara = targetPerPara + 1;
  const entityTopic =
    topic.length > 35 || topic.includes('?') || topic.split(/\s+/).length > 3
      ? ''
      : topic.trim();

  return `You are an expert, engaging, multidimensional knowledge educator and essayist.
Give a clear, compelling, and visually rich explanation in normal Markdown (between 250 and 380 words across 2 to 3 structured paragraphs).

INLINE VISUAL CAPSULES:
${entityTopic ? `Primary topic: "${entityTopic}". When referring to movies, roles, artworks, or events related to ${entityTopic}, ALWAYS include ${entityTopic} and the work's title (e.g. ![${entityTopic} in Drishyam film](neanderthal:image?provider=duckduckgo), ![${entityTopic} in Maya film](neanderthal:image?provider=duckduckgo)).` : `Tag concrete, specific nouns directly (e.g. ![Clathrate hydrate](neanderthal:image), ![Polar ice sheet](neanderthal:image), ![Mass spectrometer](neanderthal:image)).`}

CRITICAL WRITING RULE: TEXT MUST ALWAYS PRECEDE THE PILL (SUPPORTIVE VISUAL LAYER):
The text MUST always be fully readable and complete on its own. The visual pill is a supportive companion, NEVER a substitute for words.
ALWAYS write the full subject/noun in the sentence FIRST, and immediately place the visual capsule AFTER it:

CORRECT:
"The electric eel ![Electric eel](neanderthal:image) achieves its bioelectric discharge by transforming modified muscle tissue ![Muscle tissue](neanderthal:image) into specialized electrocytes ![Electrocytes](neanderthal:image) that act as biological batteries. A master pacemaker nucleus ![Pacemaker nucleus](neanderthal:image) sends action potential signals ![Action potential](neanderthal:image) down the length of the electric organ ![Electric organ](neanderthal:image)."

WRONG (STRICTLY FORBIDDEN):
"The ![Electric eel](neanderthal:image) achieves its bioelectric discharge by transforming modified ![Muscle tissue](neanderthal:image) into specialized ![Electrocytes](neanderthal:image)..."
(NEVER delete or replace words with a pill! If you remove the pill, the sentence must still read as flawless, complete prose.)

STRICT RULES FOR SEARCH ACCURACY:
1. NEVER paste long sentences, prompt questions, or clauses into an image tag!
2. NEVER use generic filler words like "portrait photograph", "photo of", "image of", "diagram of", or "wallpaper". Tag the exact entity name directly (e.g. ![Mohanlal](neanderthal:image?provider=duckduckgo), not ![Mohanlal portrait photograph]).
3. STRICT BAN ON ABSTRACT METAPHORS & IDIOMS:
   NEVER tag abstract idioms, verbs, or generic phrases!
   DO NOT tag: "commanding dialogue delivery", "millions of fans", "glass ceiling", "box office", "thriving enterprise", "personal life", or "modern entrepreneur".
   ONLY tag concrete, visually identifiable entities: specific named people, real movie posters/stills, actual physical locations, biological specimens, tangible instruments, or distinct artifacts.

PROVIDER BALANCING & SPREAD (DUCKDUCKGO + WIKIPEDIA):
- DuckDuckGo Web Imagery: ![Subject](neanderthal:image?provider=duckduckgo)
  Use for: Contemporary people, cinema/films, actors, celebrities, pop culture, entertainment, modern events, and news.
- Wikipedia: ![Subject](neanderthal:image?provider=wikipedia)
  Use for: Encyclopedic concepts, science, anatomy, biology, classical history, geography, and physical mechanisms.

- Target ${targetPerPara} visual capsules per paragraph (between ${minPerPara} and ${maxPerPara} visuals in EACH paragraph).
- Spread visual capsules naturally right after the relevant entity.
- Always close the complete Markdown image syntax: ![Subject](neanderthal:image?provider=...).
- Never wrap a media image in backticks or a code block.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = body.prompt;
    const clientKey = body.apiKey;
    const serverKey = process.env.GEMINI_API_KEY;
    const apiKey = clientKey?.trim() || serverKey?.trim();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Gemini API key is required. Please provide an API key in the UI settings or configure GEMINI_API_KEY on the server.',
        },
        { status: 401 }
      );
    }

    const requestedVisuals =
      typeof body.visualsPerParagraph === 'number' && body.visualsPerParagraph > 0
        ? body.visualsPerParagraph
        : 5;
    const systemInstructionText = buildSystemInstruction(requestedVisuals, prompt);

    const requestedModel = body.model?.trim() || 'gemini-3.8-flash';
    const candidateModels = Array.from(
      new Set([
        requestedModel,
        'gemini-3.8-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-1.5-flash',
      ])
    );

    let geminiRes: Response | null = null;
    let lastErrorText = '';
    let lastStatus = 500;

    for (const model of candidateModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(
        apiKey
      )}`;

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstructionText }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (res.ok) {
        geminiRes = res;
        break;
      } else {
        const errorText = await res.text();
        lastErrorText = errorText;
        lastStatus = res.status;

        // If the model is not found, deprecated, or no longer available, attempt the next model
        const isModelUnavailable =
          res.status === 404 ||
          errorText.includes('no longer available') ||
          errorText.includes('not found') ||
          errorText.includes('unsupported');

        if (!isModelUnavailable) {
          // If it's an authentication error (e.g. invalid API key), stop immediately
          let errorMessage = `Gemini API error (${res.status})`;
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error?.message) {
              errorMessage = errorJson.error.message;
            }
          } catch {
            errorMessage = errorText || errorMessage;
          }
          return NextResponse.json({ error: errorMessage }, { status: res.status });
        }
      }
    }

    if (!geminiRes || !geminiRes.ok) {
      let errorMessage = `Gemini API error (${lastStatus})`;
      try {
        const errorJson = JSON.parse(lastErrorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        errorMessage = lastErrorText || errorMessage;
      }
      return NextResponse.json({ error: errorMessage }, { status: lastStatus });
    }

    if (!geminiRes.body) {
      return NextResponse.json({ error: 'No response body from Gemini' }, { status: 500 });
    }

    // Transform SSE chunks from Gemini into a plain text stream of tokens
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.slice(5).trim();
            if (jsonStr && jsonStr !== '[DONE]') {
              try {
                const parsed = JSON.parse(jsonStr);
                const candidate = parsed.candidates?.[0];
                const parts = candidate?.content?.parts || [];
                for (const part of parts) {
                  if (part.text) {
                    controller.enqueue(encoder.encode(part.text));
                  }
                }
              } catch {
                // Ignore SSE parsing errors on partial chunks
              }
            }
          }
        }
      },
      flush(controller) {
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data:')) {
            try {
              const parsed = JSON.parse(trimmed.slice(5).trim());
              const candidate = parsed.candidates?.[0];
              const parts = candidate?.content?.parts || [];
              for (const part of parts) {
                if (part.text) {
                  controller.enqueue(encoder.encode(part.text));
                }
              }
            } catch {
              // Ignore
            }
          }
        }
      },
    });

    const stream = geminiRes.body.pipeThrough(transformStream);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
