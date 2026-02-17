/**
 * AnnotationToolbar - Floating toolbar for annotation actions
 */

import React from 'react';
import { View, Text, Pressable, TextInput, Modal } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { AnnotationType, ToolbarPosition } from '../types';

interface AnnotationToolbarProps {
  visible: boolean;
  position: ToolbarPosition;
  selectedText: string;
  onAnnotate: (type: AnnotationType, text?: string) => void;
  onCopy?: () => void;
  onClose: () => void;
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  visible,
  position,
  selectedText,
  onAnnotate,
  onCopy,
  onClose,
}) => {
  const { theme } = useUnistyles();
  const [showCommentInput, setShowCommentInput] = React.useState(false);
  const [commentText, setCommentText] = React.useState('');

  if (!visible) return null;

  const handleComment = () => {
    setShowCommentInput(true);
  };

  const submitComment = () => {
    if (commentText.trim()) {
      onAnnotate(AnnotationType.COMMENT, commentText.trim());
    }
    setCommentText('');
    setShowCommentInput(false);
  };

  const cancelComment = () => {
    setCommentText('');
    setShowCommentInput(false);
  };

  const buttonStyle = {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  };

  const buttonTextStyle = {
    fontSize: 13,
    color: theme.colors.text,
  };

  return (
    <>
      {/* Main toolbar */}
      <View
        style={{
          position: 'absolute',
          left: Math.max(16, position.x - 100),
          top: Math.max(60, position.y),
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          flexDirection: 'row',
          shadowColor: theme.colors.shadow.color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.colors.shadow.opacity * 2,
          shadowRadius: 12,
          elevation: 8,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          zIndex: 1000,
        }}
      >
        {/* Delete */}
        <Pressable
          style={buttonStyle}
          onPress={() => onAnnotate(AnnotationType.DELETION)}
        >
          <Ionicons name="trash-outline" size={16} color={theme.colors.deleteAction} />
          <Text style={[buttonTextStyle, { color: theme.colors.deleteAction }]}>
            Delete
          </Text>
        </Pressable>

        <View style={{ width: 1, backgroundColor: theme.colors.divider }} />

        {/* Comment */}
        <Pressable style={buttonStyle} onPress={handleComment}>
          <Ionicons name="chatbubble-outline" size={16} color="#f59e0b" />
          <Text style={[buttonTextStyle, { color: '#f59e0b' }]}>Comment</Text>
        </Pressable>

        <View style={{ width: 1, backgroundColor: theme.colors.divider }} />

        {/* Copy */}
        {onCopy && (
          <>
            <Pressable style={buttonStyle} onPress={onCopy}>
              <Ionicons name="copy-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[buttonTextStyle, { color: theme.colors.textSecondary }]}>
                Copy
              </Text>
            </Pressable>
            <View style={{ width: 1, backgroundColor: theme.colors.divider }} />
          </>
        )}

        {/* Close */}
        <Pressable style={buttonStyle} onPress={onClose}>
          <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      {/* Comment input modal */}
      <Modal visible={showCommentInput} transparent animationType="fade">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          onPress={cancelComment}
        >
          <Pressable
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 16,
              width: '100%',
              maxWidth: 400,
            }}
            onPress={() => {}}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.colors.text,
                marginBottom: 8,
              }}
            >
              Add Comment
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: theme.colors.textSecondary,
                marginBottom: 12,
                fontStyle: 'italic',
              }}
              numberOfLines={2}
            >
              "{selectedText.slice(0, 100)}{selectedText.length > 100 ? '...' : ''}"
            </Text>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme.colors.divider,
                borderRadius: 8,
                padding: 12,
                fontSize: 15,
                color: theme.colors.text,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
              placeholder="Your feedback..."
              placeholderTextColor={theme.colors.textSecondary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              autoFocus
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                marginTop: 12,
                gap: 8,
              }}
            >
              <Pressable
                onPress={cancelComment}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: theme.colors.surfaceHighest,
                }}
              >
                <Text style={{ color: theme.colors.text }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={submitComment}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: '#f59e0b',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Add Comment</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
