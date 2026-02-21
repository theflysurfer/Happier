import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/StyledText';
import { Typography } from '@/constants/Typography';
import { sessionReadFile } from '@/sync/ops';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { layout } from '@/components/layout';
import { t } from '@/text';
import { PlannotatorModal } from '@/plannotator/components/PlannotatorModal';
import {
    saveAnnotations,
    loadAnnotations,
} from '@/plannotator/storage/annotationStorage';
import type { Annotation } from '@/plannotator/types';

export default React.memo(function AnnotateScreen() {
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
    const [markdown, setMarkdown] = React.useState('');
    const [initialAnnotations, setInitialAnnotations] = React.useState<Annotation[]>([]);
    const [error, setError] = React.useState<string | null>(null);
    const [modalVisible, setModalVisible] = React.useState(false);

    // Load file content and existing annotations
    React.useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            try {
                // Load file
                const response = await sessionReadFile(sessionId!, filePath);
                if (cancelled) return;

                if (response.success && response.content) {
                    const binaryString = atob(response.content);
                    const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
                    const decoded = new TextDecoder('utf-8').decode(bytes);
                    setMarkdown(decoded);
                } else {
                    setError(response.error || 'Failed to load file');
                    return;
                }

                // Load saved annotations
                const stored = loadAnnotations(sessionId!, filePath);
                if (stored && stored.annotations.length > 0) {
                    setInitialAnnotations(stored.annotations);
                }

                // Open modal after loading
                if (!cancelled) {
                    setModalVisible(true);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Unknown error');
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [sessionId, filePath]);

    // Update header with annotation count
    React.useEffect(() => {
        const stored = loadAnnotations(sessionId!, filePath);
        const count = stored?.annotations.length || 0;
        navigation.setOptions({
            headerTitle: count > 0
                ? `${t('annotations.title')} (${count})`
                : t('annotations.title'),
        });
    }, [modalVisible, navigation, sessionId, filePath]);

    // Handle modal close - save and go back
    const handleClose = React.useCallback(() => {
        setModalVisible(false);
        navigation.goBack();
    }, [navigation]);

    // Handle save annotations
    const handleSaveAnnotations = React.useCallback((annotations: Annotation[]) => {
        saveAnnotations(sessionId!, filePath, annotations);
    }, [sessionId, filePath]);

    if (isLoading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.surface }]}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                <Text style={{ color: theme.colors.textSecondary, marginTop: 12, ...Typography.default() }}>
                    {t('fileManager.loading')}
                </Text>
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
            <PlannotatorModal
                visible={modalVisible}
                onClose={handleClose}
                planMarkdown={markdown}
                sessionId={sessionId!}
                mode="file"
                initialAnnotations={initialAnnotations}
                onSaveAnnotations={handleSaveAnnotations}
            />
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
}));
