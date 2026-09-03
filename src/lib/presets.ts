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
    response: `In the bathypelagic zone ![Bathypelagic zone](neanderthal:image)—over 1,000 meters below the surface—sunlight is completely absent. In this pitch-black realm, over 75% of marine creatures produce their own illumination through bioluminescence ![Marine bioluminescence](neanderthal:image), generating cold living light via the oxidation of luciferin catalyzed by luciferase enzymes.

Survival in the oceanic abyss relies heavily on optical deception. The deep sea anglerfish ![Deep sea anglerfish](neanderthal:image) dangles a modified dorsal spine (the illicium) tipped with a glowing bulb filled with symbiotic phototrophic bacteria. It twitches this glowing lure right before its jaws to entice prey. Nearby, gelatinous siphonophores and comb jellies pulse rhythmic shimmering diffraction waves ![Comb jelly diffraction](neanderthal:image) along their swimming cilia.

Meanwhile, the vampire squid ![Vampire squid](neanderthal:image) expels an astonishing cloud of glowing bioluminescent mucus to blind predators in the blackness, and benthic creatures drift past abyssal hydrothermal vents ![Hydrothermal vent ecosystem](neanderthal:image), where giant tubeworms thrive on volcanic minerals.`,
  },
  {
    id: 'photosynthesis-energy',
    title: 'Photosynthesis & Solar Fuel',
    category: 'Plant Biology',
    icon: '🌿',
    prompt: 'How do plants convert sunlight and carbon dioxide into chemical energy?',
    response: `Photosynthesis ![Photosynthesis process diagram](neanderthal:image) is the primary biochemical engine powering Earth's biosphere. Within leaf mesophyll cells, millions of microscopic chloroplasts ![Chloroplast structure](neanderthal:image) act as self-assembling solar power stations.

Embedded inside disc-shaped thylakoid membranes ![Thylakoid membrane](neanderthal:image), pigment arrays of chlorophyll absorb blue and red photons while reflecting green wavelengths. In the light-dependent reactions, absorbed light energy splits water molecules, liberating free electrons and charging the rotary motor enzyme ATP synthase ![ATP synthase molecular structure](neanderthal:image).

These energetic molecules fuel the Calvin cycle ![Calvin cycle diagram](neanderthal:image) within the stroma. Here, atmospheric carbon dioxide absorbed through microscopic leaf stomata ![Plant leaf stomata](neanderthal:image) is fixed by the enzyme RuBisCO into energy-dense glucose, building cellulose cell walls and supplying breathable oxygen to our planet.`,
  },
  {
    id: 'quantum-wave-particle',
    title: 'Quantum Wave-Particle Duality',
    category: 'Quantum Physics',
    icon: '⚛️',
    prompt: 'How can light and matter behave simultaneously as both waves and particles?',
    response: `At the subatomic scale, classical intuition dissolves into the paradoxical laws of quantum mechanics. In 1905, Albert Einstein explained the photoelectric effect ![Photoelectric effect diagram](neanderthal:image) by demonstrating that beam energy is quantized into discrete light packets called photons ![Photon light packet](neanderthal:image), establishing that radiation behaves as particles.

However, the foundational double-slit experiment ![Double-slit experiment](neanderthal:image) reveals that when unobserved, individual photons and electrons pass through both slits at once, generating an interference wave pattern on the detector screen. This reality confirms wave–particle duality ![Wave-particle duality diagram](neanderthal:image).

Louis de Broglie showed that matter itself possesses an associated matter wave. When Werner Heisenberg formulated the uncertainty principle ![Heisenberg uncertainty principle diagram](neanderthal:image) and Erwin Schrödinger penned the wave function ![Quantum wave function visualization](neanderthal:image), physicists realized that particles exist as probability clouds until a quantum measurement collapses them into definite states.`,
  },
  {
    id: 'stellar-supernovae',
    title: 'Supernovae & Stellar Death',
    category: 'Astrophysics',
    icon: '💥',
    prompt: 'What happens when a massive star exhausts its nuclear fuel and explodes?',
    response: `Stars are colossal nuclear fusion reactors that spend millions of years synthesizing helium, carbon, and oxygen. When an evolved red supergiant ![Red supergiant star](neanderthal:image) exhausts its core fuel, it forms an inert iron core ![Stellar fusion core](neanderthal:image) that can no longer support its immense mass against gravitational collapse.

Within milliseconds, gravity triggers a catastrophic implosion, rebounding as a titanic supernova explosion ![Supernova explosion shockwave](neanderthal:image) that temporarily outshines an entire galaxy. The resulting shockwave blasts across interstellar space, creating an expanding, colorful supernova remnant ![Crab Nebula supernova remnant](neanderthal:image) like the iconic Crab Nebula.

At the explosion's dense center, electrons and protons merge into a city-sized sphere of pure nuclear matter: a rapidly rotating pulsar or neutron star ![Neutron star structure](neanderthal:image). If the stellar progenitor was sufficiently massive, the collapse continues unchecked, giving birth to a gravitational singularity known as a black hole ![Black hole visualization](neanderthal:image).`,
  },
  {
    id: 'mycelium-underground',
    title: 'Subterranean Mycelial Networks',
    category: 'Mycology & Ecology',
    icon: '🍄',
    prompt: 'How do fungal mycelial networks connect forests and share nutrients?',
    response: `Beneath the temperate forest floor lies an immense, living biological internet. Fungi grow as an intricate subterranean network of microscopic branching threads called mycelium ![Fungal mycelium network](neanderthal:image), constructed of individual tubular filaments known as hyphae ![Fungal hypha structure](neanderthal:image), while the mushrooms seen on the surface are merely ephemeral fruiting bodies.

Through ancient mutualistic partnerships called mycorrhiza ![Mycorrhizal fungi on plant roots](neanderthal:image), fungal hyphae sheath tree root systems. Because fungi produce powerful extracellular enzymes to mine phosphorus and nitrogen from bedrock ![Extracellular mineral extraction](neanderthal:image), they deliver these mineral ions to trees in exchange for carbon-rich sugars produced by leaf photosynthesis.

Often celebrated as the 'Wood-Wide Web', this vast mycorrhizal network ![Forest mycorrhizal network diagram](neanderthal:image) transmits biochemical warning signals when pests attack, redistributing water and nitrogen and connecting diverse tree species across entire forest ecosystems ![Tree root fungal symbiosis](neanderthal:image).`,
  },
  {
    id: 'aurora-solar-winds',
    title: 'Aurora Borealis & Magnetosphere',
    category: 'Geophysics',
    icon: '🌌',
    prompt: 'What creates the glowing curtains of the Northern and Southern Lights?',
    response: `The iridescent ribbons of the polar aurora ![Aurora borealis](neanderthal:image) begin 93 million miles away on the boiling surface of the Sun. Intense solar flares and coronal mass ejections ![Solar coronal mass ejection](neanderthal:image) launch the solar wind—a fast-moving stream of magnetized plasma traveling at millions of miles per hour through space.

When this plasma collides with Earth, it meets the protective shield of our planet's magnetosphere ![Earth magnetosphere diagram](neanderthal:image), generated by liquid molten iron circulating within Earth's outer core along geomagnetic field lines ![Geomagnetic field lines](neanderthal:image).

While the magnetosphere deflects most solar radiation into the magnetotail, it funnels charged ions down into the upper atmosphere. There, high-velocity electrons excite atmospheric oxygen and nitrogen molecules, releasing photons that paint undulating curtains of emerald green and violet across the ionosphere ![Aurora formation in the ionosphere](neanderthal:image), producing an atmospheric glow ![Ionosphere atmospheric glow](neanderthal:image).`,
  },
  {
    id: 'insect-metamorphosis',
    title: 'Metamorphosis & Butterfly Emergence',
    category: 'Entomology',
    icon: '🦋',
    prompt: 'How does a caterpillar dissolve and reorganize its anatomy into a butterfly?',
    response: `Complete metamorphosis is one of the most astonishing biological redesigns on Earth. An herbivorous caterpillar ![Monarch caterpillar](neanderthal:image) feeds constantly on host leaves until it anchors itself to a twig and forms a protective chrysalis or pupa ![Butterfly chrysalis](neanderthal:image).

Inside the chrysalis, juvenile hormone levels drop dramatically, triggering programmed cell death known as apoptosis ![Cellular apoptosis in chrysalis](neanderthal:image). Digestive enzymes liquefy nearly all larval digestive tracts, muscles, and tissues into a nutrient-rich cellular broth ![Larval tissue dissolution](neanderthal:image).

Crucially, small clusters of embryonic progenitor cells called imaginal discs ![Insect imaginal disc diagram](neanderthal:image) survive this enzymatic dissolution. Nourished by the dissolved cellular soup, these imaginal discs rapidly differentiate, assembling compound eyes, antennae, slender legs, and the dazzling iridescent scales that adorn the wings of a monarch butterfly ![Monarch butterfly](neanderthal:image).`,
  },
  {
    id: 'extremophiles-tardigrades',
    title: 'Extremophiles & Cosmic Resilience',
    category: 'Astrobiology',
    icon: '🔬',
    prompt: 'How do microscopic tardigrades survive the vacuum of space and boiling heat?',
    response: `Microscopic eight-legged invertebrates called tardigrades ![Tardigrade under a microscope](neanderthal:image) (water bears) are among the most resilient extremophiles discovered in biology. When confronted with lethal environmental stress, they suspend active metabolism and enter an extraordinary state known as cryptobiosis ![Cryptobiosis diagram](neanderthal:image).

During this desiccation process, tardigrades expel up to 97% of their internal water, retracting their limbs into a shriveled dormant 'tun' ![Tardigrade tun state](neanderthal:image). Instead of water, their cells produce specialized intrinsically disordered proteins that vitrify into microscopic biological glass ![Biological glass protein vitrification](neanderthal:image), locking delicate cell membranes in place.

In this impervious tun state, tardigrades have survived direct exposure to the vacuum and ionizing ultraviolet rays of outer space ![Vacuum of outer space](neanderthal:image), freezing temperatures as low as -272°C near absolute zero, boiling heat exceeding 150°C, and crushing hydrostatic pressures at the bottom of the Mariana Trench ![Mariana Trench](neanderthal:image).`,
  },
];
