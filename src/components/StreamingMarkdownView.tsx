'use client';

import React, { createContext, memo, useContext, useEffect, useMemo, useRef } from 'react';
import Markdown, {
  defaultUrlTransform,
  type Components,
  type UrlTransform,
} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CapsuleSettings, ResolvedMedia } from '../core/types';
import {
  NEANDERTHAL_MEDIA_SCHEME,
  parseNeanderthalMediaSource,
  prepareNeanderthalMarkdown,
} from '../core/media-markdown';
import { remarkNeanderthalLegacy } from '../core/remark-neanderthal-legacy';
import { InlineCapsule } from './InlineCapsule';

interface StreamingMarkdownViewProps {
  content: string;
  isStreaming?: boolean;
  settings: CapsuleSettings;
  onInspect?: (media: ResolvedMedia) => void;
  className?: string;
}

const remarkPlugins = [remarkGfm, remarkNeanderthalLegacy];

const safeMarkdownUrl: UrlTransform = (url, key) => {
  if (key === 'src' && url.startsWith(NEANDERTHAL_MEDIA_SCHEME)) {
    return url;
  }

  return defaultUrlTransform(url);
};

interface MarkdownRenderContextValue {
  settings: CapsuleSettings;
  onInspect?: (media: ResolvedMedia) => void;
  claimedUrlsRef: React.MutableRefObject<Map<string, string>>;
}

const MarkdownRenderContext = createContext<MarkdownRenderContextValue | null>(null);

const MarkdownImage: NonNullable<Components['img']> = ({
  node,
  src,
  alt,
  className: imageClassName,
  ...props
}) => {
  const renderContext = useContext(MarkdownRenderContext);
  const descriptor = parseNeanderthalMediaSource(
    typeof src === 'string' ? src : undefined
  );

  if (!descriptor || !renderContext) {
    return (
      <img
        {...props}
        src={src}
        alt={alt || ''}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`max-w-full rounded-lg ${imageClassName || ''}`}
      />
    );
  }

  const query = alt?.trim() || 'Visualizing…';
  const offset = node?.position?.start.offset ?? 0;
  const id = `media-${offset}-${encodeURIComponent(query).slice(0, 20)}`;

  return (
    <InlineCapsule
      id={id}
      query={query}
      fallbackUrl={descriptor.fallbackUrl}
      vendorPreference={descriptor.vendorPreference}
      isPartial={descriptor.isPartial}
      settings={renderContext.settings}
      onInspect={renderContext.onInspect}
      claimedUrlsRef={renderContext.claimedUrlsRef}
    />
  );
};

const markdownComponents: Components = {
  h1: ({ node: _node, ...props }) => (
    <h1 className="text-3xl font-bold tracking-tight text-white mt-8" {...props} />
  ),
  h2: ({ node: _node, ...props }) => (
    <h2 className="text-2xl font-bold tracking-tight text-white mt-8" {...props} />
  ),
  h3: ({ node: _node, ...props }) => (
    <h3
      className="text-xl font-bold tracking-tight text-white mt-6 border-b border-white/10 pb-1"
      {...props}
    />
  ),
  p: ({ node: _node, ...props }) => <p className="break-words" {...props} />,
  strong: ({ node: _node, ...props }) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  em: ({ node: _node, ...props }) => <em className="text-zinc-100" {...props} />,
  a: ({ node: _node, ...props }) => (
    <a
      className="text-amber-300 underline decoration-amber-400/40 underline-offset-2 hover:text-amber-200"
      {...props}
    />
  ),
  ul: ({ node: _node, ...props }) => (
    <ul className="list-disc space-y-1 pl-6" {...props} />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol className="list-decimal space-y-1 pl-6" {...props} />
  ),
  li: ({ node: _node, ...props }) => <li className="pl-1" {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      className="border-l-2 border-amber-400/50 pl-4 text-zinc-300 italic"
      {...props}
    />
  ),
  code: ({ node: _node, ...props }) => (
    <code
      className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-amber-200"
      {...props}
    />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre
      className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-sm [&>code]:bg-transparent [&>code]:p-0"
      {...props}
    />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: ({ node: _node, ...props }) => (
    <th
      className="border-b border-white/10 bg-white/5 px-3 py-2 text-left text-white"
      {...props}
    />
  ),
  td: ({ node: _node, ...props }) => (
    <td className="border-b border-white/5 px-3 py-2 align-top" {...props} />
  ),
  hr: ({ node: _node, ...props }) => <hr className="border-white/10" {...props} />,
  img: MarkdownImage,
};

export const StreamingMarkdownView: React.FC<StreamingMarkdownViewProps> = memo(({
  content,
  isStreaming = false,
  settings,
  onInspect,
  className = '',
}) => {
  const claimedUrlsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!content) {
      claimedUrlsRef.current.clear();
    }
  }, [content]);

  const markdown = useMemo(
    () => prepareNeanderthalMarkdown(content, isStreaming),
    [content, isStreaming]
  );

  const renderContext = useMemo<MarkdownRenderContextValue>(() => ({
    settings,
    onInspect,
    claimedUrlsRef,
  }), [onInspect, settings]);

  if (!content) {
    return null;
  }

  return (
    <div className={`space-y-4 text-[16px] leading-[1.7] text-zinc-200 font-normal ${className}`}>
      <MarkdownRenderContext.Provider value={renderContext}>
        <Markdown
          remarkPlugins={remarkPlugins}
          components={markdownComponents}
          urlTransform={safeMarkdownUrl}
        >
          {markdown}
        </Markdown>
      </MarkdownRenderContext.Provider>

      {isStreaming && (
        <span
          aria-hidden="true"
          className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse align-middle rounded-sm"
        />
      )}
    </div>
  );
});
