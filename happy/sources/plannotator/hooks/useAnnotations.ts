/**
 * useAnnotations - State management for plan annotations
 */

import { useCallback, useMemo, useState } from 'react';
import { Annotation, AnnotationType } from '../types';

export interface UseAnnotationsReturn {
  annotations: Annotation[];
  addAnnotation: (annotation: Annotation) => void;
  removeAnnotation: (id: string) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  clearAnnotations: () => void;
  annotationCount: number;
  getAnnotationsForBlock: (blockId: string) => Annotation[];
}

/**
 * Helper to create a new annotation with generated ID and timestamp.
 */
export function createAnnotation(params: {
  blockId: string;
  type: AnnotationType;
  originalText: string;
  startOffset: number;
  endOffset: number;
  text?: string;
  author?: string;
  imagePaths?: string[];
}): Annotation {
  return {
    id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    blockId: params.blockId,
    type: params.type,
    originalText: params.originalText,
    startOffset: params.startOffset,
    endOffset: params.endOffset,
    text: params.text,
    author: params.author,
    imagePaths: params.imagePaths,
    createdAt: Date.now(),
  };
}

/**
 * Hook for managing annotations state.
 */
export function useAnnotations(initialAnnotations?: Annotation[]): UseAnnotationsReturn {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations || []);

  const addAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations(prev => [...prev, annotation]);
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev =>
      prev.map(a => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  const annotationCount = useMemo(() => annotations.length, [annotations]);

  const getAnnotationsForBlock = useCallback(
    (blockId: string) => annotations.filter(a => a.blockId === blockId),
    [annotations]
  );

  return {
    annotations,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    clearAnnotations,
    annotationCount,
    getAnnotationsForBlock,
  };
}
