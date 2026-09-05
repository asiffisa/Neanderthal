'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Maximize2, Sparkles } from 'lucide-react';
import { CapsuleSettings, ResolvedMedia } from '../core/types';
import { mediaFallback, resolveMedia, resolveUniqueMedia } from '../lib/wikimedia';
import { canonicalImageUrl } from '../lib/media-url';

interface InlineCapsuleProps {
  query: string;
  fallbackUrl?: string;
  vendorPreference?: 'wikipedia' | 'duckduckgo' | 'auto';
  isPartial?: boolean;
  settings: CapsuleSettings;
  onInspect?: (media: ResolvedMedia) => void;
  id?: string;
  claimedUrlsRef?: React.MutableRefObject<Map<string, string>>;
  context?: string;
}

export function shouldShowHoverPreview(pointerType: string, canHover: boolean) {
  return canHover && (pointerType === 'mouse' || pointerType === 'pen');
}

export const InlineCapsule: React.FC<InlineCapsuleProps> = memo(({
  query,
  fallbackUrl,
  vendorPreference = 'auto',
  isPartial = false,
  settings,
  onInspect,
  id,
  claimedUrlsRef,
  context,
}) => {
  const [media, setMedia] = useState<ResolvedMedia>({
    query,
    title: query,
    status: 'loading',
  });
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [popoverCoords, setPopoverCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    placeBelow: boolean;
    maxHeight: number;
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const capsuleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);

    // If the token is still streaming and hasn't closed with ']', stay in shimmer loading state
    if (isPartial) {
      setMedia({ query, title: query, status: 'loading' });
      return;
    }

    const controller = new AbortController();
    const capsuleKey = id || query;
    setMedia({ query, title: query, status: 'loading' });

    async function loadUniqueMedia() {
      try {
        const resolve = (excluded: string[], attempt: number) => resolveMedia(
          query, fallbackUrl, vendorPreference, excluded, attempt, context, controller.signal
        );
        const result = claimedUrlsRef
          ? await resolveUniqueMedia(resolve, claimedUrlsRef.current, capsuleKey, controller.signal)
          : await resolve([], 0);
        if (!controller.signal.aborted) setMedia(result);
      } catch {
        if (!controller.signal.aborted) setMedia(mediaFallback(query, fallbackUrl));
      }
    }

    void loadUniqueMedia();
    return () => {
      controller.abort();
      claimedUrlsRef?.current.delete(capsuleKey);
    };
  }, [query, fallbackUrl, vendorPreference, isPartial, id, claimedUrlsRef, context]);

  const updatePopoverPosition = useCallback(() => {
    if (!capsuleRef.current) return;
    const rect = capsuleRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Popover card is ~320px-360px tall with thumbnail and metadata.
    // If space below is less than 380px, or space above is larger, ALWAYS place above!
    const placeBelow = spaceBelow >= 380 && spaceBelow >= spaceAbove;

    const centerX = rect.left + rect.width / 2;
    // 288px width card with safety buffer from screen edge:
    const left = Math.max(152, Math.min(window.innerWidth - 152, centerX));

    if (placeBelow) {
      setPopoverCoords({
        placeBelow: true,
        left,
        top: Math.round(rect.bottom + 8),
        maxHeight: Math.max(180, Math.min(420, spaceBelow - 16)),
      });
    } else {
      setPopoverCoords({
        placeBelow: false,
        left,
        bottom: Math.round(viewportHeight - rect.top + 8),
        maxHeight: Math.max(180, Math.min(420, spaceAbove - 16)),
      });
    }
  }, []);

  const handleHoverEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    updatePopoverPosition();
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 60);
  };

  const handlePointerEnter = (event: React.PointerEvent<HTMLSpanElement>) => {
    // Mobile browsers can synthesize mouse events after a tap. Require both a
    // real hover-capable device and a mouse/pen event before showing the card.
    const canHover = window.matchMedia?.('(any-hover: hover)').matches ?? false;
    if (!shouldShowHoverPreview(event.pointerType, canHover)) return;
    handleHoverEnter();
  };

  const handleInspect = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsHovered(false);
    onInspect?.(media);
  };

  // Recalculate position dynamically if scrolled or resized while open
  useEffect(() => {
    if (!isHovered) return;
    const handleRecalc = () => updatePopoverPosition();
    window.addEventListener('scroll', handleRecalc, true);
    window.addEventListener('resize', handleRecalc);
    return () => {
      window.removeEventListener('scroll', handleRecalc, true);
      window.removeEventListener('resize', handleRecalc);
    };
  }, [isHovered, updatePopoverPosition]);

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // 200ms debounce delay before closing so cursor can move between capsule and popover card
    closeTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  const handleImageError = () => {
    const capsuleKey = id || query;
    const fallback = mediaFallback(query, fallbackUrl);
    const fallbackId = fallback.thumbnailUrl ? canonicalImageUrl(fallback.thumbnailUrl) : undefined;
    const alreadyUsed = fallbackId && claimedUrlsRef && [...claimedUrlsRef.current].some(
      ([owner, url]) => owner !== capsuleKey && canonicalImageUrl(url) === fallbackId
    );
    claimedUrlsRef?.current.delete(capsuleKey);
    if (fallbackId && fallbackId !== canonicalImageUrl(media.thumbnailUrl || '') && !alreadyUsed) {
      claimedUrlsRef?.current.set(capsuleKey, fallbackId);
      setImageLoaded(false);
      setImageError(false);
      setMedia(fallback);
    } else {
      setImageError(true);
      setMedia({ ...media, thumbnailUrl: undefined, fullImageUrl: undefined, status: 'not-found' });
    }
  };

  const hasImage = media.status === 'loaded' && Boolean(media.thumbnailUrl);
  const isLoading = media.status === 'loading';

  // Sizing & baseline calculations
  const capsuleHeight = settings.height;
  const capsuleWidth = Math.round(capsuleHeight * 1.5);
  const borderRadius = settings.borderRadius;

  // If the image failed to resolve or errored out, hide the capsule completely
  // rather than showing an intrusive broken grey pill with a dot.
  if (media.status === 'not-found' || imageError) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    verticalAlign: 'middle',
    ['--capsule-offset' as string]: `${settings.verticalOffset}px`,
    marginLeft: `${settings.gap / 2}px`,
    marginRight: 0,
    height: `${capsuleHeight}px`,
    minWidth: `${capsuleWidth}px`,
    width: `${capsuleWidth}px`,
    borderRadius: `${borderRadius}px`,
    lineHeight: 0,
    cursor: 'pointer',
    contain: 'layout paint style',
  };

  return (
    <>
      <span
        ref={capsuleRef}
        className="relative inline-block select-none"
        onPointerEnter={handlePointerEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          style={containerStyle}
          onClick={handleInspect}
          aria-label={media.title || query}
          title={media.title || query}
          className={`capsule group relative overflow-hidden transition-all duration-200 border ${
            isLoading
              ? 'border-white/10 bg-white/5'
              : hasImage
              ? 'border-white/15 bg-black/40 hover:border-white/40 shadow-sm hover:shadow-white/5'
              : 'border-white/10 bg-white/5 hover:border-white/20'
          }`}
        >
          {/* Loading State: Compact Shimmer Capsule */}
          {isLoading && (
            <span className="flex items-center justify-center w-full h-full text-white/70 animate-shimmer">
              <Sparkles className="w-2.5 h-2.5 text-zinc-300 animate-pulse shrink-0" />
              <span className="sr-only">{query}</span>
            </span>
          )}

          {/* Loaded Thumbnail State */}
          {hasImage && !imageError && (
            <>
              <img
                src={media.thumbnailUrl}
                alt={media.title || query}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onLoad={() => setImageLoaded(true)}
                onError={handleImageError}
                className={`h-full w-auto min-w-full object-cover transition-opacity duration-300 pointer-events-none ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
              {!imageLoaded && (
                <span className="absolute inset-0 flex items-center justify-center bg-white/5 animate-shimmer">
                  <Sparkles className="w-2.5 h-2.5 text-zinc-300/80 animate-pulse shrink-0" />
                  <span className="sr-only">{query}</span>
                </span>
              )}
              <span className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
            </>
          )}
        </button>
      </span>

      {/* Portal-Mounted Hover Popover Card (Root-level Stacking Context, z-[99999]) */}
      {mounted && isHovered && popoverCoords && media.status === 'loaded' && typeof document !== 'undefined' &&
        createPortal(
          <div
            key={`popover-${media.query}-${popoverCoords.placeBelow ? 'below' : 'above'}`}
            style={{
              position: 'fixed',
              top: popoverCoords.placeBelow ? `${popoverCoords.top}px` : 'auto',
              bottom: !popoverCoords.placeBelow ? `${popoverCoords.bottom}px` : 'auto',
              left: `${popoverCoords.left}px`,
              ['--rise-from' as string]: popoverCoords.placeBelow ? '-6px' : '6px',
              maxHeight: `${popoverCoords.maxHeight}px`,
              zIndex: 99999,
            }}
            className="animate-rise-in w-72 p-3 rounded-xl bg-[#14161a] border border-white/20 shadow-2xl backdrop-blur-2xl pointer-events-auto text-left overflow-y-auto"
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
              }
              setIsHovered(true);
            }}
            onMouseLeave={handleMouseLeave}
          >
            {/* Header with image */}
            {media.thumbnailUrl && !imageError && (
              <div className="relative w-full h-36 mb-2.5 rounded-lg overflow-hidden bg-black/60 border border-white/10 group">
                <img
                  src={media.fullImageUrl || media.thumbnailUrl}
                  alt={media.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInspect();
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 transition-colors"
                  title="Expand image"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Title & metadata */}
            <div className="mb-1">
              <span className="block text-sm font-semibold text-white tracking-tight leading-snug">
                {media.title || query}
              </span>
            </div>

            {/* Description */}
            {media.description && (
              <span
                className="block text-xs text-zinc-300 mb-2.5 leading-relaxed overflow-hidden"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {media.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()}
              </span>
            )}

            {/* Footer with action */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Click capsule to inspect</span>
              {media.sourceUrl && (
                <a
                  href={media.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-zinc-300 hover:text-white underline decoration-zinc-600 hover:decoration-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {media.vendor === 'duckduckgo' ? 'DuckDuckGo Web' : 'Wikipedia'}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
});

InlineCapsule.displayName = 'InlineCapsule';
