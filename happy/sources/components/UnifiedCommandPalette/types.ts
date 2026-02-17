/**
 * Unified Command Palette Types
 *
 * This system unifies the Command Palette (Ctrl+K) and Slash Commands (/)
 * into a single cohesive interface that works on both web and mobile.
 */

export type CommandSource = 'navigation' | 'session' | 'slash' | 'skill' | 'system';

export interface UnifiedCommand {
    id: string;
    title: string;              // "New Session" or "/compact"
    subtitle?: string;          // Description
    icon?: string;              // Ionicons name
    shortcut?: string;          // "⌘N" (optional, web only)
    source: CommandSource;      // For categorization
    category: string;           // "Sessions", "CLI Commands", "Skills"
    keywords?: string[];        // For improved search
    action: () => void | Promise<void> | string;  // Execute or return text to insert
}

export interface CommandCategory {
    id: string;
    title: string;
    icon?: string;
    commands: UnifiedCommand[];
}

export interface CommandPaletteState {
    isOpen: boolean;
    searchQuery: string;
    selectedIndex: number;
    triggeredBy: 'slash' | 'keyboard' | null;
}
