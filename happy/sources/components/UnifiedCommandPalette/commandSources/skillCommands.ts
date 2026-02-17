/**
 * Skill commands for the command palette
 * These are custom skills available in the session
 */

import { UnifiedCommand } from '../types';

interface SkillInfo {
    name: string;
    description?: string;
}

export function getSkillCommands(
    skills?: SkillInfo[],
    onSendCommand?: (command: string) => void
): UnifiedCommand[] {
    if (!skills || skills.length === 0) {
        return [];
    }

    return skills.map(skill => ({
        id: `skill-${skill.name}`,
        title: `/${skill.name}`,
        subtitle: skill.description || 'Custom skill',
        icon: 'flash-outline',
        category: 'Skills',
        source: 'skill' as const,
        keywords: [skill.name, 'skill', 'custom'],
        action: () => {
            if (onSendCommand) {
                onSendCommand(`/${skill.name}`);
            }
            return `/${skill.name}`;
        }
    }));
}
