/**
 * Session-related commands for the command palette
 * Includes recent sessions for quick access
 */

import { UnifiedCommand } from '../types';
import { Session } from '@/sync/storageTypes';

export function getRecentSessionCommands(
    sessions: Record<string, Session>,
    navigateToSession: (sessionId: string) => void,
    limit: number = 5
): UnifiedCommand[] {
    const recentSessions = Object.values(sessions)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, limit);

    return recentSessions.map(session => {
        const sessionName = session.metadata?.name || `Session ${session.id.slice(0, 6)}`;
        return {
            id: `session-${session.id}`,
            title: sessionName,
            subtitle: session.metadata?.path || 'Switch to session',
            icon: 'time-outline',
            category: 'Recent Sessions',
            source: 'session' as const,
            keywords: [sessionName.toLowerCase(), 'recent', 'session'],
            action: () => {
                navigateToSession(session.id);
            }
        };
    });
}
