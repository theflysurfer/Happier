import React from 'react';
import { View, FlatList } from 'react-native';
import { Text } from '@/components/StyledText';
import { useAllSessions } from '@/sync/storage';
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

    return (
        <Pressable
            style={[
                styles.sessionCard,
                isSingle ? styles.sessionCardSingle :
                    isFirst ? styles.sessionCardFirst :
                        isLast ? styles.sessionCardLast : {}
            ]}
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

    // Extract folder name for display
    const folderName = React.useMemo(() => {
        if (!path) return '';
        const parts = path.split('/').filter(Boolean);
        return parts[parts.length - 1] || path;
    }, [path]);

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
    sessionCard: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginBottom: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
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
