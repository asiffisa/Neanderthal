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
  isPartial?: boolean;
  settings: CapsuleSettings;
  onInspect?: (media: ResolvedMedia) => void;
}

export const InlineCapsule: React.FC<InlineCapsuleProps> = memo(({
  query,
  fallbackUrl,
  isPartial = false,
  settings,
  onInspect,
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
  const capsuleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
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

    resolveMedia(query, fallbackUrl).then((res) => {
      if (isCurrent) {
        setMedia(res);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [query, fallbackUrl, isPartial]);

  const handleMouseEnter = () => {
    if (!settings.showHoverCard) return;
    if (capsuleRef.current) {
      const rect = capsuleRef.current.getBoundingClientRect();
      const placeBelow = rect.top < 360;
      const centerX = rect.left + rect.width / 2;
      const left = Math.max(160, Math.min(window.innerWidth - 160, centerX));
      const top = placeBelow ? rect.bottom + 8 : rect.top - 8;
      setPopoverCoords({ top, left, placeBelow });
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 80);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
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
    minWidth: hasImage ? `${capsuleWidth}px` : 'auto',
    width: hasImage ? `${capsuleWidth}px` : 'auto',
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
          className={`group relative overflow-hidden transition-all duration-200 border ${
            isLoading
              ? 'border-white/10 bg-white/5'
              : hasImage
              ? 'border-white/15 bg-black/40 hover:border-amber-400/50 shadow-sm hover:shadow-amber-500/10'
              : 'border-white/10 bg-white/5 hover:border-white/20'
          }`}
        >
          {/* Loading State: Shimmer Capsule */}
          {isLoading && (
            <span className="flex items-center gap-1.5 px-2 text-[10px] font-medium text-white/70 animate-shimmer whitespace-nowrap">
              <Sparkles className="w-2.5 h-2.5 text-amber-400 animate-pulse shrink-0" />
              <span className="truncate max-w-[80px]">{query}</span>
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
                <span className="absolute inset-0 flex items-center gap-1 px-2 text-[10px] text-white/50 animate-shimmer bg-white/5">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400/70 animate-pulse shrink-0" />
                  <span className="truncate max-w-[70px]">{query}</span>
                </span>
              )}
              <span className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
            </>
          )}

          {/* Fallback Badge (when image 404s, errors out, or not found) */}
          {(media.status === 'not-found' || imageError) && (
            <span className="flex items-center gap-1.5 px-2 text-[10px] font-medium text-amber-300/90 bg-amber-500/10 hover:bg-amber-500/20 transition-colors whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="truncate max-w-[120px]">{media.title || query}</span>
            </span>
          )}
        </motion.button>
      </span>

      {/* Portal-Mounted Hover Popover Card (Root-level Stacking Context, z-[99999]) */}
      {mounted && isHovered && popoverCoords && (media.status === 'loaded' || imageError) && typeof document !== 'undefined' &&
        createPortal(
          <motion.div
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
            className="w-72 p-3 rounded-xl bg-[#14161a] border border-white/20 shadow-2xl backdrop-blur-2xl pointer-events-auto text-left"
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
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
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20 shrink-0">
                wiki
              </span>
            </div>

            {/* Description */}
            {media.description && (
              <span className="block text-xs text-zinc-300 line-clamp-3 mb-2.5 leading-relaxed">
                {media.description}
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
                  className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Wikipedia
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
