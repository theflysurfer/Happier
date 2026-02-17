/**
 * System commands for the command palette
 * Includes Sign Out, Developer Menu, etc.
 */

import { Router } from 'expo-router';
import { UnifiedCommand } from '../types';

export function getSystemCommands(
    logout: () => Promise<void>,
    router: Router
): UnifiedCommand[] {
    const commands: UnifiedCommand[] = [
        {
            id: 'sign-out',
            title: 'Sign Out',
            subtitle: 'Sign out of your account',
            icon: 'log-out-outline',
            category: 'System',
            source: 'system',
            keywords: ['sign out', 'logout', 'exit'],
            action: async () => {
                await logout();
            }
        },
    ];

    // Dev commands (if in development)
    if (__DEV__) {
        commands.push({
            id: 'dev-menu',
            title: 'Developer Menu',
            subtitle: 'Access developer tools',
            icon: 'code-slash-outline',
            category: 'Developer',
            source: 'system',
            keywords: ['dev', 'developer', 'debug'],
            action: () => {
                router.push('/dev');
            }
        });
    }

    return commands;
}
