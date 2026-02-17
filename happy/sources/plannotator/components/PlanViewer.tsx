/**
 * PlanViewer - Main component for viewing and annotating a plan
 */

import React, { useMemo, useCallback, useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput, Modal, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { Block, Annotation, AnnotationType, EditorMode } from '../types';
import { BlockRenderer } from './BlockRenderer';
import { AnnotationToolbar } from './AnnotationToolbar';
import { useTextSelection } from '../hooks/useTextSelection';
import { createAnnotation } from '../hooks/useAnnotations';

interface PlanViewerProps {
  blocks: Block[];
  annotations: Annotation[];
  mode: EditorMode;
  onAddAnnotation: (annotation: Annotation) => void;
  onSelectAnnotation?: (id: string) => void;
  onCopy?: (content: string) => void;
}

export const PlanViewer: React.FC<PlanViewerProps> = ({
  blocks,
  annotations,
  mode,
  onAddAnnotation,
  onSelectAnnotation,
  onCopy,
}) => {
  const { theme } = useUnistyles();
  const { selection, toolbarPosition, isSelecting, handleLongPress, handleMouseUp, clearSelection } =
    useTextSelection();

  // Comment modal state
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentBlock, setCommentBlock] = useState<Block | null>(null);
  const [commentText, setCommentText] = useState('');

  // Get annotations for a specific block
  const getBlockAnnotations = useCallback(
    (blockId: string) => annotations.filter(a => a.blockId === blockId),
    [annotations]
  );

  // Handle creating annotation from selection
  const handleAnnotate = useCallback(
    (type: AnnotationType, text?: string) => {
      if (!selection) return;

      const newAnnotation = createAnnotation({
        blockId: selection.blockId,
        startOffset: selection.start,
        endOffset: selection.end,
        type,
        text,
        originalText: selection.text,
      });

      onAddAnnotation(newAnnotation);
      clearSelection();
    },
    [selection, onAddAnnotation, clearSelection]
  );

  // Handle copy from toolbar
  const handleToolbarCopy = useCallback(() => {
    if (selection && onCopy) {
      onCopy(selection.text);
    }
    clearSelection();
  }, [selection, onCopy, clearSelection]);

  // Copy entire plan
  const handleCopyPlan = useCallback(() => {
    const fullText = blocks.map(b => b.content).join('\n\n');
    onCopy?.(fullText);
  }, [blocks, onCopy]);

  // Check if block already has a deletion annotation
  const hasDeleteAnnotation = useCallback(
    (blockId: string) => annotations.some(a => a.blockId === blockId && a.type === AnnotationType.DELETION),
    [annotations]
  );

  // Submit comment for a block
  const handleSubmitComment = useCallback(() => {
    if (!commentBlock || !commentText.trim()) return;

    const newAnnotation = createAnnotation({
      blockId: commentBlock.id,
      startOffset: 0,
      endOffset: commentBlock.content.length,
      type: AnnotationType.COMMENT,
      text: commentText.trim(),
      originalText: commentBlock.content,
    });
    console.log('[PlanViewer] Creating comment annotation:', newAnnotation);
    onAddAnnotation(newAnnotation);

    // Reset modal state
    setCommentModalVisible(false);
    setCommentBlock(null);
    setCommentText('');
  }, [commentBlock, commentText, onAddAnnotation]);

  // Handle click on a block
  const handleBlockPress = useCallback(
    (block: Block) => {
      if (mode === 'redline') {
        // In redline mode, toggle deletion annotation
        const existingDeletion = annotations.find(
          a => a.blockId === block.id && a.type === AnnotationType.DELETION
        );
        if (existingDeletion) {
          // Remove existing deletion - need to expose removeAnnotation
          console.log('[PlanViewer] Block already marked for deletion, would remove');
        } else {
          // Add deletion annotation
          const newAnnotation = createAnnotation({
            blockId: block.id,
            startOffset: 0,
            endOffset: block.content.length,
            type: AnnotationType.DELETION,
            originalText: block.content,
          });
          console.log('[PlanViewer] Creating deletion annotation:', newAnnotation);
          onAddAnnotation(newAnnotation);
        }
      } else if (mode === 'selection') {
        // On web, check if user has text selected - if so, don't open modal
        if (Platform.OS === 'web') {
          const sel = window.getSelection();
          if (sel && !sel.isCollapsed && sel.toString().trim()) {
            // User has text selected, toolbar will appear - don't open modal
            return;
          }
        }
        // In selection mode, open comment modal for the block
        setCommentBlock(block);
        setCommentText('');
        setCommentModalVisible(true);
      }
    },
    [mode, annotations, onAddAnnotation]
  );

  // Long press on a block (for mobile Selection mode)
  const handleBlockLongPress = useCallback(
    (block: Block, event: any) => {
      if (mode === 'selection') {
        // In selection mode, show toolbar
        handleLongPress(block, event);
      }
    },
    [mode, handleLongPress]
  );

  // Mouse up on a block (for web Selection mode - text selection)
  const handleBlockMouseUp = useCallback(
    (block: Block, event: any) => {
      if (mode === 'selection') {
        // Check if there's a text selection
        handleMouseUp(block, event);
      }
    },
    [mode, handleMouseUp]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header buttons */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginBottom: 8,
          }}
        >
          {onCopy && (
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: theme.colors.surfaceHighest,
              }}
              onPress={handleCopyPlan}
            >
              <Ionicons name="copy-outline" size={14} color={theme.colors.textSecondary} />
              <Text
                style={{
                  marginLeft: 4,
                  fontSize: 12,
                  color: theme.colors.textSecondary,
                }}
              >
                Copy plan
              </Text>
            </Pressable>
          )}
        </View>

        {/* Render blocks */}
        {blocks.map((block, index) => (
          <View
            key={block.id}
            {...(Platform.OS === 'web'
              ? {
                  onMouseUp: (e: any) => handleBlockMouseUp(block, e),
                }
              : {})}
          >
            <Pressable
              onPress={() => handleBlockPress(block)}
              onLongPress={event => handleBlockLongPress(block, event)}
              delayLongPress={300}
              style={({ pressed }) => ({
                opacity: pressed && mode === 'redline' ? 0.7 : 1,
                cursor: mode === 'redline' ? 'pointer' : (mode === 'selection' ? 'text' : 'default'),
              } as any)}
            >
              <BlockRenderer
                block={block}
                annotations={getBlockAnnotations(block.id)}
                onCopy={onCopy}
              />
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {/* Annotation Toolbar (floating) */}
      {toolbarPosition && selection && (
        <AnnotationToolbar
          visible={isSelecting}
          position={toolbarPosition}
          selectedText={selection.text}
          onAnnotate={handleAnnotate}
          onCopy={handleToolbarCopy}
          onClose={clearSelection}
        />
      )}

      {/* Mode indicator */}
      <View
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor:
            mode === 'redline'
              ? theme.dark
                ? 'rgba(239, 68, 68, 0.3)'
                : '#fee2e2'
              : theme.dark
              ? 'rgba(245, 158, 11, 0.3)'
              : '#fef3c7',
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '500',
            color: mode === 'redline' ? '#dc2626' : '#d97706',
          }}
        >
          {mode === 'redline' ? '🔴 Redline Mode' : '✏️ Selection Mode'}
        </Text>
      </View>

      {/* Comment Modal */}
      <Modal
        visible={commentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setCommentModalVisible(false)}
        >
          <Pressable
            style={{
              width: '90%',
              maxWidth: 400,
              backgroundColor: theme.colors.surface,
              borderRadius: 12,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
            onPress={e => e.stopPropagation()}
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

            {/* Show block content preview */}
            {commentBlock && (
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.textSecondary,
                  marginBottom: 12,
                  fontStyle: 'italic',
                }}
                numberOfLines={2}
              >
                On: "{commentBlock.content.slice(0, 100)}
                {commentBlock.content.length > 100 ? '...' : ''}"
              </Text>
            )}

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme.colors.divider,
                borderRadius: 8,
                padding: 12,
                minHeight: 80,
                fontSize: 14,
                color: theme.colors.text,
                backgroundColor: theme.colors.surfaceHighest,
                textAlignVertical: 'top',
              }}
              placeholder="Enter your comment..."
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
                marginTop: 16,
                gap: 12,
              }}
            >
              <Pressable
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: theme.colors.surfaceHighest,
                }}
                onPress={() => setCommentModalVisible(false)}
              >
                <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
              </Pressable>

              <Pressable
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: commentText.trim() ? theme.colors.textLink : theme.colors.surfaceHighest,
                  opacity: commentText.trim() ? 1 : 0.5,
                }}
                onPress={handleSubmitComment}
                disabled={!commentText.trim()}
              >
                <Text style={{ color: commentText.trim() ? '#fff' : theme.colors.textSecondary, fontWeight: '500' }}>
                  Add Comment
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};
