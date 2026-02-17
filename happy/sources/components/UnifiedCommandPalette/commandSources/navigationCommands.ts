/**
 * Navigation commands for the command palette
 * Includes New Session, Settings, Account, etc.
 */

import { Router } from 'expo-router';
import { UnifiedCommand } from '../types';

export function getNavigationCommands(router: Router): UnifiedCommand[] {
    return [
        {
            id: 'new-session',
            title: 'New Session',
            subtitle: 'Start a new chat session',
            icon: 'add-circle-outline',
            category: 'Sessions',
            source: 'navigation',
            shortcut: '⌘N',
            keywords: ['new', 'create', 'start', 'chat'],
            action: () => {
                router.push('/new');
            }
        },
        {
            id: 'sessions',
            title: 'View All Sessions',
            subtitle: 'Browse your chat history',
            icon: 'chatbubbles-outline',
            category: 'Sessions',
            source: 'navigation',
            keywords: ['sessions', 'history', 'browse', 'list'],
            action: () => {
                router.push('/');
            }
        },
        {
            id: 'settings',
            title: 'Settings',
            subtitle: 'Configure your preferences',
            icon: 'settings-outline',
            category: 'Navigation',
            source: 'navigation',
            shortcut: '⌘,',
            keywords: ['settings', 'preferences', 'options', 'config'],
            action: () => {
                router.push('/settings');
            }
        },
        {
            id: 'account',
            title: 'Account',
            subtitle: 'Manage your account',
            icon: 'person-circle-outline',
            category: 'Navigation',
            source: 'navigation',
            keywords: ['account', 'profile', 'user'],
            action: () => {
                router.push('/settings/account');
            }
        },
        {
            id: 'connect',
            title: 'Connect Device',
            subtitle: 'Connect a new device via web',
            icon: 'link-outline',
            category: 'Navigation',
            source: 'navigation',
            keywords: ['connect', 'device', 'link', 'pair'],
            action: () => {
                router.push('/terminal/connect');
            }
        },
    ];
}
