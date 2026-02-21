import * as React from 'react';
import { View, ScrollView, ActivityIndicator, Platform, Pressable, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/StyledText';
import { MarkdownView } from '@/components/markdown/MarkdownView';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { Typography } from '@/constants/Typography';
import { sessionReadFile } from '@/sync/ops';
import { Modal } from '@/modal';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { layout } from '@/components/layout';
import { t } from '@/text';
import { useFileEditor } from '@/hooks/useFileEditor';
import { Ionicons } from '@expo/vector-icons';

type ViewMode = 'preview' | 'edit' | 'split';

export default React.memo(function MarkdownPreviewScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { theme } = useUnistyles();
    const { id: sessionId } = useLocalSearchParams<{ id: string }>();
    const searchParams = useLocalSearchParams();
    const encodedPath = searchParams.path as string;

    let filePath = '';
    try {
        filePath = encodedPath ? atob(encodedPath) : '';
    } catch {
        filePath = encodedPath || '';
    }

    const [isLoading, setIsLoading] = React.useState(true);
    const [rawContent, setRawContent] = React.useState('');
    const [viewMode, setViewMode] = React.useState<ViewMode>('preview');
    const [error, setError] = React.useState<string | null>(null);

    // File editor hook for save
    const editor = useFileEditor({
        sessionId: sessionId!,
        filePath,
        initialContent: rawContent,
    });

    // Debounced preview content
    const [previewContent, setPreviewContent] = React.useState('');
    React.useEffect(() => {
        if (viewMode === 'split' || viewMode === 'preview') {
            const timer = setTimeout(() => {
                setPreviewContent(editor.isEditMode ? editor.editedContent : rawContent);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [editor.editedContent, rawContent, viewMode, editor.isEditMode]);

    // Load file
    React.useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            try {
                const response = await sessionReadFile(sessionId!, filePath);
                if (!cancelled && response.success && response.content) {
                    const binaryString = atob(response.content);
                    const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
                    const decoded = new TextDecoder('utf-8').decode(bytes);
                    setRawContent(decoded);
                    setPreviewContent(decoded);
                }
                if (!cancelled && !response.success) {
                    setError(response.error || 'Failed to load file');
                }
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [sessionId, filePath]);

    // Set header with save button and mode toggle
    React.useEffect(() => {
        if (isLoading) return;

        navigation.setOptions({
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {/* Annotate button */}
                    <TouchableOpacity
                        onPress={() => router.push(`/session/${sessionId}/annotate?path=${encodedPath}`)}
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={22} color={theme.colors.header.tint} />
                    </TouchableOpacity>
                    {editor.isDirty && (
                        <TouchableOpacity
                            onPress={editor.saveFile}
                            disabled={editor.isSaving}
                        >
                            {editor.isSaving ? (
                                <ActivityIndicator size="small" color={theme.colors.header.tint} />
                            ) : (
                                <Ionicons name="save-outline" size={22} color={theme.colors.header.tint} />
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            ),
        });
    }, [isLoading, editor.isDirty, editor.isSaving, navigation, theme, editor.saveFile, router, sessionId, encodedPath]);

    // Enter edit mode when switching to edit/split
    React.useEffect(() => {
        if ((viewMode === 'edit' || viewMode === 'split') && !editor.isEditMode) {
            editor.enterEditMode();
        }
    }, [viewMode, editor.isEditMode, editor.enterEditMode]);

    if (isLoading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.surface }]}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.surface }]}>
                <Text style={{ color: theme.colors.textDestructive, ...Typography.default('semiBold') }}>
                    {error}
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
            {/* Mode toggle bar */}
            <View style={[styles.modeBar, { borderBottomColor: theme.colors.divider }]}>
                {(['preview', 'split', 'edit'] as ViewMode[]).map((mode) => (
                    <Pressable
                        key={mode}
                        onPress={() => setViewMode(mode)}
                        style={[
                            styles.modeButton,
                            {
                                backgroundColor: viewMode === mode
                                    ? theme.colors.textLink
                                    : theme.colors.input.background,
                            },
                        ]}
                    >
                        <Text style={[
                            styles.modeButtonText,
                            {
                                color: viewMode === mode ? 'white' : theme.colors.textSecondary,
                            },
                        ]}>
                            {mode === 'preview' ? t('markdownPreview.preview')
                                : mode === 'split' ? t('markdownPreview.split')
                                : t('markdownPreview.editMode')}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Content */}
            {viewMode === 'preview' && (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16 }}
                >
                    <MarkdownView markdown={previewContent} />
                </ScrollView>
            )}

            {viewMode === 'edit' && (
                <CodeEditor
                    content={editor.editedContent}
                    onChange={editor.setEditedContent}
                    editable={true}
                />
            )}

            {viewMode === 'split' && (
                <View style={{ flex: 1 }}>
                    {/* Editor half */}
                    <View style={{ flex: 1, borderBottomWidth: 2, borderBottomColor: theme.colors.divider }}>
                        <CodeEditor
                            content={editor.editedContent}
                            onChange={editor.setEditedContent}
                            editable={true}
                        />
                    </View>
                    {/* Preview half */}
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 16 }}
                    >
                        <MarkdownView markdown={previewContent} />
                    </ScrollView>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        maxWidth: layout.maxWidth,
        alignSelf: 'center',
        width: '100%',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }),
        gap: 8,
    },
    modeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    modeButtonText: {
        ...Typography.default('semiBold'),
        fontSize: 14,
    },
}));
