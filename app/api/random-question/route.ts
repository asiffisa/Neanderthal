import { fetchWithLimits, readJsonObject, RequestError } from '../../../src/lib/request-limits';
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

// Generates a cryptographically strong random alphanumeric string of requested length
const generateAlphanumericSeed = (length = 32): string =>
  crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);

// 40+ specialized domain mechanisms used to force Gemini into non-repeating diverse exploration
const DIVERSE_SCIENCE_DOMAINS = [
  "Astrochemistry & Organic Molecules in Molecular Clouds",
  "Deep Ocean Hadal Trench Gigantism & Piezo-physiology",
  "Quantum Superconductivity, Cooper Pairs & Flux Pinning",
  "Cephalopod RNA Editing & Adaptive Neural Plasticity",
  "Plate Tectonics, Kimberlite Eruptions & Diamond Pipes",
  "Antarctic Ice Core Paleoclimatology & Trapped Atmosphere",
  "Photosynthetic Quantum Coherence & Exciton Transfer",
  "Sonoluminescence & Ultrasonic Acoustic Bubble Cavitation",
  "Insect Metamorphosis, Ecdysone & Imaginal Disc Differentiation",
  "Black Hole Accretion Disks, Relativistic Jets & Ergosphere",
  "Bioluminescent Dinoflagellates & Shear-Stress Scintillons",
  "Tardigrade Cryptobiosis, Trehalose & Bioglass Vitrification",
  "Slime Mold Physarum Network Optimization & Memory",
  "Pulsar Magnetospheres, Synchrotron Beams & Crust Glitches",
  "Glymphatic System & CSF Waste Clearance During Deep Sleep",
  "Venus Flytrap Action Potentials & Mechanosensitive Channels",
  "Mantis Shrimp Dactyl Club Strike Shockwaves & Cavitation",
  "Magnetotactic Bacteria Intracellular Magnetosome Nano-Chains",
  "Tree Xylem Evaporative Pull & Negative Hydrostatic Pressure",
  "Electric Organ Bioelectrogenesis & Stacked Electrocytes",
  "Epigenetic Histone Methylation & Transgenerational Resilience",
  "Solar Corona Heating, Magnetic Reconnection & Nanoflares",
  "Neutrino Oscillations & Mikheyev-Smirnov-Wolfenstein Resonance",
  "Volcanic Lightning & Triboelectric Ash Charging Plumes",
  "Deep Earth Iron Geodynamo Convection & Field Reversals",
  "Chameleon Dermal Iridophores & Photonic Nanocrystal Tuning",
  "Whale Fall Abyssal Ecosystem Succession & Bone-Eating Worms",
  "Spider Dragline Silk Nanocrystalline Beta-Sheet Architecture",
  "Circadian CLOCK-BMAL1 Transcriptional Feedback Loops",
  "Superfluid Helium-4 Zero Viscosity & Fountain Effect",
  "Carnivorous Pitcher Plant Peristome Aquaplaning Surfaces",
  "Optogenetic Channelrhodopsin Activation of Brain Circuits",
  "Pyroelectric Crystal Triboluminescence & Cold Fusion Accelerators",
  "Diatom Amorphous Silica Nanoscale Frustule Synthesis",
  "Radioactive Decay & Tidal Heating in Ocean Moons (Europa/Enceladus)",
  "Axon Growth Cone Filopodia & Chemoattractive Molecular Trails",
  "Meteorite Chondrules & Early Solar Nebula Flash Melting",
  "Quark-Gluon Plasma Phase Transitions in Heavy Ion Collisions",
  "Serpentine Alkaline Hydrothermal Vents & Prebiotic Catalysis",
  "Paleomagnetic Zebra Striping at Mid-Ocean Ridges",
];

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
    title: "Sonoluminescence & Cavitation",
    category: "Acoustic Physics",
    icon: "🔊",
    prompt: "How do collapsing ultrasonic bubbles in water briefly reach temperatures hotter than the surface of the Sun?",
  },
  {
    title: "Cephalopod Adaptive Camouflage",
    category: "Marine Neurobiology",
    icon: "🦑",
    prompt: "How do octopuses and cuttlefish instantly reshape their skin texture and color using chromatophores and iridophores?",
  },
  {
    title: "Quantum Superconductivity",
    category: "Condensed Matter",
    icon: "⚡",
    prompt: "How do paired Cooper electrons flow with zero electrical resistance and levitate magnets above superconductors?",
  },
  {
    title: "Mantis Shrimp Strike Dynamics",
    category: "Biomechanics",
    icon: "🥊",
    prompt: "How does the mantis shrimp accelerate its dactyl club so rapidly that it vaporizes water and creates cavitation shockwaves?",
  },
  {
    title: "Slime Mold Network Intelligence",
    category: "Biocomputing",
    icon: "🧫",
    prompt: "How does the single-celled slime mold Physarum solve labyrinth mazes and simulate highway networks without a brain?",
  },
  {
    title: "Solar Corona & Nanoflares",
    category: "Heliophysics",
    icon: "☀️",
    prompt: "Why is the Sun's outer corona millions of degrees hotter than its surface, and how do magnetic nanoflares drive this heat?",
  },
  {
    title: "Venus Flytrap Biomechanics",
    category: "Plant Electrophysiology",
    icon: "🪴",
    prompt: "How do trigger hairs in the Venus flytrap generate electrical action potentials to snap its leaves shut in milliseconds?",
  },
  {
    title: "Pulsars & Neutron Stars",
    category: "High-Energy Astrophysics",
    icon: "💫",
    prompt: "How do collapsed stellar cores rotate hundreds of times per second while sweeping beams of radiation across the galaxy?",
  },
  {
    title: "Antarctic Lake Vostok",
    category: "Cryobiology",
    icon: "❄️",
    prompt: "How do microbial ecosystems thrive sealed under four kilometers of Antarctic ice sheet without sunlight for millions of years?",
  },
  {
    title: "Spider Dragline Silk Nanostructure",
    category: "Biomaterials",
    icon: "🕸️",
    prompt: "How do beta-sheet nanocrystals in spider silk achieve a tensile strength five times greater than structural steel?",
  },
  {
    title: "Deep Earth Geodynamo",
    category: "Planetary Physics",
    icon: "🧲",
    prompt: "How does the swirling liquid iron outer core generate Earth's geomagnetic field and spontaneously flip its magnetic poles?",
  },
  {
    title: "Bioluminescent Dinoflagellates",
    category: "Marine Microbiology",
    icon: "✨",
    prompt: "How do microscopic dinoflagellates sense mechanical shear stress in breaking waves to produce electric blue flashes?",
  },
  {
    title: "Chameleon Structural Coloration",
    category: "Biophotonics",
    icon: "🦎",
    prompt: "How do chameleons tune the spacing of guanine nanocrystals within their dermal iridophores to dynamically shift colors?",
  },
  {
    title: "Tree Hydraulic Superhighways",
    category: "Botanical Physics",
    icon: "🌲",
    prompt: "How do coastal redwoods pull thousands of liters of water hundreds of feet into the air under immense negative hydrostatic pressure?",
  },
  {
    title: "Electric Eel Bioelectrogenesis",
    category: "Comparative Physiology",
    icon: "🔋",
    prompt: "How do stacked electrocyte cells in electric eels synchronize thousands of ion channels to discharge 860-volt electric shocks?",
  },
  {
    title: "Black Hole Accretion Jets",
    category: "Astrophysics",
    icon: "🕳️",
    prompt: "How do supermassive black holes funnel infalling matter into incandescent accretion disks and blast relativistic plasma jets across space?",
  },
  {
    title: "Circadian Clock Molecular Loops",
    category: "Chronobiology",
    icon: "⏰",
    prompt: "How does the transcription-translation feedback loop of CLOCK and BMAL1 proteins maintain our internal 24-hour cellular rhythm?",
  },
  {
    title: "Volcanic Ash Lightning Plumes",
    category: "Atmospheric Volcanology",
    icon: "⚡",
    prompt: "How does violent friction between colliding silicate ash particles in erupting volcanic plumes generate volcanic lightning?",
  },
  {
    title: "Superfluid Helium Zero Viscosity",
    category: "Quantum Fluids",
    icon: "🧪",
    prompt: "Why does liquid helium cooled near absolute zero lose all viscosity and climb the walls of its glass container?",
  },
  {
    title: "Magnetotactic Bacterial Navigators",
    category: "Microbiology",
    icon: "🧭",
    prompt: "How do aquatic magnetotactic bacteria synthesize chains of magnetic iron oxide crystals to navigate along geomagnetic field lines?",
  },
  {
    title: "Whale Fall Abyssal Succession",
    category: "Benthic Oceanography",
    icon: "🐋",
    prompt: "How does a sunken whale carcass support four distinct ecological successions over a century on the barren ocean floor?",
  },
  {
    title: "Epigenetic DNA Methylation",
    category: "Epigenetics",
    icon: "🧬",
    prompt: "How do environmental stresses chemically tag DNA histones without altering genetic sequence to transmit traits to offspring?",
  },
  {
    title: "Neutrino Oscillations",
    category: "Particle Physics",
    icon: "🔬",
    prompt: "How do ghostly solar neutrinos change between electron, muon, and tau flavors as they pass through Earth's matter?",
  },
  {
    title: "Pitcher Plant Aquaplaning",
    category: "Plant Biomechanics",
    icon: "🪤",
    prompt: "How does the peristome rim of pitcher plants become completely frictionless when lubricated with a microscopic film of water?",
  },
  {
    title: "Pyroelectric Fusion Accelerators",
    category: "Nuclear Physics",
    icon: "☢️",
    prompt: "How can heating a tiny pyroelectric crystal in a vacuum produce a 100,000-volt electric field powerful enough to fuse deuterium atoms?",
  },
  {
    title: "Optogenetics & Light-Triggered Neurons",
    category: "Neuroengineering",
    icon: "💡",
    prompt: "How do neuroscientists express algal channelrhodopsin proteins in mammalian brain cells to control specific circuits with blue light?",
  },
  {
    title: "Ocean Moons & Tidal Heating",
    category: "Planetary Astrobiology",
    icon: "🪐",
    prompt: "How does tidal friction and radioactive decay keep global liquid water oceans warm beneath the frozen shells of Europa and Enceladus?",
  },
  {
    title: "Axon Growth Cone Chemotaxis",
    category: "Developmental Neurobiology",
    icon: "🧠",
    prompt: "How do growing axon tips use microscopic filopodia to detect chemo-attractive molecular trails and wire the nervous system?",
  },
  {
    title: "Meteorite Chondrule Flash Melting",
    category: "Cosmochemistry",
    icon: "☄️",
    prompt: "What primordial flash-heating event melted tiny molten droplets of silicate dust within the solar nebula 4.5 billion years ago?",
  },
  {
    title: "Quark-Gluon Plasma Primordial Soup",
    category: "High Energy Physics",
    icon: "🌡️",
    prompt: "How do particle colliders recreate the liquid quark-gluon plasma that filled the universe during its first microsecond after the Big Bang?",
  },
  {
    title: "Diatom Nanoscale Frustules",
    category: "Marine Nanotechnology",
    icon: "💎",
    prompt: "How do microscopic single-celled algae construct intricately perforated glass exoskeletons out of amorphous silica?",
  },
  {
    title: "Serpentinite Hydrothermal Catalysis",
    category: "Prebiotic Chemistry",
    icon: "🫧",
    prompt: "How do alkaline hydrothermal vents driven by serpentinization generate hydrogen and organic molecules that may have sparked the origin of life?",
  },
  {
    title: "Geomagnetic Paleomagnetic Reversals",
    category: "Geophysics",
    icon: "🗺️",
    prompt: "How does seafloor basalt lock in magnetic orientation at mid-ocean ridges to preserve a zebra-striped record of continental drift?",
  },
  {
    title: "Tardigrade Glass Vitrification",
    category: "Biophysics",
    icon: "🐻",
    prompt: "How do tardigrades replace water with intrinsically disordered proteins that solidify into biological glass to withstand lethal conditions?",
  },
  {
    title: "Slime Mold Cytoplasmic Memory",
    category: "Cellular Biology",
    icon: "🟡",
    prompt: "How do rhythmic cytoplasmic shuttle flows in Physarum polycephalum imprint habituation and spatial memory without neurons?",
  },
  {
    title: "Pulsar Glitches & Superfluid Vortices",
    category: "Neutron Star Physics",
    icon: "⏱️",
    prompt: "Why do millisecond pulsars suddenly experience instantaneous rotational spin-up glitches inside their unpinned superfluid crusts?",
  },
];

