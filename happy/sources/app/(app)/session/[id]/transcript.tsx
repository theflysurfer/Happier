import * as React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/StyledText';
import { MarkdownView } from '@/components/markdown/MarkdownView';
import { useSession, useSessionMessages } from '@/sync/storage';
import { sync } from '@/sync/sync';
import { formatSessionAsMarkdown } from '@/utils/sessionMarkdown';
import { layout } from '@/components/layout';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { t } from '@/text';
import { Ionicons } from '@expo/vector-icons';

export default React.memo(function TranscriptScreen() {
    const { id: sessionId } = useLocalSearchParams<{ id: string }>();
    const session = useSession(sessionId!);
    const { messages, isLoaded } = useSessionMessages(sessionId!);
    const { theme } = useUnistyles();

    // Trigger message fetch on mount
    React.useEffect(() => {
        if (sessionId) {
            sync.onSessionVisible(sessionId);
        }
    }, [sessionId]);

    // Messages are stored newest-first; reverse for chronological order
    const markdown = React.useMemo(() => {
        if (!session || !isLoaded) return null;
        const chronological = [...messages].reverse();
        return formatSessionAsMarkdown(session, chronological);
    }, [session, messages, isLoaded]);

    if (!isLoaded || markdown === null) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                    {t('common.loading')}
                </Text>
            </View>
        );
    }

    if (!session) {
        return (
            <View style={styles.center}>
                <Ionicons name="trash-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.deletedText, { color: theme.colors.text }]}>
                    {t('errors.sessionDeleted')}
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
        >
            <MarkdownView markdown={markdown} />
        </ScrollView>
    );
});

const styles = StyleSheet.create((theme) => ({
    scrollView: {
        flex: 1,
        maxWidth: layout.maxWidth,
        alignSelf: 'center' as const,
        width: '100%',
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    center: {
        flex: 1,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        gap: 12,
    },
    loadingText: {
        ...Typography.default(),
        fontSize: 15,
    },
    deletedText: {
        ...Typography.default('semiBold'),
        fontSize: 20,
        marginTop: 16,
    },
}));
