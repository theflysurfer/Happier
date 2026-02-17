/**
 * Slash commands for the command palette
 * These are commands that get sent to the CLI (like /compact, /clear)
 */

import { UnifiedCommand } from '../types';

// Commands to ignore/filter out (CLI-only commands)
const IGNORED_COMMANDS = [
    'add-dir',
    'agents',
    'config',
    'statusline',
    'bashes',
    'settings',
    'cost',
    'doctor',
    'exit',
    'help',
    'ide',
    'init',
    'install-github-app',
    'mcp',
    'memory',
    'migrate-installer',
    'model',
    'pr-comments',
    'release-notes',
    'resume',
    'status',
    'bug',
    'review',
    'security-review',
    'terminal-setup',
    'upgrade',
    'vim',
    'permissions',
    'hooks',
    'export',
    'logout',
    'login'
];

// Command descriptions for known tools/commands
const COMMAND_DESCRIPTIONS: Record<string, string> = {
    compact: 'Compact the conversation history',
    clear: 'Clear the conversation',
    reset: 'Reset the session',
    debug: 'Show debug information',
    stop: 'Stop current operation',
    abort: 'Abort current operation',
    cancel: 'Cancel current operation',
};

// Default commands always available
const DEFAULT_COMMANDS = [
    { command: 'compact', description: 'Compact the conversation history' },
    { command: 'clear', description: 'Clear the conversation' }
];

export function getSlashCommands(
    sessionSlashCommands?: string[],
    onSendCommand?: (command: string) => void
): UnifiedCommand[] {
    const commands: UnifiedCommand[] = [];
    const addedCommands = new Set<string>();

    // Add default commands first
    for (const cmd of DEFAULT_COMMANDS) {
        commands.push({
            id: `slash-${cmd.command}`,
            title: `/${cmd.command}`,
            subtitle: cmd.description,
            icon: 'terminal-outline',
            category: 'CLI Commands',
            source: 'slash',
            keywords: [cmd.command, 'slash', 'command'],
            action: () => {
                if (onSendCommand) {
                    onSendCommand(`/${cmd.command}`);
                }
                return `/${cmd.command}`;
            }
        });
        addedCommands.add(cmd.command);
    }

    // Add commands from session metadata (filtered)
    if (sessionSlashCommands) {
        for (const cmd of sessionSlashCommands) {
            // Skip if in ignore list or already added
            if (IGNORED_COMMANDS.includes(cmd) || addedCommands.has(cmd)) {
                continue;
            }

            commands.push({
                id: `slash-${cmd}`,
                title: `/${cmd}`,
                subtitle: COMMAND_DESCRIPTIONS[cmd] || undefined,
                icon: 'terminal-outline',
                category: 'CLI Commands',
                source: 'slash',
                keywords: [cmd, 'slash', 'command'],
                action: () => {
                    if (onSendCommand) {
                        onSendCommand(`/${cmd}`);
                    }
                    return `/${cmd}`;
                }
            });
            addedCommands.add(cmd);
        }
    }

    return commands;
}
