export type MediaType = 'image' | 'video' | 'gif' | 'lottie';

export interface ResolvedMedia {
  query: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  fullImageUrl?: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
  vendor?: 'wikipedia' | 'duckduckgo';
  status: 'loading' | 'loaded' | 'not-found' | 'error';
}

export type MarkdownToken =
  | {
      type: 'text';
      content: string;
    }
  | {
      type: 'media';
      raw: string;
      query: string;
      mediaType?: MediaType;
      vendorPreference?: 'wikipedia' | 'duckduckgo' | 'auto';
      occurrenceIndex?: number;
      fallbackUrl?: string;
      id: string;
      isPartial?: boolean;
    };

export interface CapsuleSettings {
  height: number; // in pixels, e.g. 24
  borderRadius: number; // in pixels, e.g. 8
  gap: number; // in pixels, e.g. 6
  verticalOffset: number; // in pixels, e.g. -2
  visualsPerParagraph: number; // target visuals per paragraph, e.g. 3
  showHoverCard: boolean;
  hoverScale: boolean;
  opticalAlignment: 'middle' | 'baseline' | 'center';
}

export const DEFAULT_CAPSULE_SETTINGS: CapsuleSettings = {
  height: 26,
  borderRadius: 8,
  gap: 6,
  verticalOffset: -2,
  visualsPerParagraph: 5,
  showHoverCard: true,
  hoverScale: false,
  opticalAlignment: 'middle',
};
