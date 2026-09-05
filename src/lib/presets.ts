export interface PresetQuestion {
  id: string;
  title: string;
  category: string;
  icon: string;
  prompt: string;
  response: string;
}

export const DEFAULT_PRESET: PresetQuestion = {
  id: 'deep-sea-bioluminescence',
  title: 'Bioluminescent Abyss',
  category: 'Marine Biology',
  icon: '🌊',
  prompt: 'How do deep-sea organisms create cold light to survive in the midnight zone?',
  response: `In the bathypelagic zone ![Bathypelagic zone](neanderthal:image)—over 1,000 meters below the surface—sunlight is completely absent. In this pitch-black realm, over 75% of marine creatures produce their own illumination through bioluminescence ![Bioluminescence](neanderthal:image), generating cold living light via the oxidation of luciferin catalyzed by luciferase enzymes.

Survival in the oceanic abyss relies heavily on optical deception. The deep sea anglerfish ![Deep sea anglerfish](neanderthal:image) dangles a modified dorsal spine tipped with a glowing bulb filled with symbiotic bacteria. It twitches this glowing lure right before its jaws to entice prey. Nearby, gelatinous comb jellies ![Comb jelly](neanderthal:image) pulse rhythmic shimmering diffraction waves along their swimming cilia.

Meanwhile, the vampire squid ![Vampire squid](neanderthal:image) expels an astonishing cloud of glowing bioluminescent mucus to blind predators in the blackness. Further along the seabed, benthic creatures drift past abyssal hydrothermal vents ![Hydrothermal vent](neanderthal:image), where giant tubeworms thrive on volcanic minerals.`,
};
