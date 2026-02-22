import React from 'react';
import { View, FlatList, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/StyledText';
import { useAllSessions, useSessionMessages } from '@/sync/storage';
import { Session } from '@/sync/storageTypes';
import { Avatar } from '@/components/Avatar';
import { getSessionName, getSessionSubtitle, getSessionAvatarId, useSessionStatus } from '@/utils/sessionUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { layout } from '@/components/layout';
import { useNavigateToSession } from '@/hooks/useNavigateToSession';
import { Pressable } from 'react-native';
import { t } from '@/text';
import { useLocalSearchParams } from 'expo-router';
import { StatusDot } from '@/components/StatusDot';
import { Ionicons } from '@expo/vector-icons';
import { MarkdownView } from '@/components/markdown/MarkdownView';
import { formatSessionAsMarkdown } from '@/utils/sessionMarkdown';
import { sync } from '@/sync/sync';
import { sessionKill } from '@/sync/ops';
import { Modal } from '@/modal';
import { useHappyAction } from '@/hooks/useHappyAction';
import { HappyError } from '@/utils/errors';

interface SessionHistoryItem {
    type: 'session' | 'date-header';
    session?: Session;
    date?: string;
}

function formatDateHeader(date: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (sessionDate.getTime() === today.getTime()) {
        return t('sessionHistory.today');
    } else if (sessionDate.getTime() === yesterday.getTime()) {
        return t('sessionHistory.yesterday');
    } else {
        const diffTime = today.getTime() - sessionDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return t('sessionHistory.daysAgo', { count: diffDays });
    }
}

function groupSessionsByDate(sessions: Session[]): SessionHistoryItem[] {
    const sortedSessions = sessions
        .slice()
        .sort((a, b) => b.updatedAt - a.updatedAt);

    const items: SessionHistoryItem[] = [];
    let currentDateGroup: Session[] = [];
    let currentDateString: string | null = null;

    for (const session of sortedSessions) {
        const sessionDate = new Date(session.updatedAt);
        const dateString = sessionDate.toDateString();

        if (currentDateString !== dateString) {
            if (currentDateGroup.length > 0) {
                items.push({
                    type: 'date-header',
                    date: formatDateHeader(new Date(currentDateString!)),
                });
                currentDateGroup.forEach(sess => {
                    items.push({ type: 'session', session: sess });
                });
            }
            currentDateString = dateString;
            currentDateGroup = [session];
        } else {
            currentDateGroup.push(session);
        }
    }

    if (currentDateGroup.length > 0) {
        items.push({
            type: 'date-header',
            date: formatDateHeader(new Date(currentDateString!)),
        });
        currentDateGroup.forEach(sess => {
            items.push({ type: 'session', session: sess });
        });
    }

    return items;
}

// Inline transcript preview, loaded on-demand when expanded
const TranscriptPreview = React.memo(({ session }: { session: Session }) => {
    const { messages, isLoaded } = useSessionMessages(session.id);
    const { theme } = useUnistyles();

    // Trigger message loading
    React.useEffect(() => {
        sync.onSessionVisible(session.id);
    }, [session.id]);

    const markdown = React.useMemo(() => {
        if (!isLoaded) return null;
        const chronological = [...messages].reverse();
        return formatSessionAsMarkdown(session, chronological);
    }, [session, messages, isLoaded]);

    if (!isLoaded || markdown === null) {
        return (
            <View style={styles.previewLoading}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            </View>
        );
    }

    if (messages.length === 0) {
        return (
            <View style={styles.previewEmpty}>
                <Text style={[styles.previewEmptyText, { color: theme.colors.textSecondary }]}>
                    {t('sessionInfo.noMessages')}
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.previewScroll}
            contentContainerStyle={styles.previewContent}
            nestedScrollEnabled={true}
        >
            <MarkdownView markdown={markdown} />
        </ScrollView>
    );
});

const SessionItemRow = React.memo(({ session, isFirst, isLast, isSingle }: {
    session: Session;
    isFirst: boolean;
    isLast: boolean;
    isSingle: boolean;
}) => {
    const navigateToSession = useNavigateToSession();
    const sessionName = getSessionName(session);
    const sessionSubtitle = getSessionSubtitle(session);
    const avatarId = getSessionAvatarId(session);
    const sessionStatus = useSessionStatus(session);
    const { theme } = useUnistyles();
    const [expanded, setExpanded] = React.useState(false);

    const [killing, performKill] = useHappyAction(async () => {
        const result = await sessionKill(session.id);
        if (!result.success) {
            throw new HappyError(result.message || t('sessionInfo.failedToArchiveSession'), false);
        }
    });

    const handleKillSession = React.useCallback(() => {
        Modal.alert(
            t('sessionInfo.killSession'),
            t('sessionInfo.killSessionConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('sessionInfo.killSession'),
                    style: 'destructive',
                    onPress: performKill
                }
            ]
        );
    }, [performKill]);

    return (
        <View style={[
            styles.sessionCardOuter,
            isSingle ? styles.sessionCardSingle :
                isFirst ? styles.sessionCardFirst :
                    isLast ? styles.sessionCardLast : {}
        ]}>
            <View style={styles.sessionCardRow}>
                <Pressable
                    style={styles.sessionCardContent}
                    onPress={() => navigateToSession(session.id)}
                >
                    <Avatar id={avatarId} size={48} monochrome={!sessionStatus.isConnected} flavor={session.metadata?.flavor} />
                    <View style={styles.sessionContent}>
                        <Text style={styles.sessionTitle} numberOfLines={1}>
                            {sessionName}
                        </Text>
                        <Text style={styles.sessionSubtitle} numberOfLines={1}>
                            {sessionSubtitle}
                        </Text>
                        <View style={styles.statusRow}>
                            <StatusDot color={sessionStatus.statusDotColor} isPulsing={sessionStatus.isPulsing} />
                            <Text style={[styles.statusText, { color: sessionStatus.statusColor }]}>
                                {sessionStatus.statusText}
                            </Text>
                        </View>
                    </View>
                </Pressable>
                {sessionStatus.isConnected && (
                    <Pressable
                        style={styles.killButton}
                        onPress={handleKillSession}
                        hitSlop={8}
                    >
                        <Ionicons
                            name="stop-circle-outline"
                            size={22}
                            color="#FF3B30"
                        />
                    </Pressable>
                )}
                <Pressable
                    style={styles.expandButton}
                    onPress={() => setExpanded(prev => !prev)}
                    hitSlop={8}
                >
                    <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.colors.textSecondary}
                    />
                </Pressable>
            </View>
            {expanded && <TranscriptPreview session={session} />}
        </View>
    );
});

