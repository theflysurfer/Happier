/**
 * InlineMarkdown - Renders inline markdown (bold, italic, code, links)
 */

import React, { useMemo } from 'react';
import { Text, TextStyle } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

interface InlineMarkdownProps {
  text: string;
  style?: TextStyle;
}

interface ParsedSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  link?: string;
}

function parseInlineMarkdown(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let remaining = text;

  // Patterns for inline markdown
  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, type: 'bold' as const },
    { regex: /__(.+?)__/g, type: 'bold' as const },
    { regex: /\*(.+?)\*/g, type: 'italic' as const },
    { regex: /_(.+?)_/g, type: 'italic' as const },
    { regex: /`(.+?)`/g, type: 'code' as const },
    { regex: /\[(.+?)\]\((.+?)\)/g, type: 'link' as const },
  ];

  // Simple approach: find matches and split
  // For a production app, use a proper parser
  let lastIndex = 0;

  // Find all code segments first (they shouldn't have other formatting)
  const codeRegex = /`([^`]+)`/g;
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const italicRegex = /\*([^*]+)\*/g;

  // Simple linear parse
  let match;
  const allMatches: Array<{ start: number; end: number; text: string; type: 'bold' | 'italic' | 'code' }> = [];

  // Code
  while ((match = codeRegex.exec(text)) !== null) {
    allMatches.push({ start: match.index, end: match.index + match[0].length, text: match[1], type: 'code' });
  }

  // Bold
  while ((match = boldRegex.exec(text)) !== null) {
    // Check if inside code
    const isInCode = allMatches.some(m => m.type === 'code' && match!.index >= m.start && match!.index < m.end);
    if (!isInCode) {
      allMatches.push({ start: match.index, end: match.index + match[0].length, text: match[1], type: 'bold' });
    }
  }

  // Italic (single asterisk, but not inside bold or code)
  const singleAsteriskRegex = /(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g;
  while ((match = singleAsteriskRegex.exec(text)) !== null) {
    const isInOther = allMatches.some(m => match!.index >= m.start && match!.index < m.end);
    if (!isInOther) {
      allMatches.push({ start: match.index, end: match.index + match[0].length, text: match[1], type: 'italic' });
    }
  }

  // Sort by position
  allMatches.sort((a, b) => a.start - b.start);

  // Build segments
  let pos = 0;
  for (const m of allMatches) {
    if (m.start > pos) {
      segments.push({ text: text.slice(pos, m.start) });
    }
    segments.push({ text: m.text, [m.type]: true });
    pos = m.end;
  }

  if (pos < text.length) {
    segments.push({ text: text.slice(pos) });
  }

  if (segments.length === 0) {
    segments.push({ text });
  }

  return segments;
}

export const InlineMarkdown: React.FC<InlineMarkdownProps> = ({ text, style }) => {
  const { theme } = useUnistyles();

  const segments = useMemo(() => parseInlineMarkdown(text), [text]);

  return (
    <Text style={style}>
      {segments.map((segment, index) => {
        const segmentStyle: TextStyle = {};

        if (segment.bold) {
          segmentStyle.fontWeight = '700';
        }
        if (segment.italic) {
          segmentStyle.fontStyle = 'italic';
        }
        if (segment.code) {
          segmentStyle.fontFamily = 'monospace';
          segmentStyle.backgroundColor = theme.colors.surfaceHighest;
          segmentStyle.paddingHorizontal = 4;
          segmentStyle.borderRadius = 3;
        }

        return (
          <Text key={index} style={segmentStyle}>
            {segment.text}
          </Text>
        );
      })}
    </Text>
  );
};
