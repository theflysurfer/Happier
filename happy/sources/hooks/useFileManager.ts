import * as React from 'react';
import { MMKV } from 'react-native-mmkv';
import {
    sessionGetDirectoryTree,
    sessionBash,
    sessionWriteFile,
    type TreeNode,
} from '@/sync/ops';
import { storage } from '@/sync/storage';

const mmkv = new MMKV();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// MMKV keys cannot contain backslashes — normalize Windows paths
function cacheKey(sessionId: string, path: string): string {
    return `filetree:${sessionId}:${path.replace(/\\/g, '/')}`;
}

/**
 * Get cached file tree from MMKV, returns null if expired or missing.
 */
function getCachedTree(sessionId: string, path: string): TreeNode | null {
    const key = cacheKey(sessionId, path);
    const raw = mmkv.getString(key);
    if (!raw) return null;
    try {
        const cached = JSON.parse(raw) as { tree: TreeNode; timestamp: number };
        if (Date.now() - cached.timestamp > CACHE_TTL_MS) return null;
        return cached.tree;
    } catch {
        return null;
    }
}

/**
 * Store file tree in MMKV cache.
 */
function setCachedTree(sessionId: string, path: string, tree: TreeNode) {
    const key = cacheKey(sessionId, path);
    mmkv.set(key, JSON.stringify({ tree, timestamp: Date.now() }));
}

/**
 * Invalidate file tree cache for a session/path.
 */
function invalidateCache(sessionId: string, path: string) {
    const key = cacheKey(sessionId, path);
    mmkv.delete(key);
}

interface FileManagerState {
    currentPath: string;
    tree: TreeNode | null;
    expandedPaths: Set<string>;
    isLoading: boolean;
    error: string | null;
}

export function useFileManager(sessionId: string) {
    const session = storage.getState().sessions[sessionId];
    const isOnline = session?.active === true;
    const rootPath = session?.metadata?.path || '/';

    const [state, setState] = React.useState<FileManagerState>(() => {
        // Try loading from cache for instant display
        const cached = getCachedTree(sessionId, rootPath);
        return {
            currentPath: rootPath,
            tree: cached,
            expandedPaths: new Set<string>(),
            isLoading: !cached,
            error: null,
        };
    });

    const loadTree = React.useCallback(async (path: string) => {
        // Guard: don't attempt RPC if session is offline
        if (!storage.getState().sessions[sessionId]?.active) {
            setState(prev => ({
                ...prev,
                error: 'session_offline',
                isLoading: false,
            }));
            return;
        }
        setState(prev => ({ ...prev, isLoading: prev.tree === null, error: null }));
        try {
            const response = await sessionGetDirectoryTree(sessionId, path, 3);
            if (!response) {
                setState(prev => ({
                    ...prev,
                    error: 'Empty response from server',
                    isLoading: false,
                }));
                return;
            }
            if (response.success && response.tree) {
                setCachedTree(sessionId, path, response.tree);
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
        invalidateCache(sessionId, state.currentPath);
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
        invalidateCache(sessionId, state.currentPath);
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
        invalidateCache(sessionId, state.currentPath);
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
        invalidateCache(sessionId, state.currentPath);
        await loadTree(state.currentPath);
    }, [sessionId, loadTree, state.currentPath]);

    return {
        ...state,
        isOnline,
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
