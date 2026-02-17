/**
 * CodeBlock - Syntax highlighted code block
 */

import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { Block } from '../types';

interface CodeBlockProps {
  block: Block;
  onCopy?: (content: string) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ block, onCopy }) => {
  const { theme } = useUnistyles();

  const handleCopy = () => {
    onCopy?.(block.content);
  };

  return (
    <View
      style={{
        backgroundColor: theme.dark ? '#1e1e1e' : '#f6f8fa',
        borderRadius: 8,
        marginVertical: 8,
        overflow: 'hidden',
      }}
    >
      {/* Header with language and copy button */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: theme.dark ? '#2d2d2d' : '#e8e8e8',
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: theme.colors.textSecondary,
            fontFamily: 'monospace',
          }}
        >
          {block.language || 'code'}
        </Text>

        {onCopy && (
          <Pressable onPress={handleCopy} hitSlop={10}>
            <Ionicons name="copy-outline" size={16} color={theme.colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Code content */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            lineHeight: 20,
            color: theme.colors.text,
            padding: 12,
          }}
          selectable
        >
          {block.content}
        </Text>
      </ScrollView>
    </View>
  );
};
