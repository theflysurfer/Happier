import * as React from 'react';
import { View, Platform } from 'react-native';
import { Item } from '@/components/Item';
import { Ionicons, Octicons } from '@expo/vector-icons';
import { Modal as AppModal } from '@/modal';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { t } from '@/text';
import type { TreeNode } from '@/sync/ops';
import {
    Modal as RNModal,
} from 'react-native';

interface FileActionsProps {
    visible: boolean;
    node: TreeNode | null;
    clipboard: { path: string; mode: 'copy' | 'cut' } | null;
    onClose: () => void;
    onCreateFile: (parentPath: string) => void;
    onCreateFolder: (parentPath: string) => void;
    onRename: (node: TreeNode) => void;
    onDelete: (node: TreeNode) => void;
    onCopy: (node: TreeNode) => void;
    onCut: (node: TreeNode) => void;
    onPaste: (destinationPath: string) => void;
}

export const FileActions = React.memo<FileActionsProps>(({
    visible,
    node,
    clipboard,
    onClose,
    onCreateFile,
    onCreateFolder,
    onRename,
    onDelete,
    onCopy,
    onCut,
    onPaste,
}) => {
    const { theme } = useUnistyles();

    if (!node) return null;

    const isDir = node.type === 'directory';
    const parentPath = isDir ? node.path : node.path.substring(0, node.path.lastIndexOf('/'));

    return (
        <RNModal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View
                    style={[
                        styles.sheet,
                        { backgroundColor: theme.colors.surface },
                    ]}
                >
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
                        <View style={styles.handle} />
                    </View>

                    {/* Title */}
                    <Item
                        title={node.name}
                        subtitle={node.path}
                        icon={
                            isDir ? (
                                <Octicons name="file-directory-fill" size={24} color="#007AFF" />
                            ) : (
                                <Octicons name="file" size={24} color={theme.colors.textSecondary} />
                            )
                        }
                        showChevron={false}
                        showDivider={true}
                    />

                    {/* Actions */}
                    {isDir && (
                        <>
                            <Item
                                title={t('fileManager.createFile')}
                                icon={<Ionicons name="document-outline" size={24} color={theme.colors.textLink} />}
                                onPress={() => {
                                    onClose();
                                    onCreateFile(parentPath);
                                }}
                                showChevron={false}
                            />
                            <Item
                                title={t('fileManager.createFolder')}
                                icon={<Ionicons name="folder-outline" size={24} color={theme.colors.textLink} />}
                                onPress={() => {
                                    onClose();
                                    onCreateFolder(parentPath);
                                }}
                                showChevron={false}
                            />
                        </>
                    )}

                    {/* Copy / Cut */}
                    <Item
                        title={t('common.copy')}
                        icon={<Ionicons name="copy-outline" size={24} color={theme.colors.textLink} />}
                        onPress={() => {
                            onClose();
                            onCopy(node);
                        }}
                        showChevron={false}
                    />
                    <Item
                        title={t('fileManager.cut')}
                        icon={<Ionicons name="cut-outline" size={24} color={theme.colors.textLink} />}
                        onPress={() => {
                            onClose();
                            onCut(node);
                        }}
                        showChevron={false}
                    />

                    {/* Paste (only when clipboard has content and target is a directory) */}
                    {isDir && clipboard && (
                        <Item
                            title={t('fileManager.paste')}
                            subtitle={clipboard.path.split('/').pop()}
                            icon={<Ionicons name="clipboard-outline" size={24} color={theme.colors.textLink} />}
                            onPress={() => {
                                onClose();
                                onPaste(parentPath);
                            }}
                            showChevron={false}
                        />
                    )}

                    <Item
                        title={t('fileManager.rename')}
                        icon={<Ionicons name="pencil-outline" size={24} color={theme.colors.textLink} />}
                        onPress={() => {
                            onClose();
                            onRename(node);
                        }}
                        showChevron={false}
                    />

                    <Item
                        title={t('fileManager.delete')}
                        icon={<Ionicons name="trash-outline" size={24} color={theme.colors.textDestructive} />}
                        destructive
                        onPress={() => {
                            onClose();
                            onDelete(node);
                        }}
                        showChevron={false}
                    />

                    {/* Cancel */}
                    <View style={{ marginTop: 8 }}>
                        <Item
                            title={t('common.cancel')}
                            onPress={onClose}
                            showChevron={false}
                            titleStyle={{ textAlign: 'center' }}
                        />
                    </View>
                </View>
            </View>
        </RNModal>
    );
});

const styles = StyleSheet.create((theme) => ({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: Platform.select({ ios: 34, default: 16 }),
        maxHeight: '70%',
    },
    header: {
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }),
    },
    handle: {
        width: 36,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#c4c4c4',
    },
}));
