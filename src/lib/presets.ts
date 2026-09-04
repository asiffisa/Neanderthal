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
    response: `In the bathypelagic zone ![Bathypelagic zone](neanderthal:image)—over 1,000 meters below the surface—sunlight is completely absent. In this pitch-black realm, over 75% of marine creatures produce their own illumination through bioluminescence ![Bioluminescence](neanderthal:image), generating cold living light via the oxidation of luciferin catalyzed by luciferase enzymes.

Survival in the oceanic abyss relies heavily on optical deception. The deep sea anglerfish ![Deep sea anglerfish](neanderthal:image) dangles a modified dorsal spine tipped with a glowing bulb filled with symbiotic bacteria. It twitches this glowing lure right before its jaws to entice prey. Nearby, gelatinous comb jellies ![Comb jelly](neanderthal:image) pulse rhythmic shimmering diffraction waves along their swimming cilia.

Meanwhile, the vampire squid ![Vampire squid](neanderthal:image) expels an astonishing cloud of glowing bioluminescent mucus to blind predators in the blackness. Further along the seabed, benthic creatures drift past abyssal hydrothermal vents ![Hydrothermal vent](neanderthal:image), where giant tubeworms thrive on volcanic minerals.`,
  },
  {
    id: 'photosynthesis-energy',
    title: 'Photosynthesis & Solar Fuel',
    category: 'Plant Biology',
    icon: '🌿',
    prompt: 'How do plants convert sunlight and carbon dioxide into chemical energy?',
    response: `Photosynthesis ![Photosynthesis](neanderthal:image) is the primary biochemical engine powering Earth's biosphere. Within leaf mesophyll cells, millions of microscopic chloroplasts ![Chloroplast](neanderthal:image) act as self-assembling solar power stations.

Embedded inside disc-shaped thylakoids ![Thylakoid](neanderthal:image), pigment arrays of chlorophyll absorb blue and red photons while reflecting green wavelengths. In the light-dependent reactions, absorbed light energy splits water molecules, liberating free electrons and charging the rotary motor enzyme ATP synthase ![ATP synthase](neanderthal:image).

These energetic molecules fuel the Calvin cycle ![Calvin cycle](neanderthal:image) within the stroma. Atmospheric carbon dioxide absorbed through microscopic leaf stomata ![Stoma](neanderthal:image) is fixed by the enzyme RuBisCO into energy-dense glucose, building cellulose cell walls and supplying breathable oxygen to our planet.`,
  },
  {
    id: 'quantum-wave-particle',
    title: 'Quantum Wave-Particle Duality',
    category: 'Quantum Physics',
    icon: '⚛️',
    prompt: 'How can light and matter behave simultaneously as both waves and particles?',
    response: `At the subatomic scale, classical intuition dissolves into the paradoxical laws of quantum mechanics. In 1905, Albert Einstein explained the photoelectric effect ![Photoelectric effect](neanderthal:image) by demonstrating that beam energy is quantized into discrete light packets. These elementary units of light, now known as photons ![Photon](neanderthal:image), established that electromagnetic radiation can behave as particles.

However, the foundational double-slit experiment ![Double-slit experiment](neanderthal:image) reveals that when unobserved, individual particles pass through both slits at once, generating an interference wave pattern on the detector screen. This reality confirms the foundational principle of wave–particle duality ![Wave–particle duality](neanderthal:image).

Louis de Broglie showed that matter itself possesses an associated matter wave. Werner Heisenberg formulated the uncertainty principle ![Uncertainty principle](neanderthal:image) to define the limits of quantum measurement. Physicists soon recognized that particles exist as probability clouds described by the wave function ![Wave function](neanderthal:image) until measurement collapses them into definite states.`,
  },
  {
    id: 'stellar-supernovae',
    title: 'Supernovae & Stellar Death',
    category: 'Astrophysics',
    icon: '💥',
    prompt: 'What happens when a massive star exhausts its nuclear fuel and explodes?',
    response: `Stars are colossal nuclear fusion reactors that spend millions of years synthesizing helium, carbon, and oxygen. When an evolved red supergiant ![Red supergiant](neanderthal:image) exhausts its core fuel, it forms an inert stellar core ![Stellar core](neanderthal:image) that can no longer support its immense mass against gravitational collapse.

Within milliseconds, gravity triggers a catastrophic implosion, rebounding as a titanic supernova ![Supernova](neanderthal:image) that temporarily outshines an entire galaxy. The resulting shockwave blasts across interstellar space, creating an expanding, colorful supernova remnant known as the Crab Nebula ![Crab Nebula](neanderthal:image).

At the explosion's dense center, electrons and protons merge into a city-sized sphere of pure nuclear matter: a rapidly rotating neutron star ![Neutron star](neanderthal:image). If the stellar progenitor was sufficiently massive, the collapse continues unchecked, giving birth to a gravitational singularity known as a black hole ![Black hole](neanderthal:image).`,
  },
  {
    id: 'mycelium-underground',
    title: 'Subterranean Mycelial Networks',
    category: 'Mycology & Ecology',
    icon: '🍄',
    prompt: 'How do fungal mycelial networks connect forests and share nutrients?',
    response: `Beneath the temperate forest floor lies an immense, living biological internet. Fungi grow as an intricate subterranean network of microscopic branching threads called mycelium ![Mycelium](neanderthal:image). These networks are constructed of individual tubular filaments known as hyphae ![Hypha](neanderthal:image), while the mushrooms seen on the surface are merely ephemeral fruiting bodies.

Through ancient mutualistic partnerships called mycorrhiza ![Mycorrhiza](neanderthal:image), fungal hyphae sheath tree root systems. Because fungi produce powerful extracellular enzymes to mine phosphorus and nitrogen from mineral bedrock ![Mineral](neanderthal:image), they deliver these vital nutrients to trees in exchange for carbon-rich sugars produced by photosynthesis.

Often celebrated as the 'Wood-Wide Web', this vast mycorrhizal network ![Mycorrhizal network](neanderthal:image) transmits biochemical warning signals when pests attack. By connecting the tree roots ![Root](neanderthal:image) of diverse species, it redistributes water and nutrients across entire forest ecosystems.`,
  },
  {
    id: 'aurora-solar-winds',
    title: 'Aurora Borealis & Magnetosphere',
    category: 'Geophysics',
    icon: '🌌',
    prompt: 'What creates the glowing curtains of the Northern and Southern Lights?',
    response: `The iridescent ribbons of the polar aurora ![Aurora borealis](neanderthal:image) begin 93 million miles away on the boiling surface of the Sun. Intense solar flares and coronal mass ejections ![Coronal mass ejection](neanderthal:image) launch the solar wind—a fast-moving stream of magnetized plasma traveling at millions of miles per hour through space.

When this plasma collides with Earth, it meets the protective shield of our planet's magnetosphere ![Magnetosphere](neanderthal:image). This planetary shield is generated by liquid molten iron circulating within Earth's outer core along geomagnetic field lines ![Earth's magnetic field](neanderthal:image).

While the magnetosphere deflects most solar radiation into space, it funnels charged particles down into the upper atmosphere. There, high-velocity electrons excite atmospheric oxygen and nitrogen atoms across the ionosphere ![Ionosphere](neanderthal:image). The resulting energy release paints undulating curtains of emerald green and violet light known as an aurora ![Aurora](neanderthal:image).`,
  },
  {
    id: 'insect-metamorphosis',
    title: 'Metamorphosis & Butterfly Emergence',
    category: 'Entomology',
    icon: '🦋',
    prompt: 'How does a caterpillar dissolve and reorganize its anatomy into a butterfly?',
    response: `Complete metamorphosis is one of the most astonishing biological redesigns on Earth. An herbivorous caterpillar ![Caterpillar](neanderthal:image) feeds constantly on host leaves until it anchors itself to a twig. There, it sheds its outer cuticle to form a protective chrysalis or pupa ![Pupa](neanderthal:image).

Inside the chrysalis, juvenile hormone levels drop dramatically, triggering programmed cell death known as apoptosis ![Apoptosis](neanderthal:image). Specialized digestive enzymes ![Enzyme](neanderthal:image) rapidly break down larval digestive tracts, muscles, and tissues into a nutrient-rich cellular soup.

Crucially, small clusters of embryonic progenitor cells called imaginal discs ![Imaginal disc](neanderthal:image) survive this enzymatic dissolution. Nourished by the surrounding broth, these imaginal discs rapidly differentiate to construct the compound eyes, antennae, slender legs, and dazzling wings of a monarch butterfly ![Monarch butterfly](neanderthal:image).`,
  },
  {
    id: 'extremophiles-tardigrades',
    title: 'Extremophiles & Cosmic Resilience',
    category: 'Astrobiology',
    icon: '🔬',
    prompt: 'How do microscopic tardigrades survive the vacuum of space and boiling heat?',
    response: `Microscopic eight-legged invertebrates called tardigrades ![Tardigrade](neanderthal:image) are among the most resilient extremophiles discovered in biology. When confronted with lethal environmental stress, they suspend active metabolism and enter an extraordinary state of suspended animation known as cryptobiosis ![Cryptobiosis](neanderthal:image).

During this desiccation process, tardigrades expel up to 97% of their internal water, retracting their limbs into a shriveled dormant tun via anhydrobiosis ![Anhydrobiosis](neanderthal:image). Instead of water, their cells produce specialized intrinsically disordered proteins that vitrify into protective biological glass through vitrification ![Vitrification](neanderthal:image), locking delicate cell membranes in place.

In this impervious tun state, tardigrades have survived direct exposure to the lethal vacuum and ionizing radiation of outer space ![Outer space](neanderthal:image). They can also withstand freezing temperatures near absolute zero, boiling heat exceeding 150°C, and crushing hydrostatic pressures at the bottom of the Mariana Trench ![Mariana Trench](neanderthal:image).`,
  },
];
