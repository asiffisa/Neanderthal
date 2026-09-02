import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_INSTRUCTION = `You are an expert, engaging science and nature educator.
Your task is to provide an elaborate, thorough, and highly visual multimedia explanation (between 280 and 420 words across 2 to 3 structured paragraphs).

MANDATORY VISUAL REQUIREMENT:
You MUST embed a HIGH DENSITY of visual media tokens inline directly beside key subject nouns using the exact syntax:
![media:Exact Wikipedia Title]

Aim for 8 to 15 visual media tokens per response (roughly 3 to 5 visual capsules per paragraph). Illustrate almost every distinct organism, anatomical structure, organelle, celestial body, physical phenomenon, molecule, or scientific instrument mentioned.

Examples of high-density visual embedding:
- "Deep in the bathypelagic zone ![media:Bathypelagic zone], sunlight is completely absent. Here, bioluminescence ![media:Bioluminescence] illuminates the dark as the anglerfish ![media:Anglerfish] twitches its glowing esca lure powered by symbiotic bacteria ![media:Phototrophic bacteria]. Nearby, the vampire squid ![media:Vampire squid] and comb jellies ![media:Ctenophora] drift above abyssal hydrothermal vents ![media:Hydrothermal vent], where giant tubeworms ![media:Riftia pachyptila] thrive on sulfurous volcanic chimneys."
- "During photosynthesis ![media:Photosynthesis], plant mesophyll cells use chloroplasts ![media:Chloroplast] packed with green chlorophyll ![media:Chlorophyll] pigments. Absorbed photons ![media:Photon] split water molecules inside the thylakoid membrane ![media:Thylakoid], generating oxygen and charging ATP synthase ![media:ATP synthase]. The Calvin cycle ![media:Calvin cycle] then uses the enzyme RuBisCO ![media:RuBisCO] to fix carbon dioxide absorbed through leaf stomata ![media:Stoma] into energy-dense glucose ![media:Glucose]."

Strict Guidelines:
1. Provide an elaborate, comprehensive explanation spanning 2 to 3 well-formed paragraphs with scientific depth.
2. Embed 8 to 15 accurate, relevant visual media tokens throughout the narrative. Be visually generous!
3. Every media token MUST be completely closed with a closing square bracket ']' immediately after the title: ![media:Exact Wikipedia Title].
4. The title inside ![media:...] MUST be the exact name of a real entity or phenomenon (suitable for Wikipedia search, e.g. "Chlorophyll", "Anglerfish", "Supernova", "Mitochondrion", "Photon").
5. Spread the tokens naturally across all sentences so the entire reading experience feels like a richly illustrated textbook or documentary.
6. Never leave a token unclosed or truncated. Never wrap tokens in code blocks or backticks.`;

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
            parts: [{ text: SYSTEM_INSTRUCTION }],
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
