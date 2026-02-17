/**
 * TodoEditorModal - Modal for editing todo items
 * Allows users to check/uncheck, edit, add, or delete todos
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';

export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'high' | 'medium' | 'low';
}

interface TodoEditorModalProps {
  visible: boolean;
  onClose: () => void;
  todos: TodoItem[];
  sessionId?: string; // Optional - when absent, Send Updates is disabled
  onSendFeedback?: (feedback: string, updatedTodos: TodoItem[]) => void;
}

export const TodoEditorModal: React.FC<TodoEditorModalProps> = ({
  visible,
  onClose,
  todos: initialTodos,
  sessionId,
  onSendFeedback,
}) => {
  const { theme } = useUnistyles();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newTodoText, setNewTodoText] = useState('');

  // Reset todos when modal opens
  React.useEffect(() => {
    if (visible) {
      setTodos(initialTodos.map((t, i) => ({
        ...t,
        id: t.id || `todo-${i}`,
      })));
      setEditingId(null);
      setEditText('');
      setNewTodoText('');
    }
  }, [visible, initialTodos]);

  // Count changes from original
  const changeCount = useMemo(() => {
    let count = 0;
    const originalMap = new Map(initialTodos.map((t, i) => [t.id || `todo-${i}`, t]));

    // Check for modified or deleted todos
    for (const original of initialTodos) {
      const id = original.id || `todo-${initialTodos.indexOf(original)}`;
      const current = todos.find(t => t.id === id);
      if (!current) {
        count++; // Deleted
      } else if (current.content !== original.content || current.status !== original.status) {
        count++; // Modified
      }
    }

    // Check for new todos
    for (const todo of todos) {
      if (!originalMap.has(todo.id)) {
        count++;
      }
    }

    return count;
  }, [todos, initialTodos]);

  // Toggle todo status
  const toggleStatus = useCallback((id: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t;
      const nextStatus: Record<string, 'pending' | 'in_progress' | 'completed'> = {
        'pending': 'in_progress',
        'in_progress': 'completed',
        'completed': 'pending',
      };
      return { ...t, status: nextStatus[t.status] };
    }));
  }, []);

  // Start editing a todo
  const startEditing = useCallback((todo: TodoItem) => {
    setEditingId(todo.id);
    setEditText(todo.content);
  }, []);

  // Save edited todo
  const saveEdit = useCallback(() => {
    if (!editingId || !editText.trim()) return;
    setTodos(prev => prev.map(t =>
      t.id === editingId ? { ...t, content: editText.trim() } : t
    ));
    setEditingId(null);
    setEditText('');
  }, [editingId, editText]);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  // Delete a todo
  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  // Add a new todo
  const addTodo = useCallback(() => {
    if (!newTodoText.trim()) return;
    const newTodo: TodoItem = {
      id: `new-${Date.now()}`,
      content: newTodoText.trim(),
      status: 'pending',
    };
    setTodos(prev => [...prev, newTodo]);
    setNewTodoText('');
  }, [newTodoText]);

  // Generate feedback message
  const generateFeedback = useCallback(() => {
    const lines: string[] = ['Updated todo list:'];

    for (const todo of todos) {
      const statusIcon = todo.status === 'completed' ? '[x]' :
                         todo.status === 'in_progress' ? '[>]' : '[ ]';
      lines.push(`${statusIcon} ${todo.content}`);
    }

    // Note changes
    const added = todos.filter(t => t.id.startsWith('new-'));
    const deleted = initialTodos.filter(orig => {
      const id = orig.id || `todo-${initialTodos.indexOf(orig)}`;
      return !todos.find(t => t.id === id);
    });

    if (added.length > 0 || deleted.length > 0) {
      lines.push('');
      if (added.length > 0) {
        lines.push(`Added ${added.length} new task(s)`);
      }
      if (deleted.length > 0) {
        lines.push(`Removed ${deleted.length} task(s)`);
      }
    }

    return lines.join('\n');
  }, [todos, initialTodos]);

  // Send feedback
  const handleSendFeedback = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const feedback = generateFeedback();
      onSendFeedback?.(feedback, todos);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [generateFeedback, todos, onSendFeedback, onClose]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'in_progress': return 'play-circle';
      default: return 'ellipse-outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#34C759';
      case 'in_progress': return '#007AFF';
      default: return theme.colors.textSecondary;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.divider,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ fontSize: 16, color: theme.colors.textLink }}>Cancel</Text>
            </Pressable>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.colors.text,
                marginLeft: 12,
              }}
            >
              Edit Todos
            </Text>
          </View>

          {changeCount > 0 && (
            <View
              style={{
                backgroundColor: theme.colors.textLink,
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600' }}>
                {changeCount} change{changeCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Todo list */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {todos.map((todo) => (
            <View
              key={todo.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 12,
                marginBottom: 8,
                backgroundColor: theme.colors.surfaceHighest,
                borderRadius: 8,
                gap: 12,
              }}
            >
              {/* Status toggle */}
              <Pressable onPress={() => toggleStatus(todo.id)}>
                <Ionicons
                  name={getStatusIcon(todo.status) as any}
                  size={24}
                  color={getStatusColor(todo.status)}
                />
              </Pressable>

              {/* Content */}
              {editingId === todo.id ? (
                <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: theme.colors.text,
                      borderWidth: 1,
                      borderColor: theme.colors.textLink,
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                    value={editText}
                    onChangeText={setEditText}
                    autoFocus
                    onSubmitEditing={saveEdit}
                  />
                  <Pressable onPress={saveEdit}>
                    <Ionicons name="checkmark" size={20} color="#34C759" />
                  </Pressable>
                  <Pressable onPress={cancelEdit}>
                    <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => startEditing(todo)}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: todo.status === 'completed'
                        ? theme.colors.textSecondary
                        : theme.colors.text,
                      textDecorationLine: todo.status === 'completed' ? 'line-through' : 'none',
                    }}
                  >
                    {todo.content}
                  </Text>
                </Pressable>
              )}

              {/* Delete button */}
              {editingId !== todo.id && (
                <Pressable onPress={() => deleteTodo(todo.id)}>
                  <Ionicons name="trash-outline" size={18} color="#dc2626" />
                </Pressable>
              )}
            </View>
          ))}

          {/* Add new todo */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 12,
              marginTop: 8,
              backgroundColor: theme.colors.surface,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              borderStyle: 'dashed',
              gap: 12,
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.textSecondary} />
            <TextInput
              style={{
                flex: 1,
                fontSize: 14,
                color: theme.colors.text,
              }}
              placeholder="Add new todo..."
              placeholderTextColor={theme.colors.textSecondary}
              value={newTodoText}
              onChangeText={setNewTodoText}
              onSubmitEditing={addTodo}
            />
            {newTodoText.trim() && (
              <Pressable onPress={addTodo}>
                <Ionicons name="add" size={20} color={theme.colors.textLink} />
              </Pressable>
            )}
          </View>

          {/* Legend */}
          <View style={{ marginTop: 24, paddingHorizontal: 8 }}>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 8 }}>
              Tap status icon to cycle: Pending → In Progress → Completed
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
              Tap text to edit
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: theme.colors.divider,
            gap: 12,
          }}
        >
          {/* No session warning */}
          {!sessionId && changeCount > 0 && (
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary, flex: 1 }}>
              Session inactive - changes are local only
            </Text>
          )}

          {/* Send Updates button */}
          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: changeCount === 0 || !sessionId
                ? theme.colors.surfaceHighest
                : theme.colors.textLink,
              opacity: isSubmitting || changeCount === 0 || !sessionId ? 0.5 : 1,
            }}
            onPress={handleSendFeedback}
            disabled={isSubmitting || changeCount === 0 || !sessionId}
          >
            {isSubmitting && (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={{ marginRight: 8 }}
              />
            )}
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: changeCount === 0 || !sessionId ? theme.colors.textSecondary : '#fff',
              }}
            >
              {sessionId ? `Send Updates (${changeCount})` : 'No active session'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
