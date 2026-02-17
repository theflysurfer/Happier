import * as React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { ToolViewProps } from "./_all";
import { knownTools } from '../../tools/knownTools';
import { ToolSectionView } from '../../tools/ToolSectionView';
import { TodoEditorModal, TodoItem } from '@/plannotator';

export interface Todo {
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority?: 'high' | 'medium' | 'low';
    id?: string;
}

export const TodoView = React.memo<ToolViewProps>(({ tool, sessionId }) => {
    const { theme } = useUnistyles();
    const [showEditor, setShowEditor] = React.useState(false);

    let todosList: Todo[] = [];

    // Try to get todos from input first
    let parsedArguments = knownTools.TodoWrite.input.safeParse(tool.input);
    if (parsedArguments.success && parsedArguments.data.todos) {
        todosList = parsedArguments.data.todos;
    }

    // If we have a properly structured result, use newTodos from there
    let parsed = knownTools.TodoWrite.result.safeParse(tool.result);
    if (parsed.success && parsed.data.newTodos) {
        todosList = parsed.data.newTodos;
    }

    // Convert to TodoItem format for editor
    const todoItems: TodoItem[] = todosList.map((t, i) => ({
        id: t.id || `todo-${i}`,
        content: t.content,
        status: t.status,
        priority: t.priority,
    }));

    const handleSendFeedback = React.useCallback((feedback: string, updatedTodos: TodoItem[]) => {
        // This will be handled by the modal internally
        console.log('[TodoView] Feedback:', feedback);
    }, []);

    // If we have todos to display, show them
    if (todosList.length > 0) {
        return (
            <ToolSectionView>
                <View style={styles.container}>
                    {/* Edit button - always visible */}
                    <Pressable
                        onPress={() => setShowEditor(true)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 6,
                            backgroundColor: theme.colors.textLink,
                            marginBottom: 12,
                        }}
                    >
                        <Ionicons name="create-outline" size={16} color="#fff" />
                        <Text style={{ marginLeft: 6, color: '#fff', fontWeight: '500', fontSize: 13 }}>
                            Edit Todos
                        </Text>
                    </Pressable>

                    {todosList.map((todo, index) => {
                        const isCompleted = todo.status === 'completed';
                        const isInProgress = todo.status === 'in_progress';
                        const isPending = todo.status === 'pending';

                        let textStyle: any = styles.todoText;
                        let icon = '☐';

                        if (isCompleted) {
                            textStyle = [styles.todoText, styles.completedText];
                            icon = '☑';
                        } else if (isInProgress) {
                            textStyle = [styles.todoText, styles.inProgressText];
                            icon = '☐';
                        } else if (isPending) {
                            textStyle = [styles.todoText, styles.pendingText];
                        }

                        return (
                            <View key={todo.id || `todo-${index}`} style={styles.todoItem}>
                                <Text style={textStyle}>
                                    {icon} {todo.content}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                {/* Todo Editor Modal - always available, session optional */}
                <TodoEditorModal
                    visible={showEditor}
                    onClose={() => setShowEditor(false)}
                    todos={todoItems}
                    sessionId={sessionId}
                    onSendFeedback={handleSendFeedback}
                />
            </ToolSectionView>
        )
    }

    return null;
});

const styles = StyleSheet.create({
    container: {
        gap: 4,
    },
    todoItem: {
        paddingVertical: 2,
    },
    todoText: {
        fontSize: 14,
        color: '#000',
        flex: 1,
    },
    completedText: {
        color: '#34C759',
        textDecorationLine: 'line-through',
    },
    inProgressText: {
        color: '#007AFF',
    },
    pendingText: {
        color: '#666',
    },
});