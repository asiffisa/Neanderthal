import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CURATED_FALLBACK_POOL = [
  {
    title: "Bioluminescent Abyss",
    category: "Marine Biology",
    icon: "🌊",
    prompt: "How do deep-sea organisms create cold light to survive in the midnight zone?",
  },
  {
    title: "Photosynthesis & Solar Fuel",
    category: "Plant Biology",
    icon: "🌿",
    prompt: "How do plants convert sunlight and carbon dioxide into chemical energy?",
  },
  {
    title: "Quantum Wave-Particle Duality",
    category: "Quantum Physics",
    icon: "⚛️",
    prompt: "How can light and matter behave simultaneously as both waves and particles?",
  },
  {
    title: "Supernovae & Stellar Death",
    category: "Astrophysics",
    icon: "💥",
    prompt: "What happens when a massive star exhausts its nuclear fuel and explodes?",
  },
  {
    title: "Subterranean Mycelial Networks",
    category: "Mycology & Ecology",
    icon: "🍄",
    prompt: "How do fungal mycelial networks connect forests and share nutrients?",
  },
  {
    title: "Aurora Borealis & Magnetosphere",
    category: "Geophysics",
    icon: "🌌",
    prompt: "What creates the glowing curtains of the Northern and Southern Lights?",
  },
  {
    title: "Metamorphosis & Butterfly Emergence",
    category: "Entomology",
    icon: "🦋",
    prompt: "How does a caterpillar dissolve and reorganize its anatomy into a butterfly?",
  },
  {
    title: "Extremophiles & Cosmic Resilience",
    category: "Astrobiology",
    icon: "🔬",
    prompt: "How do microscopic tardigrades survive the vacuum of space and boiling heat?",
  },
  {
    title: "Synaptic Pruning & Sleep",
    category: "Neuroscience",
    icon: "🧠",
    prompt: "How does the human brain physically remodel and prune synapses during deep slow-wave sleep?",
  },
  {
    title: "Hydrothermal Vent Ecosystems",
    category: "Deep Oceanology",
    icon: "🌋",
    prompt: "How do chemosynthetic tubeworms thrive without sunlight at volcanic abyssal hydrothermal vents?",
  },
  {
    title: "Gravitational Waves & Spacetime",
    category: "General Relativity",
    icon: "🌀",
    prompt: "How do colliding black holes ripple the fabric of spacetime into detectable gravitational waves?",
  },
  {
    title: "Tectonic Plate Subduction",
    category: "Geology",
    icon: "🏔️",
    prompt: "How does oceanic plate subduction trigger explosive volcanic island arcs and deep ocean trenches?",
  },
  {
    title: "CRISPR & Bacterial Immunity",
    category: "Molecular Genetics",
    icon: "🧬",
    prompt: "How did bacteria evolve the CRISPR-Cas9 enzyme system to record viral genetic memory?",
  },
  {
    title: "Avian Magnetoreception",
    category: "Animal Navigation",
    icon: "🦅",
    prompt: "How do migratory birds utilize cryptochrome proteins in their retinas to visualize Earth’s magnetic field?",
  },
  {
    title: "Sonoluminescence & Cavitation",
    category: "Acoustic Physics",
    icon: "🔊",
    prompt: "How do collapsing ultrasonic bubbles in water briefly reach temperatures hotter than the surface of the Sun?",
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const clientKey = body.apiKey;
    const serverKey = process.env.GEMINI_API_KEY;
    const apiKey = clientKey?.trim() || serverKey?.trim();
    const excludeTitles: string[] = Array.isArray(body.excludeTitles) ? body.excludeTitles : [];

    // If API key is available, query Gemini LLM for an unscripted, creative random question
    if (apiKey) {
      const requestedModel = body.model?.trim() || "gemini-3.5-flash-lite";
      const candidateModels = Array.from(
        new Set([
          requestedModel,
          "gemini-3.5-flash-lite",
          "gemini-3.8-flash",
          "gemini-3.6-flash",
          "gemini-2.5-flash",
          "gemini-1.5-flash",
        ])
      );

      const promptDirective = `Generate 1 unique, wondrous, and highly specific question about nature, astrophysics, deep-sea biology, quantum phenomena, neuroscience, geology, or evolutionary biology.
Avoid repetitive or cliché questions. Choose an unusual or captivating scientific mechanism.
${excludeTitles.length > 0 ? `Do NOT repeat any of these recent topics: ${excludeTitles.slice(-8).join(", ")}.` : ""}

You MUST return ONLY a valid JSON object matching this schema:
{
  "title": "A punchy title of 2 to 4 words",
  "category": "Scientific discipline name (e.g. Deep Oceanology, Astrophysics, Neurobiology)",
  "icon": "A single relevant emoji (e.g. 🪐, 🦑, 🧬, ⚡, 🌋, 🪼)",
  "prompt": "An intriguing question explaining the underlying mechanism or mystery."
}`;

      for (const model of candidateModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
            apiKey
          )}`;

          const res = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: promptDirective }],
                },
              ],
              generationConfig: {
                temperature: 1.0,
                responseMimeType: "application/json",
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const cleaned = rawText.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
              const parsed = JSON.parse(cleaned);

              if (parsed.title && parsed.prompt) {
                return NextResponse.json({
                  title: parsed.title.trim(),
                  category: parsed.category?.trim() || "Nature & Science",
                  icon: parsed.icon?.trim() || "🔬",
                  prompt: parsed.prompt.trim(),
                  source: "llm",
                  model,
                });
              }
            }
          }
        } catch {
          // Cascade to next candidate model
        }
      }
    }

    // Fallback: Pick a non-repeating item from the curated bank
    const available = CURATED_FALLBACK_POOL.filter(
      (item) => !excludeTitles.includes(item.title)
    );
    const pool = available.length > 0 ? available : CURATED_FALLBACK_POOL;
    const randomPick = pool[Math.floor(Math.random() * pool.length)];

    return NextResponse.json({
      ...randomPick,
      source: "curated-bank",
    });
  } catch (err: unknown) {
    const randomPick = CURATED_FALLBACK_POOL[Math.floor(Math.random() * CURATED_FALLBACK_POOL.length)];
    return NextResponse.json({
      ...randomPick,
      source: "curated-fallback",
    });
  }
}
