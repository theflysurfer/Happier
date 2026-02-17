import * as React from 'react';
import { sessionWriteFile } from '@/sync/ops';
import { Modal } from '@/modal';
import { t } from '@/text';

interface UseFileEditorOptions {
    sessionId: string;
    filePath: string;
    initialContent: string;
}

export function useFileEditor({ sessionId, filePath, initialContent }: UseFileEditorOptions) {
    const [isEditMode, setIsEditMode] = React.useState(false);
    const [editedContent, setEditedContent] = React.useState(initialContent);
    const [originalContent, setOriginalContent] = React.useState(initialContent);
    const [isSaving, setIsSaving] = React.useState(false);
    const [fileHash, setFileHash] = React.useState<string | null>(null);

    const isDirty = editedContent !== originalContent;

    // Sync with external content changes
    React.useEffect(() => {
        if (!isEditMode) {
            setOriginalContent(initialContent);
            setEditedContent(initialContent);
        }
    }, [initialContent, isEditMode]);

    const enterEditMode = React.useCallback(() => {
        setEditedContent(originalContent);
        setIsEditMode(true);
    }, [originalContent]);

    const exitEditMode = React.useCallback(() => {
        if (isDirty) {
            Modal.alert(
                t('editor.unsavedChanges'),
                t('editor.unsavedChangesMessage'),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                        text: t('editor.discardChanges'),
                        style: 'destructive',
                        onPress: () => {
                            setEditedContent(originalContent);
                            setIsEditMode(false);
                        },
                    },
                ]
            );
        } else {
            setIsEditMode(false);
        }
    }, [isDirty, originalContent]);

    const saveFile = React.useCallback(async (): Promise<boolean> => {
        setIsSaving(true);
        try {
            const base64Content = btoa(editedContent);
            const response = await sessionWriteFile(
                sessionId,
                filePath,
                base64Content,
                fileHash
            );

            if (response.success) {
                setOriginalContent(editedContent);
                setFileHash(response.hash || null);
                setIsEditMode(false);
                return true;
            } else if (response.error?.includes('hash') || response.error?.includes('conflict')) {
                // Hash mismatch - file was modified externally
                Modal.alert(
                    t('editor.conflictDetected'),
                    t('editor.conflictMessage'),
                    [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                            text: t('editor.overwrite'),
                            style: 'destructive',
                            onPress: async () => {
                                // Force write without hash check
                                const forceResponse = await sessionWriteFile(
                                    sessionId,
                                    filePath,
                                    base64Content
                                );
                                if (forceResponse.success) {
                                    setOriginalContent(editedContent);
                                    setFileHash(forceResponse.hash || null);
                                    setIsEditMode(false);
                                } else {
                                    Modal.alert(t('common.error'), forceResponse.error || 'Save failed');
                                }
                            },
                        },
                    ]
                );
                return false;
            } else {
                Modal.alert(t('common.error'), response.error || 'Save failed');
                return false;
            }
        } catch (error) {
            Modal.alert(t('common.error'), error instanceof Error ? error.message : 'Save failed');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [sessionId, filePath, editedContent, fileHash]);

    return {
        isEditMode,
        editedContent,
        isDirty,
        isSaving,
        setEditedContent,
        enterEditMode,
        exitEditMode,
        saveFile,
        setFileHash,
    };
}
