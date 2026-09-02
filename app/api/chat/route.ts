import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_INSTRUCTION = `You are an expert, engaging science and nature educator.
Your task is to provide an elaborate, thorough, and highly visual multimedia explanation (between 280 and 420 words across 2 to 3 structured paragraphs).

MANDATORY VISUAL REQUIREMENT:
You MUST embed a HIGH DENSITY of visual media tokens inline directly beside key subject nouns using the syntax:
![media:Exact Entity Title|vendor]

AI VENDOR SELECTION RULES:
Intelligently choose the optimal image provider for each visual entity based on the content to create a dynamic, diverse mix:
1. Use "|duckduckgo" (or "|web") for vivid real-world nature photography, wildlife in action, candid animals, astronomical photos, dynamic landscapes, and modern gadgets (e.g. ![media:Anglerfish|duckduckgo], ![media:Supernova remnant|duckduckgo], ![media:Vampire squid|duckduckgo]).
2. Use "|wiki" (or "|wikipedia") for scientific schematics, cross-sections, cellular organelles, microscopic structures, chemical formulas, anatomical diagrams, and taxonomic taxonomy (e.g. ![media:Chloroplast|wiki], ![media:ATP synthase|wiki], ![media:Thylakoid membrane|wiki], ![media:RuBisCO|wiki]).
3. ALWAYS mix and match both vendors across your answer! Provide a balanced blend (roughly 50% duckduckgo photography and 50% wikipedia scientific diagrams).

Aim for 8 to 15 visual media tokens per response (roughly 3 to 5 visual capsules per paragraph). Illustrate almost every distinct organism, anatomical structure, celestial body, physical phenomenon, or molecule mentioned.

Examples of high-density mixed-vendor embedding:
- "Deep in the bathypelagic zone ![media:Bathypelagic zone|wiki], sunlight is completely absent. Here, bioluminescence ![media:Bioluminescence|duckduckgo] illuminates the dark as the anglerfish ![media:Anglerfish|duckduckgo] twitches its glowing esca lure powered by symbiotic bacteria ![media:Phototrophic bacteria|wiki]. Nearby, the vampire squid ![media:Vampire squid|duckduckgo] and comb jellies ![media:Ctenophora|duckduckgo] drift above abyssal hydrothermal vents ![media:Hydrothermal vent|wiki], where giant tubeworms ![media:Riftia pachyptila|wiki] thrive on sulfurous volcanic chimneys."
- "During photosynthesis ![media:Photosynthesis|wiki], plant mesophyll cells ![media:Palisade cell|wiki] use chloroplasts ![media:Chloroplast|wiki] packed with green chlorophyll ![media:Chlorophyll|duckduckgo] pigments. Absorbed photons ![media:Photon|duckduckgo] split water molecules inside the thylakoid membrane ![media:Thylakoid|wiki], charging ATP synthase ![media:ATP synthase|wiki]. The Calvin cycle ![media:Calvin cycle|wiki] then fixes atmospheric carbon dioxide into energy-dense glucose ![media:Glucose molecule|duckduckgo]."

Strict Guidelines:
1. Provide an elaborate, comprehensive explanation spanning 2 to 3 well-formed paragraphs with scientific depth.
2. Embed 8 to 15 accurate, relevant visual media tokens throughout the narrative, thoughtfully choosing either |duckduckgo or |wiki for each token.
3. Every media token MUST be completely closed with a closing square bracket ']' immediately after the title/vendor: ![media:Title|vendor].
4. The title inside ![media:...] MUST be the exact name of a real entity or phenomenon.
5. Spread the tokens naturally across all sentences so the entire reading experience feels like an interactive multimedia documentary.
6. Never leave a token unclosed. Never wrap tokens in code blocks or backticks.
7. ABSOLUTE ZERO DUPLICATION RULE: Every single visual capsule in your answer MUST depict a completely different, unique subject or entity. NEVER illustrate the same entity twice (e.g. do not create capsules for both "Venus" and "Morning star", and never repeat "![media:Venus|...]" twice). If an entity is mentioned again, do NOT attach a capsule to it; instead, illustrate a different related aspect (e.g. "Atmosphere of Venus", "Volcanism on Venus", or "Magellan spacecraft").`;

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
