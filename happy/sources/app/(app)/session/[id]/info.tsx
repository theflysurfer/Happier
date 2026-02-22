import React, { useCallback } from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/Typography';
import { Item } from '@/components/Item';
import { ItemGroup } from '@/components/ItemGroup';
import { ItemList } from '@/components/ItemList';
import { Avatar } from '@/components/Avatar';
import { useSession, useIsDataReady, useSessionMessages, useAllMachines } from '@/sync/storage';
import { getSessionName, useSessionStatus, formatOSPlatform, formatPathRelativeToHome, getSessionAvatarId } from '@/utils/sessionUtils';
import * as Clipboard from 'expo-clipboard';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Modal } from '@/modal';
import { sessionKill, sessionDelete, machineSpawnNewSession } from '@/sync/ops';
import { useUnistyles } from 'react-native-unistyles';
import { layout } from '@/components/layout';
import { t } from '@/text';
import { isVersionSupported, MINIMUM_CLI_VERSION } from '@/utils/versionUtils';
import { CodeView } from '@/components/CodeView';
import { Session } from '@/sync/storageTypes';
import { useHappyAction } from '@/hooks/useHappyAction';
import { HappyError } from '@/utils/errors';
import { isMachineOnline } from '@/utils/machineUtils';
import { useNavigateToSession } from '@/hooks/useNavigateToSession';
import { formatSessionAsMarkdown } from '@/utils/sessionMarkdown';
import { sync } from '@/sync/sync';
import { useMemoryMonitor } from '@/hooks/useMemoryMonitor';
import { formatBytes } from '@/utils/formatBytes';

// Animated status dot component
function StatusDot({ color, isPulsing, size = 8 }: { color: string; isPulsing?: boolean; size?: number }) {
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        if (isPulsing) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 0.3,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isPulsing, pulseAnim]);

    return (
        <Animated.View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: pulseAnim,
                marginRight: 4,
            }}
        />
    );
}

