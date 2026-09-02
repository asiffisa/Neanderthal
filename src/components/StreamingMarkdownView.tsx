'use client';

import React, { memo } from 'react';
import { CapsuleSettings, ResolvedMedia } from '../core/types';
import { tokenizeStreamingMarkdown } from '../core/tokenizer';
import { InlineCapsule } from './InlineCapsule';

interface StreamingMarkdownViewProps {
  content: string;
  isStreaming?: boolean;
  settings: CapsuleSettings;
  onInspect?: (media: ResolvedMedia) => void;
  className?: string;
}

export const StreamingMarkdownView: React.FC<StreamingMarkdownViewProps> = memo(({
  content,
  isStreaming = false,
  settings,
  onInspect,
  className = '',
}) => {
  if (!content) {
    return null;
  }

  // Split into paragraphs by double newlines
  const paragraphs = content.split(/\n\n+/);

  const renderInlineContent = (lineText: string) => {
    // 1. Tokenize media tokens
    const tokens = tokenizeStreamingMarkdown(lineText, isStreaming);

    return tokens.map((token, idx) => {
      if (token.type === 'media') {
        return (
          <InlineCapsule
            key={token.id || `token-${idx}`}
            query={token.query}
            fallbackUrl={token.fallbackUrl}
            isPartial={token.isPartial}
            settings={settings}
            onInspect={onInspect}
          />
        );
      }

      // Format lightweight markdown styles like **bold** and *italic*
      return (
        <span key={`text-${idx}`} className="inline">
          {renderFormattedText(token.content)}
        </span>
      );
    });
  };

  const renderFormattedText = (raw: string) => {
    // Basic bold **text** parsing
    const parts = raw.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className={`space-y-4 text-[16px] leading-[1.7] text-zinc-200 font-normal ${className}`}>
      {paragraphs.map((paragraph, pIdx) => {
        const trimmed = paragraph.trim();

        // Heading 3
        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={`p-${pIdx}`}
              className="text-xl font-bold tracking-tight text-white mt-6 mb-2 border-b border-white/10 pb-1"
            >
              {renderInlineContent(trimmed.replace(/^###\s+/, ''))}
            </h3>
          );
        }

        // Heading 2
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={`p-${pIdx}`}
              className="text-2xl font-bold tracking-tight text-white mt-8 mb-3"
            >
              {renderInlineContent(trimmed.replace(/^##\s+/, ''))}
            </h2>
          );
        }

        // Bullet point line
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const lines = paragraph.split('\n');
          return (
            <ul key={`ul-${pIdx}`} className="list-disc list-inside space-y-1 pl-2">
              {lines.map((line, lIdx) => {
                const itemText = line.replace(/^[-*]\s+/, '');
                return <li key={`li-${lIdx}`}>{renderInlineContent(itemText)}</li>;
              })}
            </ul>
          );
        }

        // Standard prose paragraph
        return (
          <div key={`p-${pIdx}`} className="break-words">
            {renderInlineContent(paragraph)}
          </div>
        );
      })}

      {/* Streaming cursor */}
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse align-middle rounded-sm" />
      )}
    </div>
  );
});
