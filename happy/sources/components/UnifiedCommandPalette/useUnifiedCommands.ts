/**
 * Hook that combines all command sources into a unified list
 *
 * Aggregates commands from:
 * - Navigation (New Session, Settings, etc.)
 * - Recent Sessions
 * - Slash Commands (from CLI)
 * - Skills (custom commands)
 * - System (Sign Out, Dev Menu)
 */

import { useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { storage } from '@/sync/storage';
import { useShallow } from 'zustand/react/shallow';
import { useNavigateToSession } from '@/hooks/useNavigateToSession';
import { UnifiedCommand, CommandCategory } from './types';
import {
    getNavigationCommands,
    getRecentSessionCommands,
    getSlashCommands,
    getSkillCommands,
    getSystemCommands
} from './commandSources';
import Fuse from 'fuse.js';

interface UseUnifiedCommandsOptions {
    sessionId?: string;
    onSendCommand?: (command: string) => void;
    triggeredBy?: 'slash' | 'keyboard' | null;
}

interface UseUnifiedCommandsReturn {
    commands: UnifiedCommand[];
    categories: CommandCategory[];
    searchCommands: (query: string) => CommandCategory[];
}

export function useUnifiedCommands(options: UseUnifiedCommandsOptions = {}): UseUnifiedCommandsReturn {
    const { sessionId, onSendCommand, triggeredBy } = options;
    const router = useRouter();
    const { logout } = useAuth();
    const sessions = storage(useShallow((state) => state.sessions));
    const navigateToSession = useNavigateToSession();

    // Get session-specific data
    const session = sessionId ? sessions[sessionId] : null;
    const sessionSlashCommands = session?.metadata?.slashCommands;

    // Build the unified command list
    const commands = useMemo((): UnifiedCommand[] => {
        const cmds: UnifiedCommand[] = [];

        // 1. Navigation commands (unless triggered by slash in input)
        if (triggeredBy !== 'slash') {
            cmds.push(...getNavigationCommands(router));
        }

        // 2. Recent sessions (unless triggered by slash in input)
        if (triggeredBy !== 'slash') {
            cmds.push(...getRecentSessionCommands(sessions, navigateToSession));
        }

        // 3. Slash commands (always show when in a session)
        if (sessionId) {
            cmds.push(...getSlashCommands(sessionSlashCommands, onSendCommand));
        }

        // 4. Skills (from session metadata if available)
        // Note: Skills would come from session.metadata.skills if implemented
        // For now, we'll leave this empty until the skill system is connected

        // 5. System commands (unless triggered by slash in input)
        if (triggeredBy !== 'slash') {
            cmds.push(...getSystemCommands(logout, router));
        }

        return cmds;
    }, [router, logout, sessions, navigateToSession, sessionId, sessionSlashCommands, onSendCommand, triggeredBy]);

    // Group commands by category
    const categories = useMemo((): CommandCategory[] => {
        const grouped = commands.reduce((acc, command) => {
            const category = command.category || 'General';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(command);
            return acc;
        }, {} as Record<string, UnifiedCommand[]>);

        // Define category order
        const categoryOrder = [
            'Sessions',
            'CLI Commands',
            'Skills',
            'Navigation',
            'Recent Sessions',
            'System',
            'Developer',
        ];

        return categoryOrder
            .filter(title => grouped[title]?.length > 0)
            .map(title => ({
                id: title.toLowerCase().replace(/\s+/g, '-'),
                title,
                commands: grouped[title]
            }));
    }, [commands]);

    // Fuzzy search using Fuse.js
    const searchCommands = useCallback((query: string): CommandCategory[] => {
        if (!query.trim()) {
            return categories;
        }

        // Remove leading slash from query if present
        const normalizedQuery = query.startsWith('/') ? query.slice(1) : query;

        const fuseOptions = {
            keys: [
                { name: 'title', weight: 0.5 },
                { name: 'subtitle', weight: 0.3 },
                { name: 'keywords', weight: 0.2 }
            ],
            threshold: 0.4,
            includeScore: true,
            shouldSort: true,
            minMatchCharLength: 1,
            ignoreLocation: true
        };

        const fuse = new Fuse(commands, fuseOptions);
        const results = fuse.search(normalizedQuery);

        if (results.length === 0) {
            return [];
        }

        // Group results by category
        const grouped = results.reduce((acc, result) => {
            const command = result.item;
            const category = command.category || 'Results';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(command);
            return acc;
        }, {} as Record<string, UnifiedCommand[]>);

        return Object.entries(grouped).map(([title, cmds]) => ({
            id: title.toLowerCase().replace(/\s+/g, '-'),
            title,
            commands: cmds
        }));
    }, [commands, categories]);

    return {
        commands,
        categories,
        searchCommands
    };
}
