import * as React from 'react';
import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { ToolViewProps } from './_all';
import { ToolSectionView } from '../ToolSectionView';

interface TaskItem {
    id?: number | string;
    subject?: string;
    content?: string;
    description?: string;
    status?: string;
    priority?: string;
    activeForm?: string;
}

const STATUS_CONFIG: Record<string, { icon: string; color: string }> = {
    completed: { icon: '✓', color: '#34C759' },
    in_progress: { icon: '◉', color: '#007AFF' },
    pending: { icon: '○', color: '#8E8E93' },
};

function getStatusConfig(status?: string) {
    return STATUS_CONFIG[status || 'pending'] || STATUS_CONFIG.pending;
}

/**
 * Renders TaskCreate tool calls as a visual task card.
 */
export const TaskCreateView = React.memo<ToolViewProps>(({ tool }) => {
    const subject = tool.input?.subject || tool.input?.content || 'New task';
    const status = tool.input?.status || 'pending';
    const description = tool.input?.description;
    const cfg = getStatusConfig(status);

    const resultId = tool.result?.taskId || tool.result?.id;

    return (
        <ToolSectionView>
            <View style={styles.card}>
                <View style={styles.row}>
                    <Text style={[styles.statusIcon, { color: cfg.color }]}>{cfg.icon}</Text>
                    <View style={styles.content}>
                        <Text style={styles.subject}>{subject}</Text>
                        {description ? (
                            <Text style={styles.description} numberOfLines={2}>{description}</Text>
                        ) : null}
                    </View>
                    {resultId ? (
                        <Text style={styles.taskId}>#{resultId}</Text>
                    ) : null}
                </View>
            </View>
        </ToolSectionView>
    );
});

/**
 * Renders TaskUpdate tool calls as a compact status change indicator.
 */
export const TaskUpdateView = React.memo<ToolViewProps>(({ tool }) => {
    const taskId = tool.input?.taskId || tool.input?.id;
    const newStatus = tool.input?.status;
    const cfg = getStatusConfig(newStatus);

    return (
        <ToolSectionView>
            <View style={styles.card}>
                <View style={styles.row}>
                    <Text style={[styles.statusIcon, { color: cfg.color }]}>{cfg.icon}</Text>
                    <Text style={styles.updateText}>
                        Task #{taskId}
                    </Text>
                    {newStatus ? (
                        <View style={[styles.badge, { backgroundColor: cfg.color + '20' }]}>
                            <Text style={[styles.badgeText, { color: cfg.color }]}>
                                {newStatus.replace('_', ' ')}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </ToolSectionView>
    );
});

/**
 * Renders TaskList as a list of tasks with visual status.
 */
export const TaskListView = React.memo<ToolViewProps>(({ tool }) => {
    const tasks: TaskItem[] = tool.result?.tasks || tool.result || [];
    if (!Array.isArray(tasks) || tasks.length === 0) return null;

    return (
        <ToolSectionView>
            <View style={styles.card}>
                {tasks.map((task, i) => {
                    const cfg = getStatusConfig(task.status);
                    const label = task.subject || task.content || `Task #${task.id || i + 1}`;
                    return (
                        <View key={task.id || i} style={[styles.row, i > 0 && styles.rowBorder]}>
                            <Text style={[styles.statusIcon, { color: cfg.color }]}>{cfg.icon}</Text>
                            <Text style={styles.listItemText} numberOfLines={1}>
                                {task.id ? `#${task.id} ` : ''}{label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </ToolSectionView>
    );
});

const styles = StyleSheet.create({
    card: {
        gap: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
    },
    rowBorder: {
        borderTopWidth: 0.5,
        borderTopColor: '#E5E5EA',
        paddingTop: 6,
        marginTop: 2,
    },
    statusIcon: {
        fontSize: 16,
        width: 20,
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    subject: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
    },
    description: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 2,
    },
    taskId: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '500',
    },
    updateText: {
        fontSize: 14,
        color: '#000',
        flex: 1,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    listItemText: {
        fontSize: 14,
        color: '#000',
        flex: 1,
    },
});
