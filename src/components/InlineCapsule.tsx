'use client';

import React, { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ExternalLink, Maximize2, Sparkles } from 'lucide-react';
import { CapsuleSettings, ResolvedMedia } from '../core/types';
import { resolveMedia } from '../lib/wikimedia';

interface InlineCapsuleProps {
  query: string;
  fallbackUrl?: string;
  vendorPreference?: 'wikipedia' | 'duckduckgo' | 'auto';
  isPartial?: boolean;
  settings: CapsuleSettings;
  onInspect?: (media: ResolvedMedia) => void;
  id?: string;
  occurrenceIndex?: number;
  claimedUrlsRef?: React.MutableRefObject<Map<string, string>>;
}

export const InlineCapsule: React.FC<InlineCapsuleProps> = memo(({
  query,
  fallbackUrl,
  vendorPreference = 'auto',
  isPartial = false,
  settings,
  onInspect,
  id,
  occurrenceIndex = 0,
  claimedUrlsRef,
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
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number; placeBelow: boolean } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const capsuleRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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

    let isCurrent = true;

    async function loadUniqueMedia() {
      // 1. Initial resolution with query occurrence index
      let res = await resolveMedia(
        query,
        fallbackUrl,
        vendorPreference,
        undefined,
        occurrenceIndex
      );

      if (!isCurrent) return;

      // 2. Anti-duplication check: if another capsule in this document already displays this image URL
      if (claimedUrlsRef && res.thumbnailUrl) {
        const capsuleKey = id || query;
        const isDuplicate = Array.from(claimedUrlsRef.current.entries()).some(
          ([otherId, url]) => otherId !== capsuleKey && url === res.thumbnailUrl
        );

        if (isDuplicate) {
          // Collision detected! Fetch alternative image excluding this duplicate URL
          const altRes = await resolveMedia(
            query,
            fallbackUrl,
            vendorPreference,
            res.thumbnailUrl,
            occurrenceIndex + 1
          );

          if (isCurrent && altRes.thumbnailUrl) {
            res = altRes;
          }
        }

        if (res.thumbnailUrl) {
          claimedUrlsRef.current.set(capsuleKey, res.thumbnailUrl);
        }
      }

      if (isCurrent) {
        setMedia(res);
      }
    }

    loadUniqueMedia();

    return () => {
      isCurrent = false;
      if (claimedUrlsRef && (id || query)) {
        claimedUrlsRef.current.delete(id || query);
      }
    };
  }, [query, fallbackUrl, vendorPreference, isPartial, occurrenceIndex, id, claimedUrlsRef]);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (!settings.showHoverCard) return;
    if (capsuleRef.current) {
      const rect = capsuleRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Smart shift above:
      // When hovering from bottom of view or when space below is tight (<420px),
      // ALWAYS place above so the card never goes invisible below the viewport!
      const placeBelow = spaceBelow >= 420 && spaceBelow >= spaceAbove;

      const centerX = rect.left + rect.width / 2;
      const left = Math.max(160, Math.min(window.innerWidth - 160, centerX));
      const top = placeBelow ? rect.bottom + 8 : rect.top - 8;

      setPopoverCoords({ top, left, placeBelow });
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 60);
  };

  // Active viewport boundary guard:
  // If popover card bottom ever touches or bleeds below the viewport, immediately shift above!
  useEffect(() => {
    if (!isHovered || !popoverRef.current || !capsuleRef.current) return;
    const cardRect = popoverRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    if (cardRect.bottom > viewportHeight - 12) {
      const capsuleRect = capsuleRef.current.getBoundingClientRect();
      setPopoverCoords((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          placeBelow: false,
          top: capsuleRect.top - 8,
        };
      });
    }
  }, [isHovered, media.thumbnailUrl, media.description]);

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

  const hasImage = media.status === 'loaded' && Boolean(media.thumbnailUrl);
  const isLoading = media.status === 'loading';

  // Sizing & baseline calculations
  const capsuleHeight = settings.height;
  const capsuleWidth = Math.round(capsuleHeight * 1.5);
  const borderRadius = settings.borderRadius;

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    verticalAlign: settings.opticalAlignment,
    transform: `translateY(${settings.verticalOffset}px)`,
    marginLeft: `${settings.gap / 2}px`,
    marginRight: `${settings.gap / 2}px`,
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <motion.button
          type="button"
          style={containerStyle}
          whileHover={settings.hoverScale ? { scale: 1.06 } : undefined}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 450, damping: 28 }}
          onClick={() => onInspect?.(media)}
          aria-label={media.title || query}
          title={media.title || query}
          className={`group relative overflow-hidden transition-all duration-200 border ${
            isLoading
              ? 'border-white/10 bg-white/5'
              : hasImage
              ? 'border-white/15 bg-black/40 hover:border-amber-400/50 shadow-sm hover:shadow-amber-500/10'
              : 'border-white/10 bg-white/5 hover:border-white/20'
          }`}
        >
          {/* Loading State: Compact Shimmer Capsule */}
          {isLoading && (
            <span className="flex items-center justify-center w-full h-full text-white/70 animate-shimmer">
              <Sparkles className="w-2.5 h-2.5 text-amber-400 animate-pulse shrink-0" />
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
                onError={() => setImageError(true)}
                className={`h-full w-auto min-w-full object-cover transition-opacity duration-300 pointer-events-none ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
              {!imageLoaded && (
                <span className="absolute inset-0 flex items-center justify-center bg-white/5 animate-shimmer">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400/80 animate-pulse shrink-0" />
                  <span className="sr-only">{query}</span>
                </span>
              )}
              <span className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
            </>
          )}

          {/* Fallback Badge (when image 404s, errors out, or not found) */}
          {(media.status === 'not-found' || imageError) && (
            <span
              className="flex items-center justify-center w-full h-full text-amber-300/90 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
              title={media.title || query}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="sr-only">{media.title || query}</span>
            </span>
          )}
        </motion.button>
      </span>

      {/* Portal-Mounted Hover Popover Card (Root-level Stacking Context, z-[99999]) */}
      {mounted && isHovered && popoverCoords && (media.status === 'loaded' || imageError) && typeof document !== 'undefined' &&
        createPortal(
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: popoverCoords.placeBelow ? -8 : 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: popoverCoords.placeBelow ? -6 : 6, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 26 }}
            style={{
              position: 'fixed',
              top: `${popoverCoords.top}px`,
              left: `${popoverCoords.left}px`,
              transform: `translate(-50%, ${popoverCoords.placeBelow ? '0' : '-100%'})`,
              zIndex: 99999,
            }}
            className="w-72 p-3 rounded-xl bg-[#14161a] border border-white/20 shadow-2xl backdrop-blur-2xl pointer-events-auto text-left max-h-[calc(100vh-32px)] overflow-y-auto"
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
                    onInspect?.(media);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 transition-colors"
                  title="Expand image"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Title & metadata */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="block text-sm font-semibold text-white tracking-tight leading-snug">
                {media.title || query}
              </span>
              <span
                className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                  media.vendor === 'duckduckgo'
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                }`}
              >
                {media.vendor === 'duckduckgo' ? 'DuckDuckGo' : 'Wikipedia'}
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
                  className={`inline-flex items-center gap-1 font-medium transition-colors ${
                    media.vendor === 'duckduckgo'
                      ? 'text-sky-400 hover:text-sky-300'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {media.vendor === 'duckduckgo' ? 'DuckDuckGo Web' : 'Wikipedia'}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </motion.div>,
          document.body
        )}
    </>
  );
});
