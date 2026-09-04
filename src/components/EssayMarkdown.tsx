'use client';

import React, { memo, useState, useCallback, useMemo } from 'react';
import Markdown, { defaultUrlTransform, type Components, type UrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { InlineCapsule } from './InlineCapsule';
import { MediaLightbox } from './MediaLightbox';
import { parseNeanderthalMediaSource, NEANDERTHAL_MEDIA_SCHEME } from '../core/media-markdown';
import { DEFAULT_CAPSULE_SETTINGS, ResolvedMedia, CapsuleSettings } from '../core/types';

interface EssayMarkdownProps {
  children: string;
  className?: string;
  settings?: CapsuleSettings;
}

const safeMarkdownUrl: UrlTransform = (url, key) => {
  if (key === 'src' && url.startsWith(NEANDERTHAL_MEDIA_SCHEME)) {
    return url;
  }
  return defaultUrlTransform(url);
};

export const EssayMarkdown: React.FC<EssayMarkdownProps> = memo(({
  children,
  className,
  settings = DEFAULT_CAPSULE_SETTINGS,
}) => {
  const [inspectMedia, setInspectMedia] = useState<ResolvedMedia | null>(null);

  const handleCloseLightbox = useCallback(() => {
    setInspectMedia(null);
  }, []);

  const components: Components = useMemo(
    () => ({
      img: ({ src, alt, className: imgClassName, ...props }) => {
        const descriptor = parseNeanderthalMediaSource(typeof src === 'string' ? src : undefined);
        if (!descriptor) {
          return <img {...props} src={src} alt={alt || ''} className={imgClassName} />;
        }

        const query = alt?.trim() || 'Visualizing…';
        return (
          <InlineCapsule
            query={query}
            fallbackUrl={descriptor.fallbackUrl}
            vendorPreference={descriptor.vendorPreference}
            isPartial={descriptor.isPartial}
            settings={settings}
            onInspect={setInspectMedia}
          />
        );
      },
    }),
    [settings]
  );

  const content = (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={components}
      urlTransform={safeMarkdownUrl}
    >
      {children}
    </Markdown>
  );

  return (
    <>
      {className ? <div className={className}>{content}</div> : content}
      <MediaLightbox media={inspectMedia} onClose={handleCloseLightbox} />
    </>
  );
});
