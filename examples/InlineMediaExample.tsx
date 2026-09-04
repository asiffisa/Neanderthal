'use client';

import { useCallback, useState } from 'react';
import { MediaLightbox } from '../src/components/MediaLightbox';
import { StreamingMarkdownView } from '../src/components/StreamingMarkdownView';
import { DEFAULT_CAPSULE_SETTINGS, type ResolvedMedia } from '../src/core/types';

interface InlineMediaExampleProps {
  content?: string;
  isStreaming?: boolean;
}

/** Requires Tailwind CSS and the same-origin resolver described in the guide. */
export function InlineMediaExample({
  content = 'An anglerfish ![Deep sea anglerfish](neanderthal:image) uses a glowing lure.',
  isStreaming = false,
}: InlineMediaExampleProps) {
  const [inspectedMedia, setInspectedMedia] = useState<ResolvedMedia | null>(null);
  const closeInspection = useCallback(() => setInspectedMedia(null), []);

  return (
    <div className="rounded-2xl bg-[#101114] p-6 text-zinc-200">
      <StreamingMarkdownView
        content={content}
        isStreaming={isStreaming}
        settings={DEFAULT_CAPSULE_SETTINGS}
        onInspect={setInspectedMedia}
      />
      <MediaLightbox media={inspectedMedia} onClose={closeInspection} />
    </div>
  );
}
