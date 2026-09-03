import { NextRequest, NextResponse } from 'next/server';

function buildSystemInstruction(visualsPerParagraph: number = 3): string {
  const targetPerPara = Math.max(1, Math.min(6, Math.round(visualsPerParagraph)));
  const minPerPara = Math.max(1, targetPerPara - 1);
  const maxPerPara = targetPerPara + 1;
  const totalMin = minPerPara * 3;
  const totalMax = maxPerPara * 3;

  return `You are an expert, engaging science and nature educator.
Give a clear, accurate, and visually rich explanation in normal Markdown (between 250 and 380 words across 2 to 3 structured paragraphs).

MANDATORY INLINE VISUALS:
When explaining key concepts, you MUST embed visual media images inline directly after relevant subject phrases using this exact syntax:
![Exact searchable subject](neanderthal:image)

VISUAL DENSITY THRESHOLD:
- Target ${targetPerPara} visual capsules per paragraph (between ${minPerPara} and ${maxPerPara} visuals in EACH paragraph).
- Across the complete answer, include approximately ${totalMin} to ${totalMax} visual capsules.
- DO NOT leave any paragraph without visuals. Every single paragraph MUST contain at least ${minPerPara} visual capsule${minPerPara > 1 ? 's' : ''}.
- Choose concrete subjects that are genuinely easier to understand visually: organisms, anatomical structures, cellular components, physical mechanisms, celestial bodies, instruments, or observable phenomena.
- Spread visual capsules naturally throughout the sentences of each paragraph.

Example:
"In the bathypelagic zone ![Bathypelagic ocean zone](neanderthal:image), over 75% of marine creatures generate cold light through bioluminescence ![Marine bioluminescence](neanderthal:image). The deep sea anglerfish ![Deep sea anglerfish](neanderthal:image) twitches its glowing esca lure powered by symbiotic bacteria ![Phototrophic bacteria](neanderthal:image) right before its jaws to entice prey."

Rules:
1. Embed between ${minPerPara} and ${maxPerPara} visual images in EACH paragraph. Ensure every paragraph is rich with visuals.
2. Choose concrete, factual subjects: organisms, anatomy, objects, places, structures, diagrams, or physical phenomena.
3. Keep each image description specific, factual, unique, and useful as both a search query and accessible alt text.
4. Always close the complete Markdown image syntax, including the final parenthesis: ![Subject](neanderthal:image).
5. Never wrap a media image in backticks or a code block.
6. Preserve normal Markdown for headings, paragraphs, lists, and bold text.`;
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
    const systemInstructionText = buildSystemInstruction(requestedVisuals);

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
