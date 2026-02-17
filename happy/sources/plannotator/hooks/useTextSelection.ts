/**
 * useTextSelection - Handle text selection for annotations
 * Supports both web (mouse selection) and mobile (long-press)
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Block, SelectionRange, ToolbarPosition } from '../types';

export interface UseTextSelectionReturn {
  selection: SelectionRange | null;
  toolbarPosition: ToolbarPosition | null;
  isSelecting: boolean;
  handleLongPress: (block: Block, event: any) => void;
  handleMouseUp: (block: Block, event: any) => void;
  clearSelection: () => void;
  setSelection: (selection: SelectionRange | null, position?: ToolbarPosition) => void;
}

/**
 * Hook for handling text selection.
 * Web: Uses native browser selection API on mouseup
 * Mobile: Uses long-press to select entire block
 */
export function useTextSelection(): UseTextSelectionReturn {
  const [selection, setSelectionState] = useState<SelectionRange | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const blockMapRef = useRef<Map<string, Block>>(new Map());

  // Web: Listen to native selection changes
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        return; // Don't clear here - let handleMouseUp handle it
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // Web: Handle mouse up to capture selection
  const handleMouseUp = useCallback((block: Block, event: any) => {
    if (Platform.OS !== 'web') return;

    // Store block reference
    blockMapRef.current.set(block.id, block);

    // Small delay to ensure selection is complete
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        return;
      }

      const selectedText = sel.toString().trim();
      if (!selectedText) {
        return;
      }

      // Get selection range within the block
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Find start/end offsets within block content
      const blockContent = block.content;
      const startOffset = blockContent.indexOf(selectedText);
      const endOffset = startOffset + selectedText.length;

      if (startOffset === -1) {
        // Selected text not found in block - might be across blocks
        // For now, just use the selected text
        const newSelection: SelectionRange = {
          start: 0,
          end: selectedText.length,
          text: selectedText,
          blockId: block.id,
        };

        const newPosition: ToolbarPosition = {
          x: rect.left + rect.width / 2 - 100,
          y: rect.top - 10,
          width: 200,
        };

        setSelectionState(newSelection);
        setToolbarPosition(newPosition);
        setIsSelecting(true);
        return;
      }

      const newSelection: SelectionRange = {
        start: startOffset,
        end: endOffset,
        text: selectedText,
        blockId: block.id,
      };

      const newPosition: ToolbarPosition = {
        x: rect.left + rect.width / 2 - 100,
        y: rect.top - 10,
        width: 200,
      };

      setSelectionState(newSelection);
      setToolbarPosition(newPosition);
      setIsSelecting(true);
    }, 10);
  }, []);

  // Mobile: Handle long-press to select entire block
  const handleLongPress = useCallback((block: Block, event: any) => {
    // Get touch position from event
    const { pageX, pageY } = event.nativeEvent || { pageX: 0, pageY: 0 };

    // For long-press, we select the entire block content
    const newSelection: SelectionRange = {
      start: 0,
      end: block.content.length,
      text: block.content,
      blockId: block.id,
    };

    const newPosition: ToolbarPosition = {
      x: pageX,
      y: pageY - 60,
      width: 200,
    };

    setSelectionState(newSelection);
    setToolbarPosition(newPosition);
    setIsSelecting(true);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionState(null);
    setToolbarPosition(null);
    setIsSelecting(false);

    // Clear browser selection on web
    if (Platform.OS === 'web') {
      window.getSelection()?.removeAllRanges();
    }
  }, []);

  const setSelection = useCallback(
    (newSelection: SelectionRange | null, position?: ToolbarPosition) => {
      setSelectionState(newSelection);
      if (position) {
        setToolbarPosition(position);
      }
      setIsSelecting(newSelection !== null);
    },
    []
  );

  return {
    selection,
    toolbarPosition,
    isSelecting,
    handleLongPress,
    handleMouseUp,
    clearSelection,
    setSelection,
  };
}
