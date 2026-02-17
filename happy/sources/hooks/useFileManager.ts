import * as React from 'react';
import {
    sessionGetDirectoryTree,
    sessionBash,
    sessionWriteFile,
    type TreeNode,
} from '@/sync/ops';
import { storage } from '@/sync/storage';

interface FileManagerState {
    currentPath: string;
    tree: TreeNode | null;
    expandedPaths: Set<string>;
    isLoading: boolean;
    error: string | null;
}

export function useFileManager(sessionId: string) {
    const session = storage.getState().sessions[sessionId];
    const rootPath = session?.metadata?.path || '/';

    const [state, setState] = React.useState<FileManagerState>({
        currentPath: rootPath,
        tree: null,
        expandedPaths: new Set<string>(),
        isLoading: true,
        error: null,
    });

    const loadTree = React.useCallback(async (path: string) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const response = await sessionGetDirectoryTree(sessionId, path, 3);
            if (response.success && response.tree) {
                setState(prev => ({
                    ...prev,
                    tree: response.tree!,
                    currentPath: path,
                    isLoading: false,
                }));
            } else {
                setState(prev => ({
                    ...prev,
                    error: response.error || 'Failed to load directory',
                    isLoading: false,
                }));
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Unknown error',
                isLoading: false,
            }));
        }
    }, [sessionId]);

    // Load on mount
    React.useEffect(() => {
        loadTree(rootPath);
    }, [rootPath, loadTree]);

    const navigateTo = React.useCallback((path: string) => {
        loadTree(path);
    }, [loadTree]);

    const toggleExpand = React.useCallback((path: string) => {
        setState(prev => {
            const next = new Set(prev.expandedPaths);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return { ...prev, expandedPaths: next };
        });
    }, []);

    const refresh = React.useCallback(() => {
        loadTree(state.currentPath);
    }, [loadTree, state.currentPath]);

    const createFile = React.useCallback(async (parentPath: string, fileName: string) => {
        const fullPath = parentPath.endsWith('/')
            ? `${parentPath}${fileName}`
            : `${parentPath}/${fileName}`;
        const emptyContent = btoa('');
        const response = await sessionWriteFile(sessionId, fullPath, emptyContent);
        if (!response.success) {
            throw new Error(response.error || 'Failed to create file');
        }
        await loadTree(state.currentPath);
        return fullPath;
    }, [sessionId, loadTree, state.currentPath]);

    const createFolder = React.useCallback(async (parentPath: string, folderName: string) => {
        const fullPath = parentPath.endsWith('/')
            ? `${parentPath}${folderName}`
            : `${parentPath}/${folderName}`;
        const session = storage.getState().sessions[sessionId];
        const cwd = session?.metadata?.path || '/';
        const response = await sessionBash(sessionId, {
            command: `mkdir -p "${fullPath}"`,
            cwd,
            timeout: 5000,
        });
        if (!response.success) {
            throw new Error(response.stderr || 'Failed to create folder');
        }
        await loadTree(state.currentPath);
    }, [sessionId, loadTree, state.currentPath]);

    const renameItem = React.useCallback(async (oldPath: string, newName: string) => {
        const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'));
        const newPath = `${parentDir}/${newName}`;
        const session = storage.getState().sessions[sessionId];
        const cwd = session?.metadata?.path || '/';
        const response = await sessionBash(sessionId, {
            command: `mv "${oldPath}" "${newPath}"`,
            cwd,
            timeout: 5000,
        });
        if (!response.success) {
            throw new Error(response.stderr || 'Failed to rename');
        }
        await loadTree(state.currentPath);
    }, [sessionId, loadTree, state.currentPath]);

    const deleteItem = React.useCallback(async (path: string, isDirectory: boolean) => {
        const session = storage.getState().sessions[sessionId];
        const cwd = session?.metadata?.path || '/';
        const command = isDirectory ? `rm -rf "${path}"` : `rm "${path}"`;
        const response = await sessionBash(sessionId, {
            command,
            cwd,
            timeout: 5000,
        });
        if (!response.success) {
            throw new Error(response.stderr || 'Failed to delete');
        }
        await loadTree(state.currentPath);
    }, [sessionId, loadTree, state.currentPath]);

    return {
        ...state,
        rootPath,
        navigateTo,
        toggleExpand,
        refresh,
        createFile,
        createFolder,
        renameItem,
        deleteItem,
    };
}
