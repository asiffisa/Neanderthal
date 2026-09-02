'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Sparkles } from 'lucide-react';
import { ResolvedMedia } from '../core/types';

interface MediaLightboxProps {
  media: ResolvedMedia | null;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({ media, onClose }) => {
  if (!media) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111317] border border-white/15 shadow-2xl z-10 flex flex-col"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-semibold text-white truncate max-w-sm">
                {media.title || media.query}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Media Presentation */}
          {media.thumbnailUrl && (
            <div className="relative w-full max-h-[420px] bg-black/80 flex items-center justify-center overflow-hidden border-b border-white/10">
              <img
                src={media.fullImageUrl || media.thumbnailUrl}
                alt={media.title}
                className="max-h-[420px] w-auto max-w-full object-contain"
              />
            </div>
          )}

          {/* Content & Metadata */}
          <div className="p-5 space-y-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90 font-medium">
                Query Token
              </span>
              <p className="font-mono text-xs text-zinc-300 bg-black/40 px-2.5 py-1.5 rounded-md border border-white/10 mt-1 inline-block">
                ![media:{media.query}]
              </p>
            </div>

            {media.description && (
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-medium">
                  Summary / Context
                </span>
                <p className="text-sm text-zinc-200 mt-1 leading-relaxed">
                  {media.description}
                </p>
              </div>
            )}

            {media.sourceUrl && (
              <div className="pt-2 flex justify-end">
                <a
                  href={media.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium text-white transition-colors border border-white/10"
                >
                  Read Full Article on Wikipedia
                  <ExternalLink className="w-4 h-4 text-amber-400" />
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
