/** Fallback ladder tried after the requested model: cheap default first, then older releases. */
export const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
] as const;

export const MODEL_PATTERN = /^gemini-[a-z0-9.-]{1,70}$/;

/** GEMINI and Gemini are accepted because Vercel projects were provisioned with those names. */
export function serverApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.Gemini?.trim() ||
    process.env.GEMINI?.trim() ||
    undefined
  );
}

export function defaultModel(): string {
  return process.env.GEMINI_MODEL?.trim() || GEMINI_MODELS[0];
}

export function modelCandidates(requested?: unknown): string[] {
  const first = typeof requested === 'string' && requested.trim() ? requested.trim() : defaultModel();
  return [...new Set([first, ...GEMINI_MODELS])];
}

/** "gemini-3.5-flash-lite" -> "Gemini 3.5 Flash Lite", or "Gemini 3.5 Lite" when short. */
export function modelLabel(id: string, short = false): string {
  const match = /^gemini-([\d.]+)-(.+)$/.exec(id);
  if (!match) return short ? 'Gemini' : 'Gemini Flash';
  const words = match[2].split('-').map((word) => word[0].toUpperCase() + word.slice(1));
  const suffix = short ? words.filter((word) => word !== 'Flash') : words;
  return ['Gemini', match[1], ...suffix].join(' ');
}
