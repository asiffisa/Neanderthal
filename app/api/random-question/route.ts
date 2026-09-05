import { abortStatus, fetchWithLimits, readJsonObject, RequestError } from '../../../src/lib/request-limits';
import { MODEL_PATTERN, modelCandidates, serverApiKey } from '../../../src/lib/gemini';
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

// Generates a cryptographically strong random alphanumeric string of requested length
const generateAlphanumericSeed = (length = 32): string =>
  crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);

interface CuratedQuestion {
  title: string;
  category: string;
  icon: string;
  prompt: string;
}

const CURATED_QUESTIONS: CuratedQuestion[] = [
  // Earth & Weather
  {
    title: "Sky Colors & Sunsets",
    category: "Atmospheric Science",
    icon: "🌅",
    prompt: "Why is the sky blue during the day and red at sunset?",
  },
  {
    title: "Ocean Tides",
    category: "Oceanography",
    icon: "🌊",
    prompt: "What causes ocean tides to rise and fall?",
  },
  {
    title: "Continental Drift",
    category: "Geology",
    icon: "🗺️",
    prompt: "What is continental drift and how do continents move?",
  },
  {
    title: "Earthquakes",
    category: "Seismology",
    icon: "🌋",
    prompt: "How do earthquakes happen deep inside the Earth?",
  },
  {
    title: "Volcanoes & New Land",
    category: "Volcanology",
    icon: "🌋",
    prompt: "How do massive volcanic eruptions create new land and islands?",
  },
  {
    title: "Lightning & Thunder",
    category: "Meteorology",
    icon: "⚡",
    prompt: "What creates lightning and why does thunder follow?",
  },
  {
    title: "Floating Clouds",
    category: "Atmospheric Physics",
    icon: "☁️",
    prompt: "How do clouds float when they carry tons of water?",
  },
  {
    title: "Salty Oceans",
    category: "Marine Science",
    icon: "🧂",
    prompt: "Why is ocean water salty while rivers have fresh water?",
  },

  // Space & Cosmos
  {
    title: "Twinkling Stars",
    category: "Astrophysics",
    icon: "✨",
    prompt: "Why do stars twinkle in the night sky?",
  },
  {
    title: "Solar Eclipses",
    category: "Astronomy",
    icon: "🌘",
    prompt: "What is a solar eclipse and why is it so rare to witness?",
  },
  {
    title: "Moon Craters",
    category: "Planetary Science",
    icon: "🌕",
    prompt: "Why does the Moon have craters while Earth has so few?",
  },
  {
    title: "Saturn's Rings",
    category: "Planetary Science",
    icon: "🪐",
    prompt: "What are Saturn’s rings actually made of?",
  },
  {
    title: "Black Holes",
    category: "Astrophysics",
    icon: "🕳️",
    prompt: "What is a black hole and how does gravity bend light?",
  },
  {
    title: "Aurora Borealis",
    category: "Geophysics",
    icon: "🌌",
    prompt: "What causes the shimmering green lights of the Aurora Borealis?",
  },
  {
    title: "Shooting Stars",
    category: "Astronomy",
    icon: "🌠",
    prompt: "How are shooting stars and meteor showers formed?",
  },

  // Nature & Animal Wonders
  {
    title: "Chameleon Camouflage",
    category: "Animal Biology",
    icon: "🦎",
    prompt: "How do chameleons change their skin color so quickly?",
  },
  {
    title: "Deep-Sea Glow",
    category: "Marine Biology",
    icon: "🦑",
    prompt: "How do deep-sea creatures glow in complete darkness?",
  },
  {
    title: "Caterpillar to Butterfly",
    category: "Entomology",
    icon: "🦋",
    prompt: "How does an ordinary caterpillar transform into a butterfly?",
  },
  {
    title: "Bat Echolocation",
    category: "Zoology",
    icon: "🦇",
    prompt: "How do bats navigate in total pitch black using sound?",
  },
  {
    title: "Autumn Leaves",
    category: "Plant Biology",
    icon: "🍂",
    prompt: "Why do leaves change color from green to orange and red in autumn?",
  },
  {
    title: "Firefly Bioluminescence",
    category: "Entomology",
    icon: "💡",
    prompt: "How do fireflies produce bright cold light without heat?",
  },
  {
    title: "Bird Migration",
    category: "Ornithology",
    icon: "🦅",
    prompt: "How do birds migrate thousands of miles across oceans without getting lost?",
  },

  // Everyday Science & Human Body
  {
    title: "Rainbows & Refraction",
    category: "Optics",
    icon: "🌈",
    prompt: "Why do we see a rainbow when sunlight hits water droplets?",
  },
  {
    title: "Mirror Reflections",
    category: "Physics & Optics",
    icon: "🪞",
    prompt: "How do mirrors reflect an exact image of what is in front of them?",
  },
  {
    title: "Floating Ice",
    category: "Thermodynamics",
    icon: "🧊",
    prompt: "Why does ice float on top of water instead of sinking?",
  },
  {
    title: "Photosynthesis",
    category: "Biochemistry",
    icon: "🌿",
    prompt: "How do plants turn pure sunlight into energy and food?",
  },
  {
    title: "Fingerprint Patterns",
    category: "Human Biology",
    icon: "🖐️",
    prompt: "Why do our fingerprints have unique ridge patterns?",
  },
  {
    title: "Memory in the Brain",
    category: "Neuroscience",
    icon: "🧠",
    prompt: "How does human memory get stored and recalled inside the brain?",
  },
  {
    title: "Onions & Tears",
    category: "Chemistry",
    icon: "🧅",
    prompt: "Why do onions make us tear up and cry when we slice them?",
  },
  {
    title: "How Sound Travels",
    category: "Acoustics",
    icon: "👂",
    prompt: "How does sound travel through the air and reach our eardrums?",
  },
];