export async function POST(request: NextRequest) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(15000)]);
  try {
    const body = await readJsonObject(request, signal);
    const clientKey = body.apiKey;
    if ((clientKey !== undefined && (typeof clientKey !== 'string' || clientKey.length > 256)) ||
        (body.model !== undefined && (typeof body.model !== 'string' || !/^gemini-[a-z0-9.-]{1,70}$/.test(body.model))) ||
        (body.excludeTitles !== undefined && (!Array.isArray(body.excludeTitles) || body.excludeTitles.length > 25 || body.excludeTitles.some((title) => typeof title !== 'string' || title.length > 200)))) {
      throw new RequestError('Invalid shuffle parameters', 400);
    }
    const serverKey = process.env.GEMINI_API_KEY || process.env.Gemini || process.env.GEMINI;
    const apiKey = clientKey?.trim() || serverKey?.trim();
    const excludeTitles: string[] = Array.isArray(body.excludeTitles) ? body.excludeTitles : [];

    // Generate a fresh, long cryptographically secure alphanumeric entropy seed
    const entropySeed = generateAlphanumericSeed(48);

    // Pick a random specialized domain to force Gemini away from repetitive questions
    const randomDomain =
      DIVERSE_SCIENCE_DOMAINS[crypto.randomInt(0, DIVERSE_SCIENCE_DOMAINS.length)];

    // If API key is available, query Gemini LLM for an unscripted, creative random question
    if (apiKey) {
      const defaultModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
      const requestedModel = typeof body.model === "string" ? body.model.trim() : defaultModel;
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

      const promptDirective = `You are a creative scientific mystery generator.
Generate 1 unique, wondrous, and highly specific question about nature, astrophysics, deep-sea biology, quantum phenomena, neuroscience, geology, or evolutionary biology.

ENTROPY SEED: ${entropySeed}
EXPLORATION DOMAIN: ${randomDomain}

Mandatory rules:
1. Focus specifically on ${randomDomain} or an equally surprising mechanism.
2. Avoid repetitive or common school-book questions.
3. Be specific about the concrete biological or physical structure involved.
${excludeTitles.length > 0 ? `4. Absolutely DO NOT repeat or resemble any of these recent topics: ${excludeTitles.slice(-25).join(", ")}.` : ""}

You MUST return ONLY a valid JSON object matching this schema:
{
  "title": "A punchy title of 2 to 4 words",
  "category": "Scientific discipline name",
  "icon": "A single relevant emoji (e.g. 🪐, 🦑, 🧬, ⚡, 🌋, 🪼, 🧲, 🔬)",
  "prompt": "An intriguing, detailed question explaining the underlying mechanism or mystery."
}`;

      for (const model of candidateModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

          const res = await fetchWithLimits(geminiUrl, {
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
          }, 10000, 64 * 1024);
          if (!res.ok && res.status !== 404) break;

          if (res.ok) {
            const data = await res.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const cleaned = rawText.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
              const parsed = JSON.parse(cleaned);

              if (typeof parsed.title === 'string' && typeof parsed.prompt === 'string' && parsed.title.trim() && parsed.prompt.trim() && parsed.title.length <= 200 && parsed.prompt.length <= 1000 && !excludeTitles.some((title) => title.toLowerCase() === parsed.title.trim().toLowerCase())) {
                return NextResponse.json({
                  title: parsed.title.trim(),
                  category: (typeof parsed.category === "string" ? parsed.category.trim().slice(0, 100) : "") || randomDomain.split("&")[0].trim(),
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
          break; // Network/authentication failures do not improve by changing models.
        }
      }
    }

    // Fallback: Pick a non-repeating item from the expansive 50-item curated bank
    const available = CURATED_FALLBACK_POOL.filter(
      (item) => !excludeTitles.some((t) => t.toLowerCase() === item.title.toLowerCase())
    );
    const pool = available.length > 0 ? available : CURATED_FALLBACK_POOL;
    const randomIndex = crypto.randomInt(0, pool.length);
    const randomPick = pool[randomIndex];

    return NextResponse.json({
      ...randomPick,
      source: "curated-bank",
      seed: entropySeed,
    });
  } catch (err: unknown) {
    if (err instanceof RequestError || signal.aborted) {
      return NextResponse.json({ error: err instanceof RequestError ? err.message : 'Shuffle cancelled or timed out' }, {
        status: signal.aborted ? (request.signal.aborted ? 499 : 504) : (err as RequestError).status,
      });
    }
    const randomIndex = crypto.randomInt(0, CURATED_FALLBACK_POOL.length);
    const randomPick = CURATED_FALLBACK_POOL[randomIndex];
    return NextResponse.json({
      ...randomPick,
      source: "curated-fallback",
    });
  }
}
