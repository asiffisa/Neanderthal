export interface ResolvedMedia {
  query: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  fullImageUrl?: string;
  sourceUrl?: string;
  vendor?: 'wikipedia' | 'duckduckgo';
  status: 'loading' | 'loaded' | 'not-found' | 'error';
}

/** One resolvable image marker found in the prose, for the media sidebar. */
export interface MediaToken {
  query: string;
  vendorPreference: 'wikipedia' | 'duckduckgo' | 'auto';
  fallbackUrl?: string;
}

export interface CapsuleSettings {
  height: number; // in pixels, e.g. 24
  borderRadius: number; // in pixels, e.g. 8
  gap: number; // in pixels, e.g. 6
  verticalOffset: number; // in pixels, e.g. -2
  visualsPerParagraph: number; // target visuals per paragraph, e.g. 3
}

export const DEFAULT_CAPSULE_SETTINGS: CapsuleSettings = {
  height: 26,
  borderRadius: 8,
  gap: 6,
  verticalOffset: -2,
  visualsPerParagraph: 4,
};
