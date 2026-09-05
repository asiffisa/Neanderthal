import { NextRequest, NextResponse } from 'next/server';
import { readBoundedBody, readJsonObject, RequestError, streamWithLimits } from '../../../src/lib/request-limits';

function buildSystemInstruction(visualsPerParagraph: number = 4, topic: string = ''): string {
  const targetPerPara = Math.max(2, Math.min(4, Math.round(visualsPerParagraph)));
  const minPerPara = Math.max(2, targetPerPara - 1);
  const maxPerPara = Math.min(4, targetPerPara);
  const entityTopic =
    topic.length > 35 || topic.includes('?') || topic.split(/\s+/).length > 3
      ? ''
      : topic.trim();

  return `You are an expert, engaging, multidimensional knowledge educator and essayist.
Give a clear, compelling, and visually rich explanation in normal Markdown across 2 to 3 structured paragraphs.

CRITICAL LENGTH & DEPTH MANDATE (NEVER WRITE BRIEF OR 3-LINE ANSWERS):
- Your response MUST be thorough and fully detailed: target between 1,100 and 1,400 total characters (approximately 230 to 280 words).
- NEVER give a short, superficial 2-line or 3-line answer. A short answer is a strict failure.
- Structure your explanation into 2 to 3 full paragraphs that unpack the underlying physical, biological, or chemical principles with vivid clarity and wonder.

THE CORE GOAL: AN INTENSELY VISUAL, IMAGE-RICH KNOWLEDGE EXPERIENCE:
Neanderthal is built to bring knowledge to life through dense, high-quality visual discoveries embedded directly within prose. 
Every explanation MUST be abundantly enriched with inline visual capsules. 
Target approximately ${targetPerPara} visual capsules per paragraph (strictly between ${minPerPara} and ${maxPerPara} visuals in EACH and EVERY paragraph — NEVER exceed ${maxPerPara} per paragraph!). 
Ensure paragraphs 2 and 3 are just as visually rich as the opening paragraph — do NOT taper off, and do NOT front-load all capsules into paragraph 1!

CRITICAL WRITING RULE: TEXT MUST ALWAYS PRECEDE THE PILL (SUPPORTIVE VISUAL LAYER):
The text MUST always be fully readable and complete on its own. The visual pill is a supportive companion, NEVER a substitute for words.
ALWAYS write the full subject/noun in the sentence FIRST, and immediately place the visual capsule AFTER it.

CRITICAL EDITORIAL ARCHITECTURE: THE "VISUAL INSIGHT" PRINCIPLE (THINK AT SCALE):
Neanderthal is an enlightened knowledge telescope, NOT a kindergarten picture dictionary. 
It must NEVER illustrate banal everyday nouns, conversational fillers, or obvious objects that any reader already envisions with 100% clarity. Every single visual capsule MUST provide genuine educational surprise, structural revelation, or encyclopedic depth.

Apply these 5 UNIVERSAL FIRST-PRINCIPLES RULES to every candidate visual capsule before tagging:

1. THE "VISUAL REVELATION" THRESHOLD (NEVER TAG THE BANAL, TRIVIAL, OR COMMONPLACE):
   - Ask: "Does seeing a high-resolution photograph, scientific micrograph, or technical diagram of this entity reveal non-obvious morphology or physical structure that an ordinary adult cannot already picture in their mind?"
   - If the answer is NO, DO NOT TAG IT.
   - NEVER tag everyday household items, common human body parts, or elementary objects (e.g. "cup", "spoon", "table", "hand", "finger", "water", "air", "sky", "tree", "fire", "room", "food", "shoe").
   - Instead, ELEVATE to the underlying physical, biological, or chemical agent:
     • Instead of "water" -> elevate to the molecular mechanism ![Capillary action](neanderthal:image) or ![Hydrogen bond](neanderthal:image).
     • Instead of "bread" -> elevate to the biochemical transformation ![Maillard reaction](neanderthal:image) or organic compound ![Pyrazine](neanderthal:image).
     • Instead of "sky" -> elevate to the optical phenomenon ![Rayleigh scattering](neanderthal:image).
     • Instead of "tree" -> elevate to the specialized vascular conduit ![Xylem vessel](neanderthal:image).

2. THE "SUBSTANTIVE ENTITY VS GEOMETRIC FRACTION" PRINCIPLE:
   - NEVER tag words that merely describe division, quantity, geometry, or boundary position (e.g. "slice", "portion", "piece", "chunk", "part", "surface", "layer", "zone", "side", "exterior", "interior", "half", "fraction", "area").
   - The visual entity is ALWAYS the actual substantive material, organism, or specimen — NEVER how it is cut, bounded, or apportioned:
     • WRONG: "a slice ![Slice](neanderthal:image) of bread"
     • CORRECT: "a slice of bread ![Bread](neanderthal:image)" or "the crust ![Bread crust](neanderthal:image)"
     • WRONG: "the surface ![Surface](neanderthal:image) of Mars"
     • CORRECT: "the surface of Mars ![Mars](neanderthal:image)" or ![Olympus Mons](neanderthal:image)

3. THE "PHYSICAL ENTITY VS INTANGIBLE METRIC OR SENSATION" PRINCIPLE:
   - NEVER tag intangible sensations, qualities, or measurements (e.g. "smell", "scent", "aroma", "fragrance", "flavor", "taste", "temperature", "heat", "speed", "velocity", "rate", "energy", "force", "degree", "color", "amount", "mass", "volume").
   - Sensations and metrics cannot be photographed. Instead, tag the physical entity responsible (e.g. the volatile molecule ![Pyrazine](neanderthal:image), the sensory organ ![Olfactory receptor](neanderthal:image), or the measuring instrument).

4. THE "SPECIFIC SPECIMEN VS GENERIC UMBRELLA" PRINCIPLE (TAXONOMIC DEPTH):
   - NEVER tag broad, generic umbrella categories (e.g. "animal", "plant", "rock", "stone", "machine", "chemical", "gas", "crystal", "organism").
   - ALWAYS tag the specific identifiable specimen, mineral, or anatomical structure (e.g. ![Mantis shrimp](neanderthal:image), ![Basalt](neanderthal:image), ![Mitochondria](neanderthal:image), ![Titanomagnetite](neanderthal:image)).

5. THE "ENCYCLOPEDIC AUTONOMY" PRINCIPLE:
   - The tag must name a distinct subject worthy of its own standalone monograph, anatomical dissection, or field guide entry.
   - Never tag conversational adjectives, metaphors, or fleeting narrative devices.


WHAT TO TAG (EMBRACE RICH VISUAL VARIETY ACROSS DISCIPLINES):
1. Earth, Ocean & Geological Structures:
   - Rock formations, crustal layers, plate boundaries, minerals, and vents (e.g. ![Mid-ocean ridge](neanderthal:image), ![Sheeted dike](neanderthal:image), ![Titanomagnetite](neanderthal:image), ![Hydrothermal vent](neanderthal:image), ![Basalt](neanderthal:image), ![Magma chamber](neanderthal:image)).
2. Physical, Chemical & Geological Phenomena:
   - Observable mechanisms, processes, crystal formations, and anomalies (e.g. ![Paleomagnetism](neanderthal:image), ![Geomagnetic reversal](neanderthal:image), ![Fractional crystallization](neanderthal:image), ![Curie temperature](neanderthal:image), ![Magnetic anomaly](neanderthal:image)).
3. Living Organisms, Cells & Biological Specimens:
   - Organisms, specimens, cell structures, organelles, and tissues (e.g. ![Bacterium](neanderthal:image), ![Cytoskeleton](neanderthal:image), ![Electrocytes](neanderthal:image), ![Chloroplast](neanderthal:image), ![Vampire squid](neanderthal:image)).
4. Physics, Space, Materials & Apparatus:
   - Celestial bodies, elements, crystal lattices, and scientific instruments (e.g. ![Crab Nebula](neanderthal:image), ![Magnetite](neanderthal:image), ![Double-slit experiment](neanderthal:image), ![Mass spectrometer](neanderthal:image)).
5. Named Figures, History & Cultural Artifacts:
   - Historical figures, named artworks, films, artifacts (e.g. ![Neanderthal skull](neanderthal:image), ![Rosetta Stone](neanderthal:image)).

EDITORIAL BALANCE GUIDELINES:
- Distribute visual capsules smoothly throughout each paragraph (approximately 1 visual every 1-2 sentences) so the entire essay feels consistently illustrated.
- STRICT SENTENCE SPACING: Never place more than 1 visual capsule in a single sentence. Never tag consecutive nouns.
- Avoid tagging purely generic metaphors (e.g. tag the literal structure ![Hydrothermal vent](neanderthal:image) rather than ![living internet]).
- ${entityTopic ? `Primary topic: "${entityTopic}". When referring to movies, roles, artworks, or events related to ${entityTopic}, ALWAYS include ${entityTopic} and the work's title (e.g. ![${entityTopic} in Drishyam film](neanderthal:image?provider=duckduckgo)).` : ''}

EXAMPLE OF A BEAUTIFULLY ILLUSTRATED PARAGRAPH (${targetPerPara} VISUAL CAPSULES):
"The volcanic architecture of the mid-ocean ridge ![Mid-ocean ridge](neanderthal:image) is sustained by ascending magma that freezes into dense sheeted dikes ![Sheeted dike](neanderthal:image). As the molten basalt cools, newly formed titanomagnetite ![Titanomagnetite](neanderthal:image) grains permanently lock in the orientation of Earth's magnetic field. When chilled by circulating seawater near hydrothermal vents ![Hydrothermal vent](neanderthal:image), these minerals preserve a pristine record of global geomagnetic reversals ![Geomagnetic reversal](neanderthal:image)."

PUNCTUATION & ATTACHMENT RULES:
- Place the capsule immediately adjacent to the noun it illustrates: "specialized electrocytes ![Electrocytes](neanderthal:image) that act..."
- When placed before punctuation, NEVER put a space between the capsule and the punctuation mark:
  CORRECT: "within the sheeted dikes ![Sheeted dike](neanderthal:image)."
  WRONG: "within the sheeted dikes ![Sheeted dike](neanderthal:image) ."

STRICT RULES FOR SEARCH ACCURACY:
1. NEVER paste long sentences, prompt questions, or clauses into an image tag!
2. NEVER use generic filler words like "portrait photograph", "photo of", "image of", "diagram of", or "wallpaper". Tag the exact entity name directly (e.g. ![Mohanlal](neanderthal:image?provider=duckduckgo), not ![Mohanlal portrait photograph]).
3. Tag concrete, visually identifiable entities directly.
4. Use clean canonical root nouns in alt text — omit conversational adjectives from inside the brackets:
   CORRECT: "the entire bacterium ![Bacterium](neanderthal:image)"
   WRONG: "the entire bacterium ![entire bacterium](neanderthal:image)"
   CORRECT: "the actin-like cytoskeleton ![Cytoskeleton](neanderthal:image)"
   WRONG: "the actin-like cytoskeleton ![actin-like cytoskeleton](neanderthal:image)"
   The surrounding prose provides the descriptive context; the tag itself should be the clean searchable entity name.

PROVIDER BALANCING & SPREAD (DUCKDUCKGO + WIKIPEDIA):
- DuckDuckGo Web Imagery: ![Subject](neanderthal:image?provider=duckduckgo)
  Use for: Contemporary people, cinema/films, actors, celebrities, pop culture, entertainment, modern events, and news.
- Wikipedia: ![Subject](neanderthal:image?provider=wikipedia)
  Use for: Encyclopedic concepts, science, anatomy, biology, classical history, geography, and physical mechanisms.

- Always close the complete Markdown image syntax: ![Subject](neanderthal:image?provider=...).
- Never wrap a media image in backticks or a code block.`;
}

export async function POST(request: NextRequest) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(45000)]);
  try {
    const body = await readJsonObject(request, signal);
    const prompt = body.prompt;
    const clientKey = body.apiKey;
    if ((clientKey !== undefined && (typeof clientKey !== 'string' || clientKey.length > 256)) ||
        (body.model !== undefined && (typeof body.model !== 'string' || !/^gemini-[a-z0-9.-]{1,70}$/.test(body.model)))) {
      throw new RequestError('Invalid API key or model', 400);
    }
    const serverKey = process.env.GEMINI_API_KEY || process.env.Gemini || process.env.GEMINI;
    const apiKey = clientKey?.trim() || serverKey?.trim();

    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 10000) {
      return NextResponse.json({ error: 'Prompt must contain between 1 and 10000 characters' }, { status: 400 });
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
      typeof body.visualsPerParagraph === 'number' && Number.isFinite(body.visualsPerParagraph) && body.visualsPerParagraph > 0
        ? Math.min(4, Math.max(1, Math.round(body.visualsPerParagraph)))
        : 4;
    const systemInstructionText = buildSystemInstruction(requestedVisuals, prompt);

    const defaultModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';
    const requestedModel = typeof body.model === 'string' ? body.model.trim() : defaultModel;
    const candidateModels = Array.from(
      new Set([
        requestedModel,
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash',
        'gemini-3.6-flash',
        'gemini-2.5-flash',
        'gemini-1.5-flash',
      ])
    );

    let geminiRes: Response | null = null;
    let lastErrorText = '';
    let lastStatus = 500;

    for (const model of candidateModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

      const res = await fetch(geminiUrl, {
        method: 'POST',
        signal,
        redirect: 'error',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
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
        const errorText = new TextDecoder().decode(await readBoundedBody(res, 64 * 1024, signal));
        lastErrorText = errorText;
        lastStatus = res.status;

        // If the model is not found, deprecated, or no longer available, attempt the next model
        const isModelUnavailable =
          res.status === 404 ||
          (res.status === 400 && /model.*(no longer available|not found|unsupported)/i.test(errorText));

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
                  if (typeof part.text === 'string' && !part.thought) {
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
        buffer += decoder.decode();
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data:')) {
            try {
              const parsed = JSON.parse(trimmed.slice(5).trim());
              const candidate = parsed.candidates?.[0];
              const parts = candidate?.content?.parts || [];
              for (const part of parts) {
                if (typeof part.text === 'string' && !part.thought) {
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

    const stream = streamWithLimits(geminiRes.body, signal, 4 * 1024 * 1024).pipeThrough(transformStream);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    console.error('[Chat API Error]:', err);
    const status = signal.aborted ? (request.signal.aborted ? 499 : 504) : err instanceof RequestError ? err.status : 502;
    const message = err instanceof RequestError
      ? err.message
      : signal.aborted
      ? 'Generation cancelled or timed out'
      : err instanceof Error && err.message === 'fetch failed'
      ? 'Unable to reach Google Gemini API. Please check your internet connection or network proxy.'
      : err instanceof Error
      ? err.message
      : 'Could not complete generation';
    return NextResponse.json({ error: message }, { status });
  }
}
