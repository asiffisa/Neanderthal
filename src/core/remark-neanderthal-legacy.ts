import type { Image, PhrasingContent, Root, Text } from 'mdast';
import { SKIP, visit } from 'unist-util-visit';
import {
  createNeanderthalMediaSource,
  parseLegacyMediaAlt,
} from './media-markdown';

const LEGACY_TEXT_PATTERN = /!\[media:([^\]\n]+)\](?!\()/g;

function pointAt(
  start: NonNullable<Text['position']>['start'],
  value: string,
  index: number
) {
  let line = start.line;
  let column = start.column;

  for (const character of value.slice(0, index)) {
    if (character === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return {
    line,
    column,
    offset: typeof start.offset === 'number' ? start.offset + index : undefined,
  };
}

function imageFromLegacyText(
  node: Text,
  raw: string,
  rawDescriptor: string,
  startIndex: number
): Image | Text {
  const descriptor = parseLegacyMediaAlt(`media:${rawDescriptor}`);
  if (!descriptor) {
    return { type: 'text', value: raw };
  }

  const position = node.position
    ? {
        start: pointAt(node.position.start, node.value, startIndex),
        end: pointAt(node.position.start, node.value, startIndex + raw.length),
      }
    : undefined;

  return {
    type: 'image',
    alt: descriptor.query,
    url: createNeanderthalMediaSource({
      vendorPreference: descriptor.vendorPreference,
    }),
    position,
  };
}

/**
 * Upgrade the original media marker after Markdown parsing.
 * Working on the syntax tree keeps examples inside inline/fenced code untouched.
 */
export function remarkNeanderthalLegacy() {
  return (tree: Root) => {
    visit(tree, 'image', (node) => {
      const descriptor = parseLegacyMediaAlt(node.alt);
      if (!descriptor) return;

      node.alt = descriptor.query;
      node.url = createNeanderthalMediaSource({
        vendorPreference: descriptor.vendorPreference,
        fallbackUrl: node.url,
      });
    });

    visit(tree, 'text', (node, index, parent) => {
      if (index === undefined || !parent || !node.value.includes('![media:')) {
        return;
      }

      const replacements: PhrasingContent[] = [];
      let cursor = 0;
      let match: RegExpExecArray | null;
      LEGACY_TEXT_PATTERN.lastIndex = 0;

      while ((match = LEGACY_TEXT_PATTERN.exec(node.value)) !== null) {
        if (match.index > cursor) {
          replacements.push({
            type: 'text',
            value: node.value.slice(cursor, match.index),
          });
        }

        replacements.push(
          imageFromLegacyText(node, match[0], match[1], match.index)
        );
        cursor = match.index + match[0].length;
      }

      if (cursor === 0) return;

      if (cursor < node.value.length) {
        replacements.push({
          type: 'text',
          value: node.value.slice(cursor),
        });
      }

      parent.children.splice(index, 1, ...replacements);
      return [SKIP, index + replacements.length];
    });
  };
}