export async function POST(request: NextRequest) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(15000)]);
  try {
    const body = await readJsonObject(request, signal);
    if (
      (body.model !== undefined && (typeof body.model !== 'string' || !MODEL_PATTERN.test(body.model))) ||
      (body.excludeTitles !== undefined &&
        (!Array.isArray(body.excludeTitles) ||
          body.excludeTitles.length > 35 ||
          body.excludeTitles.some((title) => typeof title !== 'string' || title.length > 200)))
    ) {
      throw new RequestError('Invalid shuffle parameters', 400);
    }
    const apiKey = serverApiKey();
    const excludeTitles: string[] = Array.isArray(body.excludeTitles) ? body.excludeTitles : [];

    const entropySeed = generateAlphanumericSeed(48);

    // If API key is available, query Gemini LLM to invent an intuitive, curious question
    if (apiKey) {
      const candidateModels = modelCandidates(body.model);

      const promptDirective = `You are a curious, accessible scientific mystery generator.
Generate 1 simple, wondrous, everyday natural or scientific mystery that anyone would be curious to ask (for example: "Why is the sky blue?", "What causes sea tides?", "Why does ice float?", "How do chameleons change color?").

ENTROPY SEED: ${entropySeed}

Mandatory rules:
1. The question MUST be simple, intuitive, and universally relatable (avoid overly obscure academic jargon).
2. The question must lead to a rich, fascinating physical, biological, or geological explanation with observable phenomena.
${excludeTitles.length > 0 ? `3. Do NOT repeat or resemble any of these recent topics: ${excludeTitles.slice(-25).join(", ")}.` : ""}

You MUST return ONLY a valid JSON object matching this schema:
{
  "title": "A punchy title of 2 to 4 words",
  "category": "Scientific discipline name (e.g. Optics, Oceanography, Plant Biology)",
  "icon": "A single relevant emoji (e.g. 🌅, 🌊, 🌿, ⚡, 🌋, 🪐, 🧠)",
  "prompt": "The simple, curious question (e.g. 'Why is the sky blue during the day and red at sunset?')"
}`;

      for (const model of candidateModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

          const res = await fetchWithLimits(
            geminiUrl,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
              signal,
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [{ text: promptDirective }],
                  },
                ],
                generationConfig: {
                  temperature: 1.15,
                  maxOutputTokens: 512,
                  topP: 0.95,
                  responseMimeType: "application/json",
                },
              }),
            },
            10000,
            64 * 1024
          );
          if (!res.ok && res.status !== 404) break;

          if (res.ok) {
            const data = await res.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
              const parsed = JSON.parse(cleaned);

              if (
                typeof parsed.title === "string" &&
                typeof parsed.prompt === "string" &&
                parsed.title.trim() &&
                parsed.prompt.trim() &&
                parsed.title.length <= 200 &&
                parsed.prompt.length <= 1000 &&
                !excludeTitles.some((title) => title.toLowerCase() === parsed.title.trim().toLowerCase())
              ) {
                return NextResponse.json({
                  title: parsed.title.trim(),
                  category: typeof parsed.category === "string" ? parsed.category.trim().slice(0, 100) : "Science",
                  icon: (typeof parsed.icon === "string" ? parsed.icon.trim().slice(0, 16) : "") || "🔬",
                  prompt: parsed.prompt.trim(),
                  source: "llm",
                  model,
                  seed: entropySeed,
                });
              }
            }
          }
        } catch {
          signal.throwIfAborted();
          break;
        }
      }
    }

    // Curated bank: Pick a non-repeating item from the curated 30-item questions bank
    const available = CURATED_QUESTIONS.filter(
      (item) => !excludeTitles.some((t) => t.toLowerCase() === item.title.toLowerCase())
    );
    const pool = available.length > 0 ? available : CURATED_QUESTIONS;
    const randomIndex = crypto.randomInt(0, pool.length);
    const randomPick = pool[randomIndex];

    return NextResponse.json({
      ...randomPick,
      source: "curated-bank",
      seed: entropySeed,
    });
  } catch (err: unknown) {
    if (err instanceof RequestError || signal.aborted) {
      return NextResponse.json(
        { error: err instanceof RequestError ? err.message : "Shuffle cancelled or timed out" },
        { status: abortStatus(signal, request, err) }
      );
    }
    const randomIndex = crypto.randomInt(0, CURATED_QUESTIONS.length);
    const randomPick = CURATED_QUESTIONS[randomIndex];
    return NextResponse.json({
      ...randomPick,
      source: "curated-fallback",
    });
  }
}
