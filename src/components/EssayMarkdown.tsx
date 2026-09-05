'use client';

import React, { createContext, memo, useCallback, useContext, useMemo, useState } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { InlineCapsule } from './InlineCapsule';
import { MediaLightbox } from './MediaLightbox';
import { parseNeanderthalMediaSource, safeMarkdownUrl } from '../core/media-markdown';
import { DEFAULT_CAPSULE_SETTINGS, ResolvedMedia, CapsuleSettings } from '../core/types';

const InspectContext = createContext<((media: ResolvedMedia) => void) | undefined>(undefined);

/** One lightbox for the whole essay: a modal is singular, however many prose blocks there are. */
export function EssayLightbox({ children }: { children: React.ReactNode }) {
  const [media, setMedia] = useState<ResolvedMedia | null>(null);
  const close = useCallback(() => setMedia(null), []);

  return (
    <InspectContext.Provider value={setMedia}>
      {children}
      <MediaLightbox media={media} onClose={close} />
    </InspectContext.Provider>
  );
}

interface EssayMarkdownProps {
  children: string;
  className?: string;
  settings?: CapsuleSettings;
}

const remarkPlugins = [remarkGfm];

export const EssayMarkdown: React.FC<EssayMarkdownProps> = memo(({
  children,
  className,
  settings = DEFAULT_CAPSULE_SETTINGS,
}) => {
  const onInspect = useContext(InspectContext);

  const components: Components = useMemo(
    () => ({
      img: ({ src, alt, className: imgClassName, ...props }) => {
        const descriptor = parseNeanderthalMediaSource(typeof src === 'string' ? src : undefined);
        if (!descriptor) {
          return <img {...props} src={src} alt={alt || ''} className={imgClassName} />;
        }

        return (
          <InlineCapsule
            query={alt?.trim() || 'Visualizing…'}
            fallbackUrl={descriptor.fallbackUrl}
            vendorPreference={descriptor.vendorPreference}
            isPartial={descriptor.isPartial}
            settings={settings}
            onInspect={onInspect}
          />
        );
      },
    }),
    [settings, onInspect]
  );

  const content = (
    <Markdown remarkPlugins={remarkPlugins} components={components} urlTransform={safeMarkdownUrl}>
      {children}
    </Markdown>
  );

  return className ? <div className={className}>{content}</div> : content;
});

EssayMarkdown.displayName = 'EssayMarkdown';
