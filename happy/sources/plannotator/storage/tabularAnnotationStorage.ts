/**
 * Tabular annotation persistence using MMKV.
 * Stores cell-level annotations for SQLite and CSV viewers,
 * following the same pattern as annotationStorage.ts.
 */

import { MMKV } from 'react-native-mmkv';
import type { ReviewTag } from '../types';

const mmkv = new MMKV({ id: 'plannotator-annotations' });

export interface TabularAnnotation {
    id: string;
    row: number;
    column: string;
    value: string;
    comment: string;
    tag?: ReviewTag;
    table?: string; // SQLite table name (absent for CSV)
    createdAt: number;
}

interface StoredTabularAnnotations {
    annotations: TabularAnnotation[];
    filePath: string;
    savedAt: number;
}

function getKey(sessionId: string, filePath: string, table?: string): string {
    const base = `tann:${sessionId}:${btoa(filePath)}`;
    return table ? `${base}:${table}` : base;
}

export function saveTabularAnnotations(
    sessionId: string,
    filePath: string,
    annotations: TabularAnnotation[],
    table?: string
): void {
    const key = getKey(sessionId, filePath, table);
    const data: StoredTabularAnnotations = {
        annotations,
        filePath,
        savedAt: Date.now(),
    };
    mmkv.set(key, JSON.stringify(data));
}

export function loadTabularAnnotations(
    sessionId: string,
    filePath: string,
    table?: string
): StoredTabularAnnotations | null {
    const key = getKey(sessionId, filePath, table);
    const raw = mmkv.getString(key);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as StoredTabularAnnotations;
    } catch {
        return null;
    }
}

export function clearTabularAnnotations(
    sessionId: string,
    filePath: string,
    table?: string
): void {
    const key = getKey(sessionId, filePath, table);
    mmkv.delete(key);
}

export function hasTabularAnnotations(
    sessionId: string,
    filePath: string,
    table?: string
): boolean {
    const key = getKey(sessionId, filePath, table);
    return mmkv.contains(key);
}

/**
 * Export tabular annotations as formatted text for sending to LLM.
 */
export function exportTabularAnnotations(
    annotations: TabularAnnotation[],
    fileName: string
): string {
    if (annotations.length === 0) return '';

    const sorted = [...annotations].sort((a, b) => a.row - b.row || a.column.localeCompare(b.column));
    const lines: string[] = [`# Table Annotations for ${fileName}`, ''];

    for (const ann of sorted) {
        const location = ann.table
            ? `Table "${ann.table}", Row ${ann.row + 1}, Column "${ann.column}"`
            : `Row ${ann.row + 1}, Column "${ann.column}"`;
        const tagStr = ann.tag ? ` ${ann.tag}` : '';

        lines.push(`## ${location}${tagStr}`);
        lines.push(`Value: \`${ann.value}\``);
        lines.push(`> ${ann.comment}`);
        lines.push('');
    }

    return lines.join('\n');
}
