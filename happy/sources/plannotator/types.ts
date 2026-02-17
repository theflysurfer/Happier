/**
 * Plannotator - Type definitions for plan annotations
 */

export enum AnnotationType {
  DELETION = 'DELETION',
  INSERTION = 'INSERTION',
  REPLACEMENT = 'REPLACEMENT',
  COMMENT = 'COMMENT',
  GLOBAL_COMMENT = 'GLOBAL_COMMENT',
}

export enum ReviewTag {
  TODO = '@TODO',
  FIX = '@FIX',
  VERIFY = '@VERIFY',
  OK = '@OK',
}

export type EditorMode = 'selection' | 'redline';

export type PlannotatorMode = 'plan' | 'file';

export interface Annotation {
  id: string;
  blockId: string;
  startOffset: number;
  endOffset: number;
  type: AnnotationType;
  text?: string;
  originalText: string;
  createdAt: number;
  author?: string;
  imagePaths?: string[];
  tags?: ReviewTag[];
  isMacro?: boolean;
}

export interface Block {
  id: string;
  type: 'paragraph' | 'heading' | 'blockquote' | 'list-item' | 'code' | 'hr' | 'table';
  content: string;
  level?: number;
  language?: string;
  checked?: boolean;
  order: number;
  startLine: number;
}

// Selection range from text highlighting
export interface SelectionRange {
  start: number;
  end: number;
  text: string;
  blockId: string;
}

// Toolbar position
export interface ToolbarPosition {
  x: number;
  y: number;
  width: number;
}
