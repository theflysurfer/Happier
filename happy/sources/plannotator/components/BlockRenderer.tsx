/**
 * BlockRenderer - Renders a single markdown block with annotation highlights
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Block, Annotation, AnnotationType } from '../types';
import { CodeBlock } from './CodeBlock';
import { InlineMarkdown } from './InlineMarkdown';

interface BlockRendererProps {
  block: Block;
  annotations: Annotation[];
  onCopy?: (content: string) => void;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  annotations,
  onCopy,
}) => {
  const { theme } = useUnistyles();

  // Get highlight color for annotation type
  const getHighlightColor = (type: AnnotationType) => {
    switch (type) {
      case AnnotationType.DELETION:
        return theme.dark ? 'rgba(239, 68, 68, 0.3)' : '#fee2e2';
      case AnnotationType.INSERTION:
        return theme.dark ? 'rgba(34, 197, 94, 0.3)' : '#dcfce7';
      case AnnotationType.REPLACEMENT:
        return theme.dark ? 'rgba(99, 102, 241, 0.3)' : '#e0e7ff';
      case AnnotationType.COMMENT:
        return theme.dark ? 'rgba(245, 158, 11, 0.3)' : '#fef3c7';
      default:
        return 'transparent';
    }
  };

  // Check if block has any annotations
  const hasAnnotation = annotations.length > 0;
  const blockBackground = hasAnnotation
    ? getHighlightColor(annotations[0].type)
    : 'transparent';

  // Heading
  if (block.type === 'heading') {
    const fontSize = { 1: 24, 2: 20, 3: 18, 4: 16, 5: 14, 6: 13 }[block.level || 1] || 16;
    return (
      <View
        style={{
          backgroundColor: blockBackground,
          marginTop: 16,
          marginBottom: 8,
          borderRadius: 4,
          paddingHorizontal: hasAnnotation ? 4 : 0,
        }}
      >
        <Text
          style={{
            fontSize,
            fontWeight: '700',
            color: theme.colors.text,
          }}
          selectable
        >
          {block.content}
        </Text>
      </View>
    );
  }

  // Code block
  if (block.type === 'code') {
    return (
      <View style={{ backgroundColor: blockBackground, borderRadius: 8 }}>
        <CodeBlock block={block} onCopy={onCopy} />
      </View>
    );
  }

  // List item
  if (block.type === 'list-item') {
    const indent = (block.level || 0) * 16;
    const bullet =
      block.checked !== undefined ? (block.checked ? '☑' : '☐') : '•';

    return (
      <View
        style={{
          flexDirection: 'row',
          marginLeft: indent,
          marginVertical: 4,
          backgroundColor: blockBackground,
          borderRadius: 4,
          paddingHorizontal: hasAnnotation ? 4 : 0,
        }}
      >
        <Text
          style={{
            marginRight: 8,
            color: theme.colors.textSecondary,
          }}
        >
          {bullet}
        </Text>
        <View style={{ flex: 1 }}>
          <InlineMarkdown
            text={block.content}
            style={{ color: theme.colors.text, fontSize: 15, lineHeight: 22 }}
          />
        </View>
      </View>
    );
  }

  // Blockquote
  if (block.type === 'blockquote') {
    return (
      <View
        style={{
          borderLeftWidth: 3,
          borderLeftColor: theme.colors.textLink,
          paddingLeft: 12,
          marginVertical: 8,
          backgroundColor: blockBackground,
          borderRadius: 4,
        }}
      >
        <Text
          style={{
            fontStyle: 'italic',
            color: theme.colors.textSecondary,
            fontSize: 15,
            lineHeight: 22,
          }}
          selectable
        >
          {block.content}
        </Text>
      </View>
    );
  }

  // Horizontal rule
  if (block.type === 'hr') {
    return (
      <View
        style={{
          height: 1,
          backgroundColor: theme.colors.divider,
          marginVertical: 16,
        }}
      />
    );
  }

  // Table
  if (block.type === 'table') {
    const lines = block.content.split('\n').filter(l => l.trim());
    const rows = lines.map(line =>
      line
        .split('|')
        .filter(cell => cell.trim())
        .map(cell => cell.trim())
    );

    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.divider,
          borderRadius: 8,
          marginVertical: 8,
          overflow: 'hidden',
          backgroundColor: blockBackground,
        }}
      >
        {rows.map((row, rowIndex) => {
          // Skip separator row (----)
          if (row.every(cell => /^[-:]+$/.test(cell))) return null;

          const isHeader = rowIndex === 0;
          return (
            <View
              key={rowIndex}
              style={{
                flexDirection: 'row',
                backgroundColor: isHeader
                  ? theme.dark
                    ? '#2d2d2d'
                    : '#f0f0f0'
                  : 'transparent',
                borderBottomWidth: rowIndex < rows.length - 1 ? 1 : 0,
                borderBottomColor: theme.colors.divider,
              }}
            >
              {row.map((cell, cellIndex) => (
                <Text
                  key={cellIndex}
                  style={{
                    flex: 1,
                    padding: 8,
                    fontSize: 13,
                    fontWeight: isHeader ? '600' : '400',
                    color: theme.colors.text,
                    borderRightWidth: cellIndex < row.length - 1 ? 1 : 0,
                    borderRightColor: theme.colors.divider,
                  }}
                  selectable
                >
                  {cell}
                </Text>
              ))}
            </View>
          );
        })}
      </View>
    );
  }

  // Default: paragraph
  return (
    <View
      style={{
        marginVertical: 8,
        backgroundColor: blockBackground,
        borderRadius: 4,
        paddingHorizontal: hasAnnotation ? 4 : 0,
      }}
    >
      <InlineMarkdown
        text={block.content}
        style={{ color: theme.colors.text, fontSize: 15, lineHeight: 22 }}
      />
    </View>
  );
};