export default React.memo(function ProjectSessionsScreen() {
    const safeArea = useSafeAreaInsets();
    const { machineId, path } = useLocalSearchParams<{ machineId: string; path: string }>();
    const allSessions = useAllSessions();
    const { theme } = useUnistyles();

    // Filter sessions by machine + path
    const projectSessions = React.useMemo(() => {
        if (!machineId || !path) return [];
        return allSessions.filter(s =>
            s.metadata?.machineId === machineId &&
            s.metadata?.path === path
        );
    }, [allSessions, machineId, path]);

    const groupedItems = React.useMemo(() => {
        return groupSessionsByDate(projectSessions);
    }, [projectSessions]);

    const renderItem = React.useCallback(({ item, index }: { item: SessionHistoryItem, index: number }) => {
        if (item.type === 'date-header') {
            return (
                <View style={styles.dateHeader}>
                    <Text style={styles.dateHeaderText}>
                        {item.date}
                    </Text>
                </View>
            );
        }

        if (item.type === 'session' && item.session) {
            const prevItem = index > 0 ? groupedItems[index - 1] : null;
            const nextItem = index < groupedItems.length - 1 ? groupedItems[index + 1] : null;
            const isFirst = prevItem?.type === 'date-header';
            const isLast = nextItem?.type === 'date-header' || nextItem == null;
            const isSingle = isFirst && isLast;

            return (
                <SessionItemRow
                    session={item.session}
                    isFirst={isFirst}
                    isLast={isLast}
                    isSingle={isSingle}
                />
            );
        }

        return null;
    }, [groupedItems]);

    const keyExtractor = React.useCallback((item: SessionHistoryItem, index: number) => {
        if (item.type === 'date-header') {
            return `date-${item.date}-${index}`;
        }
        if (item.type === 'session' && item.session) {
            return `session-${item.session.id}`;
        }
        return `item-${index}`;
    }, []);

    if (groupedItems.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.contentContainer}>
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {t('sessionInfo.noProjectSessions')}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                <FlatList
                    data={groupedItems}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    ListHeaderComponent={() => (
                        <View style={styles.headerContainer}>
                            <Text style={[styles.headerCount, { color: theme.colors.textSecondary }]}>
                                {t('sessionInfo.projectSessionsCount', { count: projectSessions.length })}
                            </Text>
                        </View>
                    )}
                    contentContainerStyle={{
                        paddingBottom: safeArea.bottom + 16,
                    }}
                />
            </View>
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        flex: 1,
        maxWidth: layout.maxWidth,
    },
    headerContainer: {
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 4,
    },
    headerCount: {
        ...Typography.default(),
        fontSize: 13,
    },
    dateHeader: {
        backgroundColor: theme.colors.groupped.background,
        paddingTop: 20,
        paddingBottom: 8,
        paddingHorizontal: 24,
    },
    dateHeaderText: {
        ...Typography.default('semiBold'),
        color: theme.colors.groupped.sectionTitle,
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.1,
    },
    sessionCardOuter: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginBottom: 1,
        overflow: 'hidden',
    },
    sessionCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 8,
    },
    sessionCardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    sessionCardFirst: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    sessionCardLast: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        marginBottom: 12,
    },
    sessionCardSingle: {
        borderRadius: 12,
        marginBottom: 12,
    },
    sessionContent: {
        flex: 1,
        marginLeft: 16,
    },
    sessionTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 2,
        ...Typography.default('semiBold'),
    },
    sessionSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 4,
        ...Typography.default(),
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
        ...Typography.default(),
    },
    killButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    expandButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Transcript preview styles
    previewScroll: {
        maxHeight: 400,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
    },
    previewContent: {
        padding: 16,
    },
    previewLoading: {
        padding: 24,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
    },
    previewEmpty: {
        padding: 24,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
    },
    previewEmptyText: {
        ...Typography.default(),
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        ...Typography.default(),
    },
}));
