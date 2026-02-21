/**
 * PlannotatorModal - Full-screen modal for plan review and file annotation
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { parseMarkdownToBlocks, exportDiff } from '../parser';
import { EditorMode, PlannotatorMode, AnnotationType, ReviewTag } from '../types';
import { PlanViewer } from './PlanViewer';
import { AnnotationPanel } from './AnnotationPanel';
import { ReviewTagPicker } from './ReviewTagPicker';
import { useAnnotations, createAnnotation } from '../hooks/useAnnotations';
import { usePlanReview } from '../hooks/usePlanReview';
import { t } from '@/text';
import type { Annotation } from '../types';

interface PlannotatorModalProps {
  visible: boolean;
  onClose: () => void;
  planMarkdown: string;
  sessionId: string;
  mode?: PlannotatorMode;
  initialAnnotations?: Annotation[];
  onApprove?: () => void;
  onSendFeedback?: (feedback: string) => void;
  onSaveAnnotations?: (annotations: Annotation[]) => void;
}

// Breakpoint for responsive layout
const MOBILE_BREAKPOINT = 768;

export const PlannotatorModal: React.FC<PlannotatorModalProps> = ({
  visible,
  onClose,
  planMarkdown,
  sessionId,
  mode: plannotatorMode = 'plan',
  initialAnnotations,
  onApprove,
  onSendFeedback,
  onSaveAnnotations,
}) => {
  const { theme } = useUnistyles();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Responsive layout: side panel on web/wide screens, bottom panel on mobile/narrow
  const isWideScreen = Platform.OS === 'web' || screenWidth >= MOBILE_BREAKPOINT;
  const panelWidth = isWideScreen ? Math.min(350, screenWidth * 0.35) : screenWidth;
  const panelHeight = isWideScreen ? undefined : 250;

  // State
  const [editorMode, setEditorMode] = useState<EditorMode>('selection');
  const [showPanel, setShowPanel] = useState(true);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [pendingTags, setPendingTags] = useState<ReviewTag[]>([]);
  const [pendingMacro, setPendingMacro] = useState(false);
  const [globalCommentVisible, setGlobalCommentVisible] = useState(false);
  const [globalCommentText, setGlobalCommentText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Parse markdown into blocks
  const blocks = useMemo(() => {
    return parseMarkdownToBlocks(planMarkdown);
  }, [planMarkdown]);

  // Annotations state
  const { annotations, addAnnotation, removeAnnotation, updateAnnotation, annotationCount } = useAnnotations(initialAnnotations);

  // Review actions (only used in plan mode)
  const { isSubmitting, approve, sendFeedback } = usePlanReview({ sessionId });

  // Handle approve (plan mode only)
  const handleApprove = useCallback(async () => {
    await approve();
    onApprove?.();
    onClose();
  }, [approve, onApprove, onClose]);

  // Handle send feedback (plan mode only)
  const handleSendFeedback = useCallback(async () => {
    const result = await sendFeedback(blocks, annotations);
    onSendFeedback?.(result.feedback || '');
    onClose();
  }, [sendFeedback, blocks, annotations, onSendFeedback, onClose]);

  // Handle save annotations (file mode only)
  const handleSaveAnnotations = useCallback(() => {
    onSaveAnnotations?.(annotations);
    onClose();
  }, [annotations, onSaveAnnotations, onClose]);

  // Handle close with save prompt in file mode
  const handleClose = useCallback(() => {
    if (plannotatorMode === 'file' && annotationCount > 0) {
      onSaveAnnotations?.(annotations);
    }
    onClose();
  }, [plannotatorMode, annotationCount, annotations, onSaveAnnotations, onClose]);

  // Tag picker handlers
  const handleToggleTag = useCallback((tag: ReviewTag) => {
    setPendingTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  // Apply tags to selected annotation
  const handleApplyTags = useCallback(() => {
    if (selectedAnnotationId) {
      updateAnnotation(selectedAnnotationId, {
        tags: pendingTags,
        isMacro: pendingMacro,
      });
    }
    setShowTagPicker(false);
  }, [selectedAnnotationId, pendingTags, pendingMacro, updateAnnotation]);

  // Open tag picker for selected annotation
  const openTagPicker = useCallback(() => {
    if (selectedAnnotationId) {
      const ann = annotations.find(a => a.id === selectedAnnotationId);
      setPendingTags(ann?.tags || []);
      setPendingMacro(ann?.isMacro || false);
      setShowTagPicker(true);
    }
  }, [selectedAnnotationId, annotations]);

  // Copy to clipboard
  const handleCopy = useCallback(async (content: string) => {
    await Clipboard.setStringAsync(content);
  }, []);

  // Copy annotation summary to clipboard
  const handleCopySummary = useCallback(async () => {
    const summary = exportDiff(blocks, annotations);
    await Clipboard.setStringAsync(summary);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }, [blocks, annotations]);

  // Submit global comment
  const handleSubmitGlobalComment = useCallback(() => {
    if (!globalCommentText.trim()) return;
    const annotation = createAnnotation({
      blockId: 'global',
      startOffset: 0,
      endOffset: 0,
      type: AnnotationType.GLOBAL_COMMENT,
      text: globalCommentText.trim(),
      originalText: '',
    });
    addAnnotation(annotation);
    setGlobalCommentVisible(false);
    setGlobalCommentText('');
  }, [globalCommentText, addAnnotation]);

  // Toggle mode
  const toggleMode = useCallback(() => {
    setEditorMode(m => (m === 'selection' ? 'redline' : 'selection'));
  }, []);

  const isPlanMode = plannotatorMode === 'plan';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.colors.surface, paddingTop: insets.top }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={handleClose} style={{ padding: 4 }}>
              <Text style={{ fontSize: 16, color: theme.colors.textLink }}>
                {t('common.cancel')}
              </Text>
            </Pressable>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.colors.text,
                marginLeft: 12,
              }}
            >
              {isPlanMode ? t('plannotator.reviewPlan') : t('annotations.title')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Tag button */}
            {selectedAnnotationId && (
              <Pressable
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: theme.colors.surfaceHighest,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                }}
                onPress={openTagPicker}
              >
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {t('annotations.addTag')}
                </Text>
              </Pressable>
            )}

            {/* Mode toggle */}
            <Pressable
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor:
                  editorMode === 'redline'
                    ? theme.dark
                      ? 'rgba(239, 68, 68, 0.3)'
                      : '#fee2e2'
                    : theme.colors.surfaceHighest,
                borderWidth: 1,
                borderColor: editorMode === 'redline' ? '#ef4444' : theme.colors.divider,
              }}
              onPress={toggleMode}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: editorMode === 'redline' ? '#dc2626' : theme.colors.textSecondary,
                  fontWeight: editorMode === 'redline' ? '500' : '400',
                }}
              >
                {editorMode === 'redline' ? t('plannotator.redline') : t('plannotator.select')}
              </Text>
            </Pressable>

            {/* Panel toggle */}
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: theme.colors.surfaceHighest,
                borderWidth: 1,
                borderColor: theme.colors.divider,
              }}
              onPress={() => setShowPanel(p => !p)}
            >
              <Ionicons
                name={showPanel
                  ? (isWideScreen ? 'chevron-forward' : 'chevron-down')
                  : (isWideScreen ? 'chevron-back' : 'chevron-up')
                }
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.textSecondary,
                  marginLeft: 4,
                }}
              >
                {t('plannotator.panel')}
              </Text>
              {annotationCount > 0 && (
                <View
                  style={{
                    backgroundColor: theme.colors.textLink,
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    marginLeft: 6,
                  }}
                >
                  <Text style={{ fontSize: 10, color: '#fff', fontWeight: '600' }}>
                    {annotationCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Content area - responsive layout */}
        <View style={{ flex: 1, flexDirection: isWideScreen ? 'row' : 'column' }}>
          {/* Plan viewer - main content */}
          <View style={{ flex: 1 }}>
            <PlanViewer
              blocks={blocks}
              annotations={annotations}
              mode={editorMode}
              onAddAnnotation={addAnnotation}
              onRemoveAnnotation={removeAnnotation}
              onSelectAnnotation={setSelectedAnnotationId}
              onCopy={handleCopy}
            />
          </View>

          {/* Annotation panel - right on web, bottom on mobile */}
          {showPanel && (
            <View
              style={{
                ...(isWideScreen
                  ? {
                      width: panelWidth,
                      borderLeftWidth: 1,
                      borderLeftColor: theme.colors.divider,
                    }
                  : {
                      height: panelHeight,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.divider,
                    }),
                backgroundColor: theme.colors.surface,
              }}
            >
              <AnnotationPanel
                annotations={annotations}
                selectedId={selectedAnnotationId}
                onSelect={setSelectedAnnotationId}
                onDelete={removeAnnotation}
              />
            </View>
          )}
        </View>

        {/* Footer with action buttons */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12 + insets.bottom,
            borderTopWidth: 1,
            borderTopColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
            gap: 12,
          }}
        >
            {/* Global Comment button */}
          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: theme.dark ? 'rgba(139, 92, 246, 0.3)' : '#ede9fe',
            }}
            onPress={() => { setGlobalCommentText(''); setGlobalCommentVisible(true); }}
          >
            <Ionicons name="earth-outline" size={16} color="#8b5cf6" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#8b5cf6' }}>
              {t('plannotator.globalComment')}
            </Text>
          </Pressable>

          {/* Copy Summary button */}
          {annotationCount > 0 && (
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: theme.colors.surfaceHighest,
              }}
              onPress={handleCopySummary}
            >
              <Ionicons
                name={copyFeedback ? 'checkmark-circle' : 'clipboard-outline'}
                size={16}
                color={copyFeedback ? theme.colors.success : theme.colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={{ fontSize: 14, fontWeight: '500', color: copyFeedback ? theme.colors.success : theme.colors.textSecondary }}>
                {copyFeedback ? t('common.copied') : t('plannotator.copySummary')}
              </Text>
            </Pressable>
          )}

          {isPlanMode ? (
            <>
              {/* Send Feedback button */}
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor:
                    isSubmitting || annotationCount === 0
                      ? theme.colors.surfaceHighest
                      : theme.dark
                      ? 'rgba(245, 158, 11, 0.3)'
                      : '#fef3c7',
                  opacity: isSubmitting || annotationCount === 0 ? 0.5 : 1,
                }}
                onPress={handleSendFeedback}
                disabled={isSubmitting || annotationCount === 0}
              >
                {isSubmitting && (
                  <ActivityIndicator
                    size="small"
                    color="#d97706"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#d97706' }}>
                  {t('plannotator.sendFeedback')} ({annotationCount})
                </Text>
              </Pressable>

              {/* Approve button */}
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: theme.colors.success,
                  opacity: isSubmitting ? 0.5 : 1,
                }}
                onPress={handleApprove}
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#fff' }}>
                  {t('plannotator.approve')}
                </Text>
              </Pressable>
            </>
          ) : (
            /* Save Annotations button (file mode) */
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: theme.colors.textLink,
              }}
              onPress={handleSaveAnnotations}
            >
              <Ionicons name="save-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#fff' }}>
                {t('annotations.saveAnnotations')} ({annotationCount})
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Tag picker modal */}
      <ReviewTagPicker
        visible={showTagPicker}
        selectedTags={pendingTags}
        isMacro={pendingMacro}
        onToggleTag={handleToggleTag}
        onToggleMacro={setPendingMacro}
        onClose={handleApplyTags}
      />

      {/* Global Comment modal */}
      <Modal
        visible={globalCommentVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGlobalCommentVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setGlobalCommentVisible(false)}
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
                marginBottom: 12,
              }}
            >
              {t('plannotator.globalComment')}
            </Text>

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
              placeholder={t('plannotator.enterComment')}
              placeholderTextColor={theme.colors.textSecondary}
              value={globalCommentText}
              onChangeText={setGlobalCommentText}
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
                onPress={() => setGlobalCommentVisible(false)}
              >
                <Text style={{ color: theme.colors.textSecondary }}>
                  {t('common.cancel')}
                </Text>
              </Pressable>

              <Pressable
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: globalCommentText.trim() ? '#8b5cf6' : theme.colors.surfaceHighest,
                  opacity: globalCommentText.trim() ? 1 : 0.5,
                }}
                onPress={handleSubmitGlobalComment}
                disabled={!globalCommentText.trim()}
              >
                <Text style={{ color: globalCommentText.trim() ? '#fff' : theme.colors.textSecondary, fontWeight: '500' }}>
                  {t('plannotator.addComment')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
};
