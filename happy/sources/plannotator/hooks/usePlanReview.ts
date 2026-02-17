/**
 * usePlanReview - Handle plan review actions (approve/deny/feedback)
 */

import { useCallback, useState } from 'react';
import { sync } from '@/sync/sync';
import { Block, Annotation } from '../types';
import { exportDiff } from '../parser';

export interface ReviewResult {
  success: boolean;
  feedback?: string;
  error?: string;
}

export interface UsePlanReviewReturn {
  isSubmitting: boolean;
  approve: () => Promise<ReviewResult>;
  deny: (reason?: string) => Promise<ReviewResult>;
  sendFeedback: (blocks: Block[], annotations: Annotation[]) => Promise<ReviewResult>;
}

export interface PlanReviewOptions {
  sessionId: string;
}

/**
 * Hook for handling plan review actions.
 */
export function usePlanReview({ sessionId }: PlanReviewOptions): UsePlanReviewReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approve = useCallback(async (): Promise<ReviewResult> => {
    setIsSubmitting(true);
    try {
      // Send approval message to Claude via sync
      sync.sendMessage(sessionId, 'I approve this plan. Please proceed with the implementation.');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve plan',
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionId]);

  const deny = useCallback(async (reason?: string): Promise<ReviewResult> => {
    setIsSubmitting(true);
    try {
      const message = reason
        ? `I don't approve this plan. Reason: ${reason}`
        : 'I don\'t approve this plan. Please revise it.';
      sync.sendMessage(sessionId, message);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deny plan',
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionId]);

  const sendFeedback = useCallback(
    async (blocks: Block[], annotations: Annotation[]): Promise<ReviewResult> => {
      setIsSubmitting(true);
      try {
        const feedback = exportDiff(blocks, annotations);
        sync.sendMessage(sessionId, feedback);
        return { success: true, feedback };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send feedback',
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    [sessionId]
  );

  return {
    isSubmitting,
    approve,
    deny,
    sendFeedback,
  };
}
