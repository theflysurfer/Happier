import * as React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons, Octicons } from '@expo/vector-icons';
import { FileIcon } from '@/components/FileIcon';
import { Typography } from '@/constants/Typography';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import type { TreeNode } from '@/sync/ops';

interface TreeViewProps {
    node: TreeNode;
    depth?: number;
    expandedPaths: Set<string>;
    onToggleExpand: (path: string) => void;
    onFilePress: (path: string) => void;
    onLongPress: (node: TreeNode) => void;
}

const INDENT_PER_LEVEL = 20;

const TreeNodeRow = React.memo<TreeViewProps>(({
    node,
    depth = 0,
    expandedPaths,
    onToggleExpand,
    onFilePress,
    onLongPress,
}) => {
    const { theme } = useUnistyles();
    const isDir = node.type === 'directory';
    const isExpanded = expandedPaths.has(node.path);
    const hasChildren = isDir && node.children && node.children.length > 0;

    const handlePress = React.useCallback(() => {
        if (isDir) {
            onToggleExpand(node.path);
        } else {
            onFilePress(node.path);
        }
    }, [isDir, node.path, onToggleExpand, onFilePress]);

    const handleLongPress = React.useCallback(() => {
        onLongPress(node);
    }, [node, onLongPress]);

    // Sort children: directories first, then files, alphabetical within each
    const sortedChildren = React.useMemo(() => {
        if (!node.children) return [];
        return [...node.children].sort((a, b) => {
            if (a.type === 'directory' && b.type !== 'directory') return -1;
            if (a.type !== 'directory' && b.type === 'directory') return 1;
            return a.name.localeCompare(b.name);
        });
    }, [node.children]);

    return (
        <>
            <Pressable
                onPress={handlePress}
                onLongPress={handleLongPress}
                style={({ pressed }) => [
                    styles.row,
                    { paddingLeft: 16 + depth * INDENT_PER_LEVEL },
                    pressed && { backgroundColor: theme.colors.surfacePressedOverlay },
                ]}
                android_ripple={{
                    color: theme.colors.surfaceRipple,
                    borderless: false,
                    foreground: true,
                }}
            >
                {/* Expand/collapse icon for directories */}
                <View style={styles.expandIconContainer}>
                    {isDir ? (
                        <Ionicons
                            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={16}
                            color={theme.colors.textSecondary}
                        />
                    ) : (
                        <View style={{ width: 16 }} />
                    )}
                </View>

                {/* File/folder icon */}
                <View style={styles.fileIconContainer}>
                    {isDir ? (
                        <Octicons
                            name={isExpanded ? 'file-directory-open-fill' : 'file-directory-fill'}
                            size={20}
                            color="#007AFF"
                        />
                    ) : (
                        <FileIcon fileName={node.name} size={20} />
                    )}
                </View>

                {/* File/folder name */}
                <Text
                    style={[
                        styles.name,
                        { color: theme.colors.text },
                        isDir && styles.dirName,
                    ]}
                    numberOfLines={1}
                >
                    {node.name}
                </Text>

                {/* Chevron for files */}
                {!isDir && (
                    <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={theme.colors.groupped.chevron}
                        style={{ marginLeft: 8 }}
                    />
                )}
            </Pressable>

            {/* Divider */}
            <View
                style={[
                    styles.divider,
                    {
                        backgroundColor: theme.colors.divider,
                        marginLeft: 16 + depth * INDENT_PER_LEVEL + 16 + 12,
                    },
                ]}
            />

            {/* Children */}
            {isDir && isExpanded && sortedChildren.map((child) => (
                <TreeNodeRow
                    key={child.path}
                    node={child}
                    depth={depth + 1}
                    expandedPaths={expandedPaths}
                    onToggleExpand={onToggleExpand}
                    onFilePress={onFilePress}
                    onLongPress={onLongPress}
                />
            ))}
        </>
    );
});

interface TreeViewRootProps {
    tree: TreeNode;
    expandedPaths: Set<string>;
    onToggleExpand: (path: string) => void;
    onFilePress: (path: string) => void;
    onLongPress: (node: TreeNode) => void;
}

export const TreeView = React.memo<TreeViewRootProps>(({
    tree,
    expandedPaths,
    onToggleExpand,
    onFilePress,
    onLongPress,
}) => {
    // Sort root children: directories first, then files
    const sortedChildren = React.useMemo(() => {
        if (!tree.children) return [];
        return [...tree.children].sort((a, b) => {
            if (a.type === 'directory' && b.type !== 'directory') return -1;
            if (a.type !== 'directory' && b.type === 'directory') return 1;
            return a.name.localeCompare(b.name);
        });
    }, [tree.children]);

    return (
        <View>
            {sortedChildren.map((child) => (
                <TreeNodeRow
                    key={child.path}
                    node={child}
                    depth={0}
                    expandedPaths={expandedPaths}
                    onToggleExpand={onToggleExpand}
                    onFilePress={onFilePress}
                    onLongPress={onLongPress}
                />
            ))}
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Platform.select({ ios: 10, default: 12 }),
        paddingRight: 16,
        minHeight: Platform.select({ ios: 44, default: 48 }),
    },
    expandIconContainer: {
        width: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    fileIconContainer: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    name: {
        ...Typography.default('regular'),
        fontSize: 16,
        flex: 1,
    },
    dirName: {
        fontWeight: '500',
    },
    divider: {
        height: Platform.select({ ios: 0.33, default: 0 }),
    },
}));
