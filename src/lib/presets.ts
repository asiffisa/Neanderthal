export interface PresetQuestion {
  id: string;
  title: string;
  category: string;
  icon: string;
  prompt: string;
  response: string;
}

export const PRESETS: PresetQuestion[] = [
  {
    id: 'deep-sea-bioluminescence',
    title: 'Bioluminescent Abyss',
    category: 'Marine Biology',
    icon: '🌊',
    prompt: 'How do deep-sea organisms create cold light to survive in the midnight zone?',
    response: `In the bathypelagic zone ![media:Bathypelagic zone|wiki]—over 1,000 meters below the surface—sunlight is completely absent. In this pitch-black realm, over 75% of marine creatures produce their own illumination through bioluminescence ![media:Bioluminescence|duckduckgo], generating cold living light via the oxidation of luciferin ![media:Luciferin|wiki] catalyzed by luciferase enzymes.

Survival in the oceanic abyss relies heavily on optical deception. The deep sea anglerfish ![media:Anglerfish|duckduckgo] dangles a modified dorsal spine (the illicium) tipped with a glowing bulb filled with symbiotic phototrophic bacteria ![media:Phototrophic bacteria|wiki]. It twitches this glowing lure right before its jaws to entice prey. Nearby, gelatinous siphonophores ![media:Siphonophorae|duckduckgo] and comb jellies ![media:Ctenophora|duckduckgo] pulse rhythmic shimmering diffraction waves along their swimming cilia.

Meanwhile, the vampire squid ![media:Vampire squid|duckduckgo] expels an astonishing cloud of glowing bioluminescent mucus to blind predators in the blackness, and benthic creatures drift past abyssal hydrothermal vents ![media:Hydrothermal vent|wiki], where giant tubeworms ![media:Riftia pachyptila|wiki] thrive on volcanic minerals.`,
  },
  {
    id: 'photosynthesis-energy',
    title: 'Photosynthesis & Solar Fuel',
    category: 'Plant Biology',
    icon: '🌿',
    prompt: 'How do plants convert sunlight and carbon dioxide into chemical energy?',
    response: `Photosynthesis ![media:Photosynthesis|wiki] is the primary biochemical engine powering Earth's biosphere. Within leaf mesophyll ![media:Mesophyll|wiki] cells, millions of microscopic chloroplasts ![media:Chloroplast|wiki] act as self-assembling solar power stations.

Embedded inside disc-shaped thylakoid ![media:Thylakoid|wiki] membranes, pigment arrays of chlorophyll ![media:Chlorophyll|duckduckgo] absorb blue and red photons ![media:Photon|duckduckgo] while reflecting green wavelengths. In the light-dependent reactions, absorbed light energy splits water molecules, liberating free electrons and charging the rotary motor enzyme ATP synthase ![media:ATP synthase|wiki].

These energetic molecules fuel the Calvin cycle ![media:Calvin cycle|wiki] within the stroma. Here, atmospheric carbon dioxide absorbed through microscopic leaf stomata ![media:Stoma|wiki] is fixed by the enzyme RuBisCO ![media:RuBisCO|wiki] into energy-dense glucose ![media:Glucose|duckduckgo], building cellulose cell walls and supplying breathable oxygen to our planet.`,
  },
  {
    id: 'quantum-wave-particle',
    title: 'Quantum Wave-Particle Duality',
    category: 'Quantum Physics',
    icon: '⚛️',
    prompt: 'How can light and matter behave simultaneously as both waves and particles?',
    response: `At the subatomic scale, classical intuition dissolves into the paradoxical laws of quantum mechanics ![media:Quantum mechanics|wiki]. In 1905, Albert Einstein explained the photoelectric effect ![media:Photoelectric effect|wiki] by demonstrating that beam energy is quantized into discrete light packets called photons ![media:Photon|duckduckgo], establishing that radiation behaves as particles.

However, the foundational double-slit experiment ![media:Double-slit experiment|wiki] reveals that when unobserved, individual photons and electrons pass through both slits at once, generating an interference wave pattern on the detector screen. This reality confirms wave–particle duality ![media:Wave–particle duality|wiki].

Louis de Broglie showed that matter itself possesses an associated matter wave ![media:Matter wave|wiki]. When Werner Heisenberg formulated the uncertainty principle ![media:Uncertainty principle|wiki] and Erwin Schrödinger penned the wave function ![media:Wave function|wiki], physicists realized that particles exist as probability clouds until a quantum measurement ![media:Measurement in quantum mechanics|wiki] collapses them into definite states.`,
  },
  {
    id: 'stellar-supernovae',
    title: 'Supernovae & Stellar Death',
    category: 'Astrophysics',
    icon: '💥',
    prompt: 'What happens when a massive star exhausts its nuclear fuel and explodes?',
    response: `Stars are colossal nuclear fusion ![media:Nuclear fusion|wiki] reactors that spend millions of years synthesizing helium, carbon, and oxygen. When an evolved red supergiant ![media:Red supergiant|duckduckgo] exhausts its core fuel, it forms an inert iron core that can no longer support its immense mass against gravitational collapse.

Within milliseconds, gravity triggers a catastrophic implosion, rebounding as a titanic supernova ![media:Supernova|duckduckgo] explosion that temporarily outshines an entire galaxy. The resulting shockwave blasts across interstellar space, creating an expanding, colorful supernova remnant ![media:Supernova remnant|duckduckgo] like the iconic Crab Nebula ![media:Crab Nebula|duckduckgo].

At the explosion's dense center, electrons and protons merge into a city-sized sphere of pure nuclear matter: a rapidly rotating pulsar ![media:Pulsar|wiki] or neutron star ![media:Neutron star|wiki]. If the stellar progenitor was sufficiently massive, the collapse continues unchecked, giving birth to a gravitational singularity known as a black hole ![media:Black hole|duckduckgo].`,
  },
  {
    id: 'mycelium-underground',
    title: 'Subterranean Mycelial Networks',
    category: 'Mycology & Ecology',
    icon: '🍄',
    prompt: 'How do fungal mycelial networks connect forests and share nutrients?',
    response: `Beneath the temperate forest floor lies an immense, living biological internet. Fungi grow as an intricate subterranean network of microscopic branching threads called mycelium ![media:Mycelium|duckduckgo], constructed of individual tubular filaments known as hyphae ![media:Hypha|wiki], while the mushrooms seen on the surface are merely ephemeral fruiting bodies ![media:Sporocarp|duckduckgo].

Through ancient mutualistic partnerships called mycorrhiza ![media:Mycorrhiza|wiki], fungal hyphae sheath tree root systems. Because fungi produce powerful extracellular enzymes to mine phosphorus ![media:Phosphorus|wiki] and nitrogen from bedrock, they deliver these mineral ions to trees in exchange for carbon-rich sugars produced by leaf photosynthesis ![media:Photosynthesis|wiki].

Often celebrated as the 'Wood-Wide Web', this vast mycorrhizal network transmits biochemical warning signals when pests attack, redistributing water and nitrogen through fungal spores ![media:Spore|duckduckgo] and connecting diverse tree species across entire forest ecosystems.`,
  },
  {
    id: 'aurora-solar-winds',
    title: 'Aurora Borealis & Magnetosphere',
    category: 'Geophysics',
    icon: '🌌',
    prompt: 'What creates the glowing curtains of the Northern and Southern Lights?',
    response: `The iridescent ribbons of the polar aurora ![media:Aurora|duckduckgo] begin 93 million miles away on the boiling surface of the Sun ![media:Sun|duckduckgo]. Intense solar flares and coronal mass ejections ![media:Coronal mass ejection|duckduckgo] launch the solar wind ![media:Solar wind|wiki]—a fast-moving stream of magnetized plasma ![media:Plasma (physics)|wiki] traveling at millions of miles per hour through space.

When this plasma collides with Earth, it meets the protective shield of our planet's magnetosphere ![media:Magnetosphere|wiki], generated by liquid molten iron circulating within Earth's outer core ![media:Earth's outer core|wiki].

While the magnetosphere deflects most solar radiation into the magnetotail, it funnels charged ions down geomagnetic field lines into the upper atmosphere ![media:Upper atmosphere|wiki]. There, high-velocity electrons excite atmospheric oxygen and nitrogen molecules, releasing photons that paint undulating curtains of emerald green and violet across the ionosphere ![media:Ionosphere|duckduckgo].`,
  },
  {
    id: 'insect-metamorphosis',
    title: 'Metamorphosis & Butterfly Emergence',
    category: 'Entomology',
    icon: '🦋',
    prompt: 'How does a caterpillar dissolve and reorganize its anatomy into a butterfly?',
    response: `Complete metamorphosis ![media:Metamorphosis|wiki] is one of the most astonishing biological redesigns on Earth. An herbivorous caterpillar ![media:Caterpillar|duckduckgo] feeds constantly on host leaves until it anchors itself to a twig and forms a protective chrysalis or pupa ![media:Pupa|duckduckgo].

Inside the chrysalis, juvenile hormone levels drop dramatically, triggering programmed cell death known as apoptosis ![media:Apoptosis|wiki]. Digestive enzymes liquefy nearly all larval digestive tracts, muscles, and tissues into a nutrient-rich cellular broth.

Crucially, small clusters of embryonic progenitor cells called imaginal discs ![media:Imaginal disc|wiki] survive this enzymatic dissolution. Nourished by the dissolved cellular soup, these imaginal discs rapidly differentiate, assembling compound eyes ![media:Compound eye|wiki], antennae, slender legs, and the dazzling iridescent scales that adorn the wings of a monarch butterfly ![media:Monarch butterfly|duckduckgo].`,
  },
  {
    id: 'extremophiles-tardigrades',
    title: 'Extremophiles & Cosmic Resilience',
    category: 'Astrobiology',
    icon: '🔬',
    prompt: 'How do microscopic tardigrades survive the vacuum of space and boiling heat?',
    response: `Microscopic eight-legged invertebrates called tardigrades ![media:Tardigrade|duckduckgo] (water bears) are the most resilient extremophiles ![media:Extremophile|wiki] discovered in biology. When confronted with lethal environmental stress, they suspend active metabolism and enter an extraordinary state known as cryptobiosis ![media:Cryptobiosis|wiki].

During this desiccation ![media:Desiccation|wiki] process, tardigrades expel up to 97% of their internal water, retracting their limbs into a shriveled dormant 'tun'. Instead of water, their cells produce specialized intrinsically disordered proteins that vitrify into microscopic biological glass ![media:Glass transition|wiki], locking delicate cell membranes in place.

In this impervious tun state, tardigrades have survived direct exposure to the vacuum and ionizing ultraviolet rays of outer space ![media:Outer space|duckduckgo], freezing temperatures as low as -272°C near absolute zero ![media:Absolute zero|wiki], boiling heat exceeding 150°C, and crushing hydrostatic pressures at the bottom of the Mariana Trench ![media:Mariana Trench|duckduckgo].`,
  },
];
