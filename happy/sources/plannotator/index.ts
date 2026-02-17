/**
 * Plannotator - Plan review UI for Happy
 *
 * Usage:
 * ```tsx
 * import { PlannotatorModal } from '@/plannotator';
 *
 * <PlannotatorModal
 *   visible={showReview}
 *   onClose={() => setShowReview(false)}
 *   planMarkdown={planContent}
 *   sessionId={sessionId}
 *   onApprove={handleApprove}
 *   onSendFeedback={handleFeedback}
 * />
 * ```
 */

// Types
export * from './types';

// Parser
export { parseMarkdownToBlocks, exportDiff, extractFrontmatter } from './parser';
export type { Frontmatter } from './parser';

// Components
export { PlannotatorModal } from './components/PlannotatorModal';
export { PlanViewer } from './components/PlanViewer';
export { BlockRenderer } from './components/BlockRenderer';
export { CodeBlock } from './components/CodeBlock';
export { AnnotationToolbar } from './components/AnnotationToolbar';
export { AnnotationPanel } from './components/AnnotationPanel';
export { InlineMarkdown } from './components/InlineMarkdown';
export { TodoEditorModal } from './components/TodoEditorModal';
export type { TodoItem } from './components/TodoEditorModal';

// Hooks
export { useAnnotations, createAnnotation } from './hooks/useAnnotations';
export type { UseAnnotationsReturn } from './hooks/useAnnotations';

export { usePlanReview } from './hooks/usePlanReview';
export type { UsePlanReviewReturn, ReviewResult, PlanReviewOptions } from './hooks/usePlanReview';

export { useTextSelection } from './hooks/useTextSelection';
export type { UseTextSelectionReturn } from './hooks/useTextSelection';
