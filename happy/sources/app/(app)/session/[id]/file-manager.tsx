import * as React from 'react';
import { View, ActivityIndicator, RefreshControl, Platform, TextInput } from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/StyledText';
import { ItemList } from '@/components/ItemList';
import { Typography } from '@/constants/Typography';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { layout } from '@/components/layout';
import { t } from '@/text';
import { Modal } from '@/modal';
import { useFileManager } from '@/hooks/useFileManager';
import { Breadcrumb } from '@/components/filemanager/Breadcrumb';
import { TreeView } from '@/components/filemanager/TreeView';
import { FileActions } from '@/components/filemanager/FileActions';
import { Ionicons, Octicons } from '@expo/vector-icons';
import type { TreeNode } from '@/sync/ops';
import { sessionBash } from '@/sync/ops';
import { storage } from '@/sync/storage';

export default React.memo(function FileManagerScreen() {
    const route = useRoute();
    const router = useRouter();
    const sessionId = (route.params! as any).id as string;
    const { theme } = useUnistyles();

    const fm = useFileManager(sessionId);

    const [selectedNode, setSelectedNode] = React.useState<TreeNode | null>(null);
    const [actionsVisible, setActionsVisible] = React.useState(false);
    const [clipboard, setClipboard] = React.useState<{ path: string; mode: 'copy' | 'cut' } | null>(null);
    const [searchQuery, setSearchQuery] = React.useState('');

    // Refresh on focus
    useFocusEffect(
        React.useCallback(() => {
            fm.refresh();
        }, [fm.refresh])
    );

    const handleFilePress = React.useCallback((path: string) => {
        const encodedPath = encodeURIComponent(path);
        router.push(`/session/${sessionId}/file?path=${encodedPath}`);
    }, [router, sessionId]);

    const handleLongPress = React.useCallback((node: TreeNode) => {
        setSelectedNode(node);
        setActionsVisible(true);
    }, []);

    const handleCreateFile = React.useCallback(async (parentPath: string) => {
        const value = await Modal.prompt(
            t('fileManager.createFile'),
            t('fileManager.fileName'),
            { placeholder: t('fileManager.fileName') }
        );
        if (!value || !value.trim()) return;
        try {
            const fullPath = await fm.createFile(parentPath, value.trim());
            const encodedPath = encodeURIComponent(fullPath);
            router.push(`/session/${sessionId}/file?path=${encodedPath}`);
        } catch (error) {
            Modal.alert(t('common.error'), error instanceof Error ? error.message : 'Failed');
        }
    }, [fm, router, sessionId]);

    const handleCreateFolder = React.useCallback(async (parentPath: string) => {
        const value = await Modal.prompt(
            t('fileManager.createFolder'),
            t('fileManager.folderName'),
            { placeholder: t('fileManager.folderName') }
        );
        if (!value || !value.trim()) return;
        try {
            await fm.createFolder(parentPath, value.trim());
        } catch (error) {
            Modal.alert(t('common.error'), error instanceof Error ? error.message : 'Failed');
        }
    }, [fm]);

    const handleRename = React.useCallback(async (node: TreeNode) => {
        const value = await Modal.prompt(
            t('fileManager.rename'),
            t('fileManager.newName'),
            { placeholder: t('fileManager.newName'), defaultValue: node.name }
        );
        if (!value || !value.trim()) return;
        try {
            await fm.renameItem(node.path, value.trim());
        } catch (error) {
            Modal.alert(t('common.error'), error instanceof Error ? error.message : 'Failed');
        }
    }, [fm]);

    const handleDelete = React.useCallback((node: TreeNode) => {
        Modal.alert(
            t('fileManager.delete'),
            t('fileManager.confirmDelete', { name: node.name }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('fileManager.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await fm.deleteItem(node.path, node.type === 'directory');
                        } catch (error) {
                            Modal.alert(t('common.error'), error instanceof Error ? error.message : 'Failed');
                        }
                    },
                },
            ]
        );
    }, [fm]);

    const handleCopy = React.useCallback((node: TreeNode) => {
        setClipboard({ path: node.path, mode: 'copy' });
    }, []);

    const handleCut = React.useCallback((node: TreeNode) => {
        setClipboard({ path: node.path, mode: 'cut' });
    }, []);

    const handlePaste = React.useCallback(async (destinationPath: string) => {
        if (!clipboard) return;
        const session = storage.getState().sessions[sessionId];
        const sessionPath = session?.metadata?.path;
        if (!sessionPath) return;
        try {
            const srcName = clipboard.path.split('/').pop() || '';
            const destFullPath = `${destinationPath}/${srcName}`;
            const cmd = clipboard.mode === 'cut'
                ? `mv "${clipboard.path}" "${destFullPath}"`
                : `cp -r "${clipboard.path}" "${destFullPath}"`;
            await sessionBash(sessionId, { command: cmd, cwd: sessionPath, timeout: 10000 });
            if (clipboard.mode === 'cut') setClipboard(null);
            fm.refresh();
        } catch (error) {
            Modal.alert(t('common.error'), error instanceof Error ? error.message : 'Failed to paste');
        }
    }, [clipboard, sessionId, fm]);

    // Filter tree by search query
    const filteredTree = React.useMemo(() => {
        if (!searchQuery.trim() || !fm.tree) return fm.tree;
        const query = searchQuery.toLowerCase();
        function filterNode(node: TreeNode): TreeNode | null {
            if (node.type === 'file') {
                return node.name.toLowerCase().includes(query) ? node : null;
            }
            const filteredChildren = (node.children || [])
                .map(filterNode)
                .filter(Boolean) as TreeNode[];
            if (filteredChildren.length > 0 || node.name.toLowerCase().includes(query)) {
                return { ...node, children: filteredChildren };
            }
            return null;
        }
        const result = filterNode(fm.tree);
        return result || fm.tree;
    }, [fm.tree, searchQuery]);

    if (fm.isLoading && !fm.tree) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.surface }]}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                    {t('fileManager.loading')}
                </Text>
            </View>
        );
    }

    if (fm.error && !fm.tree) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.surface }]}>
                <Octicons name="alert" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
                    {fm.error}
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
            {/* Breadcrumb navigation */}
            <Breadcrumb
                path={fm.currentPath}
                rootPath={fm.rootPath}
                onNavigate={fm.navigateTo}
            />

            {/* Search bar */}
            <View style={[styles.searchContainer, { borderBottomColor: theme.colors.divider }]}>
                <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    placeholder={t('fileManager.search')}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <Ionicons
                        name="close-circle"
                        size={18}
                        color={theme.colors.textSecondary}
                        onPress={() => setSearchQuery('')}
                    />
                )}
            </View>

            {/* Tree view */}
            <ItemList
                style={{ flex: 1 }}
                refreshControl={
                    <RefreshControl
                        refreshing={fm.isLoading}
                        onRefresh={fm.refresh}
                        tintColor={theme.colors.textSecondary}
                    />
                }
            >
                {filteredTree ? (
                    <View style={[styles.treeContainer, { backgroundColor: theme.colors.surface }]}>
                        <TreeView
                            tree={filteredTree}
                            expandedPaths={fm.expandedPaths}
                            onToggleExpand={fm.toggleExpand}
                            onFilePress={handleFilePress}
                            onLongPress={handleLongPress}
                            sessionId={sessionId}
                        />
                    </View>
                ) : null}
            </ItemList>

            {/* File actions bottom sheet */}
            <FileActions
                visible={actionsVisible}
                node={selectedNode}
                clipboard={clipboard}
                onClose={() => setActionsVisible(false)}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onRename={handleRename}
                onDelete={handleDelete}
                onCopy={handleCopy}
                onCut={handleCut}
                onPaste={handlePaste}
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
        padding: 20,
    },
    loadingText: {
        ...Typography.default(),
        fontSize: 16,
        marginTop: 16,
    },
    errorText: {
        ...Typography.default(),
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
        borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }),
    },
    searchInput: {
        flex: 1,
        ...Typography.default(),
        fontSize: 16,
        paddingVertical: 4,
    },
    treeContainer: {
        marginHorizontal: Platform.select({ ios: 16, default: 12 }),
        borderRadius: Platform.select({ ios: 10, default: 16 }),
        overflow: 'hidden',
        marginTop: 16,
    },
}));