function SessionInfoContent({ session }: { session: Session }) {
    const { theme } = useUnistyles();
    const router = useRouter();
    const devModeEnabled = __DEV__;
    const sessionName = getSessionName(session);
    const sessionStatus = useSessionStatus(session);
    const navigateToSession = useNavigateToSession();
    const machines = useAllMachines();
    const { messages, isLoaded: messagesLoaded } = useSessionMessages(session.id);

    // Check if CLI version is outdated
    const isCliOutdated = session.metadata?.version && !isVersionSupported(session.metadata.version, MINIMUM_CLI_VERSION);

    // Check if the session's machine is online (for reactivation)
    const sessionMachine = React.useMemo(() => {
        if (!session.metadata?.machineId) return null;
        return machines.find(m => m.id === session.metadata!.machineId) ?? null;
    }, [machines, session.metadata?.machineId]);
    const machineIsOnline = sessionMachine ? isMachineOnline(sessionMachine) : false;

    // Memory monitoring
    const memoryStatus = useMemoryMonitor(
        session.metadata?.machineId,
        sessionStatus.isConnected
    );

    // Restart session due to memory pressure
    const [restarting, performMemoryRestart] = useHappyAction(async () => {
        if (!session.metadata?.machineId || !session.metadata?.path) {
            throw new HappyError(t('sessionInfo.failedToReactivateSession'), false);
        }
        // Kill current session
        await sessionKill(session.id);
        // Spawn new one in same directory
        const result = await machineSpawnNewSession({
            machineId: session.metadata.machineId,
            directory: session.metadata.path,
        });
        if (result.type === 'success') {
            navigateToSession(result.sessionId);
        }
    });

    const handleMemoryRestart = useCallback(() => {
        Modal.alert(
            t('memory.title'),
            t('memory.restartConversationConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('memory.restartConversation'),
                    style: 'destructive',
                    onPress: performMemoryRestart
                }
            ]
        );
    }, [performMemoryRestart]);

    const handleCopySessionId = useCallback(async () => {
        if (!session) return;
        try {
            await Clipboard.setStringAsync(session.id);
            Modal.alert(t('common.success'), t('sessionInfo.happySessionIdCopied'));
        } catch (error) {
            Modal.alert(t('common.error'), t('sessionInfo.failedToCopySessionId'));
        }
    }, [session]);

    const handleCopyMetadata = useCallback(async () => {
        if (!session?.metadata) return;
        try {
            await Clipboard.setStringAsync(JSON.stringify(session.metadata, null, 2));
            Modal.alert(t('common.success'), t('sessionInfo.metadataCopied'));
        } catch (error) {
            Modal.alert(t('common.error'), t('sessionInfo.failedToCopyMetadata'));
        }
    }, [session]);

    // Use HappyAction for archiving - it handles errors automatically
    const [archivingSession, performArchive] = useHappyAction(async () => {
        const result = await sessionKill(session.id);
        if (!result.success) {
            throw new HappyError(result.message || t('sessionInfo.failedToArchiveSession'), false);
        }
        // Success - navigate back
        router.back();
        router.back();
    });

    const handleArchiveSession = useCallback(() => {
        Modal.alert(
            t('sessionInfo.archiveSession'),
            t('sessionInfo.archiveSessionConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('sessionInfo.archiveSession'),
                    style: 'destructive',
                    onPress: performArchive
                }
            ]
        );
    }, [performArchive]);

    // Use HappyAction for deletion - it handles errors automatically
    const [deletingSession, performDelete] = useHappyAction(async () => {
        const result = await sessionDelete(session.id);
        if (!result.success) {
            throw new HappyError(result.message || t('sessionInfo.failedToDeleteSession'), false);
        }
        // Success - no alert needed, UI will update to show deleted state
    });

    const handleDeleteSession = useCallback(() => {
        Modal.alert(
            t('sessionInfo.deleteSession'),
            t('sessionInfo.deleteSessionWarning'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('sessionInfo.deleteSession'),
                    style: 'destructive',
                    onPress: performDelete
                }
            ]
        );
    }, [performDelete]);

    const formatDate = useCallback((timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    }, []);

    // Reactivate session - spawn new session in same directory on same machine
    const [reactivating, performReactivate] = useHappyAction(async () => {
        if (!session.metadata?.machineId || !session.metadata?.path) {
            throw new HappyError(t('sessionInfo.failedToReactivateSession'), false);
        }
        if (!machineIsOnline) {
            throw new HappyError(t('sessionInfo.machineOffline'), false);
        }
        const result = await machineSpawnNewSession({
            machineId: session.metadata.machineId,
            directory: session.metadata.path,
        });
        if (result.type === 'success') {
            navigateToSession(result.sessionId);
        } else if (result.type === 'error') {
            throw new HappyError(result.errorMessage, false);
        }
    });

    const handleReactivateSession = useCallback(() => {
        Modal.alert(
            t('sessionInfo.reactivateSession'),
            t('sessionInfo.reactivateSessionConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('sessionInfo.reactivateSession'),
                    onPress: performReactivate
                }
            ]
        );
    }, [performReactivate]);

    // Export session as markdown
    const [exporting, performExport] = useHappyAction(async () => {
        // Ensure messages are loaded
        if (!messagesLoaded) {
            sync.onSessionVisible(session.id);
            // Wait briefly for messages to load
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const currentMessages = messages;
        const markdown = formatSessionAsMarkdown(session, currentMessages);
        const fileName = `session-${sessionName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50)}.md`;

        if (Platform.OS === 'web') {
            await Clipboard.setStringAsync(markdown);
            Modal.alert(t('common.success'), t('sessionInfo.markdownCopied'));
        } else {
            const file = new ExpoFile(Paths.cache, fileName);
            file.write(markdown);
            const fileUri = file.uri;
            await Sharing.shareAsync(fileUri, {
                mimeType: 'text/markdown',
                dialogTitle: t('sessionInfo.exportMarkdown'),
            });
        }
    });

    const handleCopyUpdateCommand = useCallback(async () => {
        const updateCommand = 'npm install -g happy-coder@latest';
        try {
            await Clipboard.setStringAsync(updateCommand);
            Modal.alert(t('common.success'), updateCommand);
        } catch (error) {
            Modal.alert(t('common.error'), t('common.error'));
        }
    }, []);

    return (
        <>
            <ItemList>
                {/* Session Header */}
                <View style={{ maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }}>
                    <View style={{ alignItems: 'center', paddingVertical: 24, backgroundColor: theme.colors.surface, marginBottom: 8, borderRadius: 12, marginHorizontal: 16, marginTop: 16 }}>
                        <Avatar id={getSessionAvatarId(session)} size={80} monochrome={!sessionStatus.isConnected} flavor={session.metadata?.flavor} />
                        <Text style={{
                            fontSize: 20,
                            fontWeight: '600',
                            marginTop: 12,
                            textAlign: 'center',
                            color: theme.colors.text,
                            ...Typography.default('semiBold')
                        }}>
                            {sessionName}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            <StatusDot color={sessionStatus.statusDotColor} isPulsing={sessionStatus.isPulsing} size={10} />
                            <Text style={{
                                fontSize: 15,
                                color: sessionStatus.statusColor,
                                fontWeight: '500',
                                ...Typography.default()
                            }}>
                                {sessionStatus.statusText}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* CLI Version Warning */}
                {isCliOutdated && (
                    <ItemGroup>
                        <Item
                            title={t('sessionInfo.cliVersionOutdated')}
                            subtitle={t('sessionInfo.updateCliInstructions')}
                            icon={<Ionicons name="warning-outline" size={29} color="#FF9500" />}
                            showChevron={false}
                            onPress={handleCopyUpdateCommand}
                        />
                    </ItemGroup>
                )}

                {/* Session Details */}
                <ItemGroup>
                    <Item
                        title={t('sessionInfo.happySessionId')}
                        subtitle={`${session.id.substring(0, 8)}...${session.id.substring(session.id.length - 8)}`}
                        icon={<Ionicons name="finger-print-outline" size={29} color="#007AFF" />}
                        onPress={handleCopySessionId}
                    />
                    {session.metadata?.claudeSessionId && (
                        <Item
                            title={t('sessionInfo.claudeCodeSessionId')}
                            subtitle={`${session.metadata.claudeSessionId.substring(0, 8)}...${session.metadata.claudeSessionId.substring(session.metadata.claudeSessionId.length - 8)}`}
                            icon={<Ionicons name="code-outline" size={29} color="#9C27B0" />}
                            onPress={async () => {
                                try {
                                    await Clipboard.setStringAsync(session.metadata!.claudeSessionId!);
                                    Modal.alert(t('common.success'), t('sessionInfo.claudeCodeSessionIdCopied'));
                                } catch (error) {
                                    Modal.alert(t('common.error'), t('sessionInfo.failedToCopyClaudeCodeSessionId'));
                                }
                            }}
                        />
                    )}
                    <Item
                        title={t('sessionInfo.connectionStatus')}
                        detail={sessionStatus.isConnected ? t('status.online') : t('status.offline')}
                        icon={<Ionicons name="pulse-outline" size={29} color={sessionStatus.isConnected ? "#34C759" : "#8E8E93"} />}
                        showChevron={false}
                    />
                    <Item
                        title={t('sessionInfo.created')}
                        subtitle={formatDate(session.createdAt)}
                        icon={<Ionicons name="calendar-outline" size={29} color="#007AFF" />}
                        showChevron={false}
                    />
                    <Item
                        title={t('sessionInfo.lastUpdated')}
                        subtitle={formatDate(session.updatedAt)}
                        icon={<Ionicons name="time-outline" size={29} color="#007AFF" />}
                        showChevron={false}
                    />
                    <Item
                        title={t('sessionInfo.sequence')}
                        detail={session.seq.toString()}
                        icon={<Ionicons name="git-commit-outline" size={29} color="#007AFF" />}
                        showChevron={false}
                    />
                </ItemGroup>

                {/* Quick Actions */}
                <ItemGroup title={t('sessionInfo.quickActions')}>
                    {session.metadata?.machineId && session.metadata?.path && (
                        <Item
                            title={t('sessionInfo.viewProjectSessions')}
                            subtitle={t('sessionInfo.viewProjectSessionsSubtitle')}
                            icon={<Ionicons name="layers-outline" size={29} color="#007AFF" />}
                            onPress={() => router.push({
                                pathname: '/session/project-sessions' as any,
                                params: {
                                    machineId: session.metadata!.machineId!,
                                    path: session.metadata!.path,
                                }
                            })}
                        />
                    )}
                    {session.metadata?.machineId && (
                        <Item
                            title={t('sessionInfo.viewMachine')}
                            subtitle={t('sessionInfo.viewMachineSubtitle')}
                            icon={<Ionicons name="server-outline" size={29} color="#007AFF" />}
                            onPress={() => router.push(`/machine/${session.metadata?.machineId}`)}
                        />
                    )}
                    <Item
                        title={t('sessionInfo.viewTranscript')}
                        subtitle={t('sessionInfo.viewTranscriptSubtitle')}
                        icon={<Ionicons name="reader-outline" size={29} color="#007AFF" />}
                        onPress={() => router.push(`/session/${session.id}/transcript`)}
                    />
                    <Item
                        title={t('sessionInfo.exportMarkdown')}
                        subtitle={t('sessionInfo.exportMarkdownSubtitle')}
                        icon={<Ionicons name="document-text-outline" size={29} color="#007AFF" />}
                        onPress={performExport}
                    />
                    {!sessionStatus.isConnected && session.metadata?.machineId && session.metadata?.path && (
                        <Item
                            title={t('sessionInfo.reactivateSession')}
                            subtitle={machineIsOnline ? t('sessionInfo.reactivateSessionSubtitle') : t('sessionInfo.machineOffline')}
                            icon={<Ionicons name="play-outline" size={29} color={machineIsOnline ? "#34C759" : "#8E8E93"} />}
                            onPress={machineIsOnline ? handleReactivateSession : undefined}
                        />
                    )}
                    {sessionStatus.isConnected && (
                        <Item
                            title={t('sessionInfo.archiveSession')}
                            subtitle={t('sessionInfo.archiveSessionSubtitle')}
                            icon={<Ionicons name="archive-outline" size={29} color="#FF3B30" />}
                            onPress={handleArchiveSession}
                        />
                    )}
                    {!sessionStatus.isConnected && (
                        <Item
                            title={t('sessionInfo.deleteSession')}
                            subtitle={t('sessionInfo.deleteSessionSubtitle')}
                            icon={<Ionicons name="trash-outline" size={29} color="#FF3B30" />}
                            onPress={handleDeleteSession}
                        />
                    )}
                </ItemGroup>

                {/* Metadata */}
                {session.metadata && (
                    <ItemGroup title={t('sessionInfo.metadata')}>
                        <Item
                            title={t('sessionInfo.host')}
                            subtitle={session.metadata.host}
                            icon={<Ionicons name="desktop-outline" size={29} color="#5856D6" />}
                            showChevron={false}
                        />
                        <Item
                            title={t('sessionInfo.path')}
                            subtitle={formatPathRelativeToHome(session.metadata.path, session.metadata.homeDir)}
                            icon={<Ionicons name="folder-outline" size={29} color="#5856D6" />}
                            showChevron={false}
                        />
                        {session.metadata.version && (
                            <Item
                                title={t('sessionInfo.cliVersion')}
                                subtitle={session.metadata.version}
                                detail={isCliOutdated ? '⚠️' : undefined}
                                icon={<Ionicons name="git-branch-outline" size={29} color={isCliOutdated ? "#FF9500" : "#5856D6"} />}
                                showChevron={false}
                            />
                        )}
                        {session.metadata.os && (
                            <Item
                                title={t('sessionInfo.operatingSystem')}
                                subtitle={formatOSPlatform(session.metadata.os)}
                                icon={<Ionicons name="hardware-chip-outline" size={29} color="#5856D6" />}
                                showChevron={false}
                            />
                        )}
                        <Item
                            title={t('sessionInfo.aiProvider')}
                            subtitle={(() => {
                                const flavor = session.metadata.flavor || 'claude';
                                if (flavor === 'claude') return 'Claude';
                                if (flavor === 'gpt' || flavor === 'openai') return 'Codex';
                                if (flavor === 'gemini') return 'Gemini';
                                return flavor;
                            })()}
                            icon={<Ionicons name="sparkles-outline" size={29} color="#5856D6" />}
                            showChevron={false}
                        />
                        {session.metadata.hostPid && (
                            <Item
                                title={t('sessionInfo.processId')}
                                subtitle={session.metadata.hostPid.toString()}
                                icon={<Ionicons name="terminal-outline" size={29} color="#5856D6" />}
                                showChevron={false}
                            />
                        )}
                        {session.metadata.happyHomeDir && (
                            <Item
                                title={t('sessionInfo.happyHome')}
                                subtitle={formatPathRelativeToHome(session.metadata.happyHomeDir, session.metadata.homeDir)}
                                icon={<Ionicons name="home-outline" size={29} color="#5856D6" />}
                                showChevron={false}
                            />
                        )}
                        <Item
                            title={t('sessionInfo.copyMetadata')}
                            icon={<Ionicons name="copy-outline" size={29} color="#007AFF" />}
                            onPress={handleCopyMetadata}
                        />
                    </ItemGroup>
                )}

                {/* Agent State */}
                {session.agentState && (
                    <ItemGroup title={t('sessionInfo.agentState')}>
                        <Item
                            title={t('sessionInfo.controlledByUser')}
                            detail={session.agentState.controlledByUser ? t('common.yes') : t('common.no')}
                            icon={<Ionicons name="person-outline" size={29} color="#FF9500" />}
                            showChevron={false}
                        />
                        {session.agentState.requests && Object.keys(session.agentState.requests).length > 0 && (
                            <Item
                                title={t('sessionInfo.pendingRequests')}
                                detail={Object.keys(session.agentState.requests).length.toString()}
                                icon={<Ionicons name="hourglass-outline" size={29} color="#FF9500" />}
                                showChevron={false}
                            />
                        )}
                    </ItemGroup>
                )}

                {/* Activity */}
                <ItemGroup title={t('sessionInfo.activity')}>
                    <Item
                        title={t('sessionInfo.thinking')}
                        detail={session.thinking ? t('common.yes') : t('common.no')}
                        icon={<Ionicons name="bulb-outline" size={29} color={session.thinking ? "#FFCC00" : "#8E8E93"} />}
                        showChevron={false}
                    />
                    {session.thinking && (
                        <Item
                            title={t('sessionInfo.thinkingSince')}
                            subtitle={formatDate(session.thinkingAt)}
                            icon={<Ionicons name="timer-outline" size={29} color="#FFCC00" />}
                            showChevron={false}
                        />
                    )}
                </ItemGroup>

                {/* Memory Monitoring */}
                {sessionStatus.isConnected && memoryStatus.current && (
                    <ItemGroup title={t('memory.title')}>
                        <Item
                            title={t('memory.claudeProcessMemory')}
                            detail={formatBytes(memoryStatus.current.claudeRssBytes)}
                            icon={<Ionicons name="hardware-chip-outline" size={29} color={
                                memoryStatus.level === 'critical' ? '#FF3B30' :
                                memoryStatus.level === 'high' ? '#FF9500' :
                                memoryStatus.level === 'elevated' ? '#FF9500' :
                                '#34C759'
                            } />}
                            showChevron={false}
                        />
                        <Item
                            title={t('memory.systemMemory')}
                            subtitle={t('memory.systemAvailable', {
                                available: formatBytes(memoryStatus.current.systemAvailableBytes),
                                total: formatBytes(memoryStatus.current.systemTotalBytes)
                            })}
                            icon={<Ionicons name="server-outline" size={29} color="#5856D6" />}
                            showChevron={false}
                        />
                        <Item
                            title={t('memory.trend')}
                            detail={
                                memoryStatus.trend === 'stable' ? t('memory.trendStable') :
                                memoryStatus.trend === 'increasing' ? t('memory.trendIncreasing') :
                                memoryStatus.trend === 'decreasing' ? t('memory.trendDecreasing') :
                                t('memory.trendUnknown')
                            }
                            icon={<Ionicons
                                name={
                                    memoryStatus.trend === 'increasing' ? 'trending-up' :
                                    memoryStatus.trend === 'decreasing' ? 'trending-down' :
                                    'remove-outline'
                                }
                                size={29}
                                color={memoryStatus.trend === 'increasing' ? '#FF9500' : '#5856D6'}
                            />}
                            showChevron={false}
                        />
                        {memoryStatus.level === 'critical' && (
                            <Item
                                title={t('memory.restartConversation')}
                                subtitle={t('memory.restartConversationSubtitle')}
                                icon={<Ionicons name="refresh-outline" size={29} color="#FF3B30" />}
                                onPress={handleMemoryRestart}
                                loading={restarting}
                                destructive
                            />
                        )}
                    </ItemGroup>
                )}

                {/* Raw JSON (Dev Mode Only) */}
                {devModeEnabled && (
                    <ItemGroup title="Raw JSON (Dev Mode)">
                        {session.agentState && (
                            <>
                                <Item
                                    title="Agent State"
                                    icon={<Ionicons name="code-working-outline" size={29} color="#FF9500" />}
                                    showChevron={false}
                                />
                                <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
                                    <CodeView 
                                        code={JSON.stringify(session.agentState, null, 2)}
                                        language="json"
                                    />
                                </View>
                            </>
                        )}
                        {session.metadata && (
                            <>
                                <Item
                                    title="Metadata"
                                    icon={<Ionicons name="information-circle-outline" size={29} color="#5856D6" />}
                                    showChevron={false}
                                />
                                <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
                                    <CodeView 
                                        code={JSON.stringify(session.metadata, null, 2)}
                                        language="json"
                                    />
                                </View>
                            </>
                        )}
                        {sessionStatus && (
                            <>
                                <Item
                                    title="Session Status"
                                    icon={<Ionicons name="analytics-outline" size={29} color="#007AFF" />}
                                    showChevron={false}
                                />
                                <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
                                    <CodeView 
                                        code={JSON.stringify({
                                            isConnected: sessionStatus.isConnected,
                                            statusText: sessionStatus.statusText,
                                            statusColor: sessionStatus.statusColor,
                                            statusDotColor: sessionStatus.statusDotColor,
                                            isPulsing: sessionStatus.isPulsing
                                        }, null, 2)}
                                        language="json"
                                    />
                                </View>
                            </>
                        )}
                        {/* Full Session Object */}
                        <Item
                            title="Full Session Object"
                            icon={<Ionicons name="document-text-outline" size={29} color="#34C759" />}
                            showChevron={false}
                        />
                        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
                            <CodeView 
                                code={JSON.stringify(session, null, 2)}
                                language="json"
                            />
                        </View>
                    </ItemGroup>
                )}
            </ItemList>
        </>
    );
}

export default React.memo(() => {
    const { theme } = useUnistyles();
    const { id } = useLocalSearchParams<{ id: string }>();
    const session = useSession(id);
    const isDataReady = useIsDataReady();

    // Handle three states: loading, deleted, and exists
    if (!isDataReady) {
        // Still loading data
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="hourglass-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={{ color: theme.colors.textSecondary, fontSize: 17, marginTop: 16, ...Typography.default('semiBold') }}>{t('common.loading')}</Text>
            </View>
        );
    }

    if (!session) {
        // Session has been deleted or doesn't exist
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="trash-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={{ color: theme.colors.text, fontSize: 20, marginTop: 16, ...Typography.default('semiBold') }}>{t('errors.sessionDeleted')}</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 15, marginTop: 8, textAlign: 'center', paddingHorizontal: 32, ...Typography.default() }}>{t('errors.sessionDeletedDescription')}</Text>
            </View>
        );
    }

    return <SessionInfoContent session={session} />;
});
