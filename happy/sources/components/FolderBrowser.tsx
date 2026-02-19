/**
 * FolderBrowser: Tree-based directory browser for path selection.
 * Uses machineBash to list directories on a remote machine.
 * Supports configurable root path and folder expansion.
 */

import * as React from 'react';
import { View, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { Text } from '@/components/StyledText';
import { Typography } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { machineBash } from '@/sync/ops';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { t } from '@/text';

interface FolderBrowserProps {
    machineId: string;
    rootPath: string;
    onSelectPath: (path: string) => void;
}

interface FolderNode {
    name: string;
    path: string;
    depth: number;
    isExpanded: boolean;
    isLoading: boolean;
    children: FolderNode[] | null; // null = not loaded yet
}

export const FolderBrowser = React.memo(({ machineId, rootPath, onSelectPath }: FolderBrowserProps) => {
    const { theme } = useUnistyles();
    const [nodes, setNodes] = React.useState<FolderNode[]>([]);
    const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
    const [isLoadingRoot, setIsLoadingRoot] = React.useState(true);

    // Load root directory on mount
    React.useEffect(() => {
        loadChildren(rootPath, 0).then(children => {
            setNodes(children);
            setIsLoadingRoot(false);
        });
    }, [rootPath, machineId]);

    const loadChildren = React.useCallback(async (parentPath: string, depth: number): Promise<FolderNode[]> => {
        try {
            const result = await machineBash(
                machineId,
                `ls -1 -p "${parentPath}" 2>/dev/null | grep '/$' | head -100`,
                parentPath
            );
            if (!result.success || !result.stdout.trim()) return [];

            return result.stdout
                .trim()
                .split('\n')
                .filter(line => line.endsWith('/'))
                .map(line => {
                    const name = line.replace(/\/$/, '');
                    return {
                        name,
                        path: `${parentPath}/${name}`.replace(/\/\//g, '/'),
                        depth,
                        isExpanded: false,
                        isLoading: false,
                        children: null,
                    };
                });
        } catch {
            return [];
        }
    }, [machineId]);

    const toggleExpand = React.useCallback(async (targetPath: string) => {
        setNodes(prev => {
            const updateNode = (list: FolderNode[]): FolderNode[] =>
                list.map(node => {
                    if (node.path === targetPath) {
                        if (node.isExpanded) {
                            return { ...node, isExpanded: false };
                        }
                        return { ...node, isExpanded: true, isLoading: node.children === null };
                    }
                    if (node.children) {
                        return { ...node, children: updateNode(node.children) };
                    }
                    return node;
                });
            return updateNode(prev);
        });

        // Load children if not yet loaded
        setNodes(prev => {
            const findNode = (list: FolderNode[]): FolderNode | null => {
                for (const n of list) {
                    if (n.path === targetPath) return n;
                    if (n.children) {
                        const found = findNode(n.children);
                        if (found) return found;
                    }
                }
                return null;
            };
            const target = findNode(prev);
            if (target && target.children === null) {
                // Load async
                loadChildren(targetPath, target.depth + 1).then(children => {
                    setNodes(prevNodes => {
                        const setChildren = (list: FolderNode[]): FolderNode[] =>
                            list.map(node => {
                                if (node.path === targetPath) {
                                    return { ...node, children, isLoading: false };
                                }
                                if (node.children) {
                                    return { ...node, children: setChildren(node.children) };
                                }
                                return node;
                            });
                        return setChildren(prevNodes);
                    });
                });
            }
            return prev;
        });
    }, [loadChildren]);

    const handleSelect = React.useCallback((path: string) => {
        setSelectedPath(path);
        onSelectPath(path);
    }, [onSelectPath]);

    // Flatten the tree for FlatList rendering
    const flatList = React.useMemo(() => {
        const result: FolderNode[] = [];
        const flatten = (list: FolderNode[]) => {
            for (const node of list) {
                result.push(node);
                if (node.isExpanded && node.children) {
                    flatten(node.children);
                }
            }
        };
        flatten(nodes);
        return result;
    }, [nodes]);

    if (isLoadingRoot) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                    {t('files.browsingFolder')}
                </Text>
            </View>
        );
    }

    if (nodes.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="folder-open-outline" size={32} color={theme.colors.textSecondary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                    {t('files.emptyFolder')}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Breadcrumb / root path */}
            <Pressable
                onPress={() => handleSelect(rootPath)}
                style={[styles.rootBar, {
                    backgroundColor: theme.colors.surfaceHigh,
                    borderBottomColor: theme.colors.divider,
                }]}
            >
                <Ionicons name="home-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.rootText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {rootPath}
                </Text>
                {selectedPath === rootPath && (
                    <Ionicons name="checkmark" size={18} color={theme.colors.textLink} />
                )}
            </Pressable>

            <FlatList
                data={flatList}
                keyExtractor={item => item.path}
                renderItem={({ item }) => (
                    <FolderRow
                        node={item}
                        isSelected={selectedPath === item.path}
                        onToggle={toggleExpand}
                        onSelect={handleSelect}
                    />
                )}
                style={{ flex: 1 }}
            />
        </View>
    );
});

const FolderRow = React.memo(({ node, isSelected, onToggle, onSelect }: {
    node: FolderNode;
    isSelected: boolean;
    onToggle: (path: string) => void;
    onSelect: (path: string) => void;
}) => {
    const { theme } = useUnistyles();

    return (
        <View style={[styles.row, {
            paddingLeft: 16 + node.depth * 20,
            backgroundColor: isSelected ? theme.colors.surfaceSelected : 'transparent',
        }]}>
            {/* Expand/collapse arrow */}
            <Pressable
                onPress={() => onToggle(node.path)}
                style={styles.expandButton}
                hitSlop={8}
            >
                {node.isLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                ) : (
                    <Ionicons
                        name={node.isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={16}
                        color={theme.colors.textSecondary}
                    />
                )}
            </Pressable>

            {/* Folder name - tap to select */}
            <Pressable
                onPress={() => onSelect(node.path)}
                style={styles.nameButton}
            >
                <Ionicons
                    name={node.isExpanded ? 'folder-open' : 'folder'}
                    size={18}
                    color={isSelected ? theme.colors.textLink : theme.colors.warning}
                />
                <Text style={[styles.folderName, {
                    color: isSelected ? theme.colors.textLink : theme.colors.text,
                }]} numberOfLines={1}>
                    {node.name}
                </Text>
            </Pressable>

            {isSelected && (
                <Ionicons name="checkmark" size={18} color={theme.colors.textLink} style={{ marginRight: 12 }} />
            )}
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
    },
    loadingContainer: {
        padding: 32,
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        ...Typography.default(),
    },
    rootBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    rootText: {
        flex: 1,
        fontSize: 13,
        ...Typography.mono(),
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
    },
    expandButton: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nameButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingRight: 12,
    },
    folderName: {
        flex: 1,
        fontSize: 15,
        ...Typography.default(),
    },
}));
