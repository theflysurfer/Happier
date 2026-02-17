/**
 * Annotation persistence using MMKV
 */

import { MMKV } from 'react-native-mmkv';
import type { Annotation } from '../types';

const mmkv = new MMKV({ id: 'plannotator-annotations' });

interface StoredAnnotations {
    annotations: Annotation[];
    fileHash?: string;
    filePath: string;
    savedAt: number;
}

function getKey(sessionId: string, filePath: string): string {
    return `ann:${sessionId}:${btoa(filePath)}`;
}

export function saveAnnotations(
    sessionId: string,
    filePath: string,
    annotations: Annotation[],
    fileHash?: string
): void {
    const key = getKey(sessionId, filePath);
    const data: StoredAnnotations = {
        annotations,
        fileHash,
        filePath,
        savedAt: Date.now(),
    };
    mmkv.set(key, JSON.stringify(data));
}

export function loadAnnotations(
    sessionId: string,
    filePath: string
): StoredAnnotations | null {
    const key = getKey(sessionId, filePath);
    const raw = mmkv.getString(key);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as StoredAnnotations;
    } catch {
        return null;
    }
}

export function clearAnnotations(sessionId: string, filePath: string): void {
    const key = getKey(sessionId, filePath);
    mmkv.delete(key);
}

export function hasAnnotations(sessionId: string, filePath: string): boolean {
    const key = getKey(sessionId, filePath);
    return mmkv.contains(key);
}
