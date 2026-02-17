import * as React from 'react';
import { View, ActivityIndicator, RefreshControl, Platform } from 'react-native';
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
import { Octicons } from '@expo/vector-icons';
import type { TreeNode } from '@/sync/ops';

export default React.memo(function FileManagerScreen() {
    const route = useRoute();
    const router = useRouter();
    const sessionId = (route.params! as any).id as string;
    const { theme } = useUnistyles();

    const fm = useFileManager(sessionId);

    const [selectedNode, setSelectedNode] = React.useState<TreeNode | null>(null);
    const [actionsVisible, setActionsVisible] = React.useState(false);

    // Refresh on focus
    useFocusEffect(
        React.useCallback(() => {
            fm.refresh();
        }, [fm.refresh])
    );

    const handleFilePress = React.useCallback((path: string) => {
        const encodedPath = btoa(path);
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
            const encodedPath = btoa(fullPath);
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
                {fm.tree ? (
                    <View style={[styles.treeContainer, { backgroundColor: theme.colors.surface }]}>
                        <TreeView
                            tree={fm.tree}
                            expandedPaths={fm.expandedPaths}
                            onToggleExpand={fm.toggleExpand}
                            onFilePress={handleFilePress}
                            onLongPress={handleLongPress}
                        />
                    </View>
                ) : null}
            </ItemList>

            {/* File actions bottom sheet */}
            <FileActions
                visible={actionsVisible}
                node={selectedNode}
                onClose={() => setActionsVisible(false)}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onRename={handleRename}
                onDelete={handleDelete}
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
    treeContainer: {
        marginHorizontal: Platform.select({ ios: 16, default: 12 }),
        borderRadius: Platform.select({ ios: 10, default: 16 }),
        overflow: 'hidden',
        marginTop: 16,
    },
}));
