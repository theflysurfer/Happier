import * as React from 'react';
import { View, ActivityIndicator, Platform, TextInput, Pressable } from 'react-native';
import { t } from '@/text';
import { useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Octicons } from '@expo/vector-icons';
import { Text } from '@/components/StyledText';
import { Item } from '@/components/Item';
import { ItemList } from '@/components/ItemList';
import { Typography } from '@/constants/Typography';
import { getGitStatusFiles, GitFileStatus, GitStatusFiles } from '@/sync/gitStatusFiles';
import { searchFiles, FileItem } from '@/sync/suggestionFile';
import { useSessionGitStatus, useSessionProjectGitStatus } from '@/sync/storage';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { layout } from '@/components/layout';
import { FileIcon } from '@/components/FileIcon';

type FilesTab = 'browse' | 'changes';

export default function FilesScreen() {
    const route = useRoute();
    const router = useRouter();
    const sessionId = (route.params! as any).id as string;

    const [gitStatusFiles, setGitStatusFiles] = React.useState<GitStatusFiles | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchResults, setSearchResults] = React.useState<FileItem[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<FilesTab>('browse');
    // Use project git status first, fallback to session git status for backward compatibility
    const projectGitStatus = useSessionProjectGitStatus(sessionId);
    const sessionGitStatus = useSessionGitStatus(sessionId);
    const gitStatus = projectGitStatus || sessionGitStatus;
    const { theme } = useUnistyles();

    // Determine if there are git changes
    const hasChanges = gitStatusFiles
        ? (gitStatusFiles.totalStaged > 0 || gitStatusFiles.totalUnstaged > 0)
        : false;

    // Determine if git is available
    const hasGit = gitStatusFiles !== null;

    // Filter changed files locally when searching on changes tab
    const filteredChangedFiles = React.useMemo(() => {
        if (!searchQuery || !gitStatusFiles) return null;
        const q = searchQuery.toLowerCase();
        const staged = gitStatusFiles.stagedFiles.filter(f =>
            f.fileName.toLowerCase().includes(q) || f.fullPath.toLowerCase().includes(q)
        );
        const unstaged = gitStatusFiles.unstagedFiles.filter(f =>
            f.fileName.toLowerCase().includes(q) || f.fullPath.toLowerCase().includes(q)
        );
        return { staged, unstaged, total: staged.length + unstaged.length };
    }, [searchQuery, gitStatusFiles]);

    // Auto-select tab based on git status
    React.useEffect(() => {
        if (!isLoading) {
            if (hasGit && hasChanges) {
                setActiveTab('changes');
            } else {
                setActiveTab('browse');
            }
        }
    }, [isLoading, hasGit, hasChanges]);
    
    // Load git status files
    const loadGitStatusFiles = React.useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await getGitStatusFiles(sessionId);
            setGitStatusFiles(result);
        } catch (error) {
            console.error('Failed to load git status files:', error);
            setGitStatusFiles(null);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    // Load on mount
    React.useEffect(() => {
        loadGitStatusFiles();
    }, [loadGitStatusFiles]);

    // Refresh when screen is focused
    useFocusEffect(
        React.useCallback(() => {
            loadGitStatusFiles();
        }, [loadGitStatusFiles])
    );

    // Handle search and file loading
    React.useEffect(() => {
        const loadFiles = async () => {
            if (!sessionId) return;

            try {
                setIsSearching(true);
                const results = await searchFiles(sessionId, searchQuery, { limit: 100 });
                setSearchResults(results);
            } catch (error) {
                console.error('Failed to search files:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        // Load files in browse mode or when searching
        const shouldLoadFiles = searchQuery || activeTab === 'browse';

        if (shouldLoadFiles && !isLoading) {
            loadFiles();
        } else if (!searchQuery && activeTab !== 'browse') {
            setSearchResults([]);
            setIsSearching(false);
        }
    }, [searchQuery, activeTab, sessionId, isLoading]);

    const handleFilePress = React.useCallback((file: GitFileStatus | FileItem) => {
        const encodedPath = encodeURIComponent(file.fullPath);
        router.push(`/session/${sessionId}/file?path=${encodedPath}`);
    }, [router, sessionId]);

    const renderFileIcon = (file: GitFileStatus) => {
        return <FileIcon fileName={file.fileName} size={32} />;
    };

    const renderStatusIcon = (file: GitFileStatus) => {
        let statusColor: string;
        let statusIcon: string;

        switch (file.status) {
            case 'modified':
                statusColor = "#FF9500";
                statusIcon = "diff-modified";
                break;
            case 'added':
                statusColor = "#34C759";
                statusIcon = "diff-added";
                break;
            case 'deleted':
                statusColor = "#FF3B30";
                statusIcon = "diff-removed";
                break;
            case 'renamed':
                statusColor = "#007AFF";
                statusIcon = "arrow-right";
                break;
            case 'untracked':
                statusColor = theme.dark ? "#b0b0b0" : "#8E8E93";
                statusIcon = "file";
                break;
            default:
                return null;
        }

        return <Octicons name={statusIcon as any} size={16} color={statusColor} />;
    };

    const renderLineChanges = (file: GitFileStatus) => {
        const parts = [];
        if (file.linesAdded > 0) {
            parts.push(`+${file.linesAdded}`);
        }
        if (file.linesRemoved > 0) {
            parts.push(`-${file.linesRemoved}`);
        }
        return parts.length > 0 ? parts.join(' ') : '';
    };

    const renderFileSubtitle = (file: GitFileStatus) => {
        const lineChanges = renderLineChanges(file);
        const pathPart = file.filePath || t('files.projectRoot');
        return lineChanges ? `${pathPart} • ${lineChanges}` : pathPart;
    };

    const renderFileIconForSearch = (file: FileItem) => {
        if (file.fileType === 'folder') {
            return <Octicons name="file-directory" size={29} color="#007AFF" />;
        }
        
        return <FileIcon fileName={file.fileName} size={29} />;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
            
            {/* Search Input - Always Visible */}
            <View style={{
                padding: 16,
                borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }),
                borderBottomColor: theme.colors.divider
            }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.colors.input.background,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8
                }}>
                    <Octicons name="search" size={16} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder={t('files.searchPlaceholder')}
                        style={{
                            flex: 1,
                            fontSize: 16,
                            ...Typography.default()
                        }}
                        placeholderTextColor={theme.colors.input.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
            </View>
            
            {/* Tab switcher + Browse Files button */}
            {!isLoading && (
                <View style={{
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 8,
                }}>
                    {/* Tabs - only show if git is available */}
                    {hasGit && (
                        <View style={{
                            flexDirection: 'row',
                            backgroundColor: theme.colors.input.background,
                            borderRadius: 10,
                            padding: 3,
                            marginBottom: 8,
                        }}>
                            <Pressable
                                onPress={() => setActiveTab('browse')}
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    backgroundColor: activeTab === 'browse' ? theme.colors.surface : 'transparent',
                                }}
                            >
                                <Text style={{
                                    fontSize: 14,
                                    fontWeight: activeTab === 'browse' ? '600' : '400',
                                    color: activeTab === 'browse' ? theme.colors.text : theme.colors.textSecondary,
                                    ...Typography.default(),
                                }}>
                                    {t('files.browse')}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setActiveTab('changes')}
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    backgroundColor: activeTab === 'changes' ? theme.colors.surface : 'transparent',
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={{
                                        fontSize: 14,
                                        fontWeight: activeTab === 'changes' ? '600' : '400',
                                        color: activeTab === 'changes' ? theme.colors.text : theme.colors.textSecondary,
                                        ...Typography.default(),
                                    }}>
                                        {t('files.changes')}
                                    </Text>
                                    {hasChanges && (
                                        <View style={{
                                            backgroundColor: theme.colors.warning,
                                            borderRadius: 8,
                                            paddingHorizontal: 5,
                                            paddingVertical: 1,
                                        }}>
                                            <Text style={{ fontSize: 10, color: '#fff', fontWeight: '600' }}>
                                                {gitStatusFiles!.totalStaged + gitStatusFiles!.totalUnstaged}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </Pressable>
                        </View>
                    )}

                    {/* Full File Manager button */}
                    <Pressable
                        onPress={() => router.push(`/session/${sessionId}/file-manager`)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: theme.colors.input.background,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                        }}
                    >
                        <Octicons name="file-directory" size={16} color={theme.colors.textLink} style={{ marginRight: 8 }} />
                        <Text style={{
                            fontSize: 15,
                            color: theme.colors.textLink,
                            ...Typography.default('semiBold'),
                            flex: 1,
                        }}>
                            {t('fileManager.browseFiles')}
                        </Text>
                        <Octicons name="chevron-right" size={16} color={theme.colors.textLink} />
                    </Pressable>
                </View>
            )}

            {/* Header with branch info (only in changes tab) */}
            {!isLoading && gitStatusFiles && activeTab === 'changes' && (
                <View style={{
                    padding: 16,
                    borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }),
                    borderBottomColor: theme.colors.divider
                }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 8
                    }}>
                        <Octicons name="git-branch" size={16} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
                        <Text style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: theme.colors.text,
                            ...Typography.default()
                        }}>
                            {gitStatusFiles.branch || t('files.detachedHead')}
                        </Text>
                    </View>
                    <Text style={{
                        fontSize: 12,
                        color: theme.colors.textSecondary,
                        ...Typography.default()
                    }}>
                        {t('files.summary', { staged: gitStatusFiles.totalStaged, unstaged: gitStatusFiles.totalUnstaged })}
                    </Text>
                </View>
            )}

            {/* Git Status List */}
            <ItemList style={{ flex: 1 }}>
                {isLoading ? (
                    <View style={{ 
                        flex: 1, 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        paddingTop: 40
                    }}>
                        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                    </View>
                ) : searchQuery && activeTab === 'changes' ? (
                    // Filter changed files locally using substring matching
                    filteredChangedFiles && filteredChangedFiles.total > 0 ? (
                        <>
                            {filteredChangedFiles.staged.length > 0 && (
                                <>
                                    <View style={{
                                        backgroundColor: theme.colors.surfaceHigh,
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }),
                                        borderBottomColor: theme.colors.divider
                                    }}>
                                        <Text style={{
                                            fontSize: 14,
                                            fontWeight: '600',
                                            color: theme.colors.success,
                                            ...Typography.default()
                                        }}>
                                            {t('files.stagedChanges', { count: filteredChangedFiles.staged.length })}
                                        </Text>
                                    </View>
                                    {filteredChangedFiles.staged.map((file, index) => (
                                        <Item
                                            key={`staged-${file.fullPath}-${index}`}
                                            title={file.fileName}
                                            subtitle={renderFileSubtitle(file)}
                                            icon={renderFileIcon(file)}
                                            rightElement={renderStatusIcon(file)}
                                            onPress={() => handleFilePress(file)}
                                            showDivider={index < filteredChangedFiles.staged.length - 1 || filteredChangedFiles.unstaged.length > 0}
                                        />
                                    ))}
                                </>
                            )}
                            {filteredChangedFiles.unstaged.length > 0 && (
                                <>
                                    <View style={{
                                        backgroundColor: theme.colors.surfaceHigh,
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }),
                                        borderBottomColor: theme.colors.divider
                                    }}>
                                        <Text style={{
                                            fontSize: 14,
                                            fontWeight: '600',
                                            color: theme.colors.warning,
                                            ...Typography.default()
                                        }}>
                                            {t('files.unstagedChanges', { count: filteredChangedFiles.unstaged.length })}
                                        </Text>
                                    </View>
                                    {filteredChangedFiles.unstaged.map((file, index) => (
                                        <Item
                                            key={`unstaged-${file.fullPath}-${index}`}
                                            title={file.fileName}
                                            subtitle={renderFileSubtitle(file)}
                                            icon={renderFileIcon(file)}
                                            rightElement={renderStatusIcon(file)}
                                            onPress={() => handleFilePress(file)}
                                            showDivider={index < filteredChangedFiles.unstaged.length - 1}
                                        />
                                    ))}
                                </>
                            )}
                        </>
                    ) : (
                        <View style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingTop: 40,
                            paddingHorizontal: 20
                        }}>
                            <Octicons name="search" size={48} color={theme.colors.textSecondary} />
                            <Text style={{
                                fontSize: 16,
                                color: theme.colors.textSecondary,
                                textAlign: 'center',
                                marginTop: 16,
                                ...Typography.default()
                            }}>
                                {t('files.noFilesFound')}
                            </Text>
                            <Text style={{
                                fontSize: 14,
                                color: theme.colors.textSecondary,
                                textAlign: 'center',
                                marginTop: 8,
                                ...Typography.default()
                            }}>
                                {t('files.tryDifferentTerm')}
                            </Text>
                        </View>
                    )
                ) : searchQuery || activeTab === 'browse' ? (
                    // Show search results or all files when in browse mode
                    isSearching ? (
                        <View style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingTop: 40
                        }}>
                            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                            <Text style={{
                                fontSize: 16,
                                color: theme.colors.textSecondary,
                                textAlign: 'center',
                                marginTop: 16,
                                ...Typography.default()
                            }}>
                                {t('files.searching')}
                            </Text>
                        </View>
                    ) : searchResults.length === 0 ? (
                        <View style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingTop: 40,
                            paddingHorizontal: 20
                        }}>
                            <Octicons name={searchQuery ? "search" : "file-directory"} size={48} color={theme.colors.textSecondary} />
                            <Text style={{
                                fontSize: 16,
                                color: theme.colors.textSecondary,
                                textAlign: 'center',
                                marginTop: 16,
                                ...Typography.default()
                            }}>
                                {searchQuery ? t('files.noFilesFound') : t('files.noFilesInProject')}
                            </Text>
                            {searchQuery && (
                                <Text style={{
                                    fontSize: 14,
                                    color: theme.colors.textSecondary,
                                    textAlign: 'center',
                                    marginTop: 8,
                                    ...Typography.default()
                                }}>
                                    {t('files.tryDifferentTerm')}
                                </Text>
                            )}
                        </View>
                    ) : (
                        // Show search results or all files
                        <>
                            {searchQuery && (
                                <View style={{
                                    backgroundColor: theme.colors.surfaceHigh,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }),
                                    borderBottomColor: theme.colors.divider
                                }}>
                                    <Text style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: theme.colors.textLink,
                                        ...Typography.default()
                                    }}>
                                        {t('files.searchResults', { count: searchResults.length })}
                                    </Text>
                                </View>
                            )}
                            {searchResults.map((file, index) => (
                                <Item
                                    key={`file-${file.fullPath}-${index}`}
                                    title={file.fileName}
                                    subtitle={file.filePath || t('files.projectRoot')}
                                    icon={renderFileIconForSearch(file)}
                                    onPress={() => handleFilePress(file)}
                                    showDivider={index < searchResults.length - 1}
                                />
                            ))}
                        </>
                    )
                ) : gitStatusFiles ? (
                    <>
                        {/* Staged Changes Section */}
                        {gitStatusFiles.stagedFiles.length > 0 && (
                            <>
                                <View style={{
                                    backgroundColor: theme.colors.surfaceHigh,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }),
                                    borderBottomColor: theme.colors.divider
                                }}>
                                    <Text style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: theme.colors.success,
                                        ...Typography.default()
                                    }}>
                                        {t('files.stagedChanges', { count: gitStatusFiles.stagedFiles.length })}
                                    </Text>
                                </View>
                                {gitStatusFiles.stagedFiles.map((file, index) => (
                                    <Item
                                        key={`staged-${file.fullPath}-${index}`}
                                        title={file.fileName}
                                        subtitle={renderFileSubtitle(file)}
                                        icon={renderFileIcon(file)}
                                        rightElement={renderStatusIcon(file)}
                                        onPress={() => handleFilePress(file)}
                                        showDivider={index < gitStatusFiles.stagedFiles.length - 1 || gitStatusFiles.unstagedFiles.length > 0}
                                    />
                                ))}
                            </>
                        )}

                        {/* Unstaged Changes Section */}
                        {gitStatusFiles.unstagedFiles.length > 0 && (
                            <>
                                <View style={{
                                    backgroundColor: theme.colors.surfaceHigh,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }),
                                    borderBottomColor: theme.colors.divider
                                }}>
                                    <Text style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: theme.colors.warning,
                                        ...Typography.default()
                                    }}>
                                        {t('files.unstagedChanges', { count: gitStatusFiles.unstagedFiles.length })}
                                    </Text>
                                </View>
                                {gitStatusFiles.unstagedFiles.map((file, index) => (
                                    <Item
                                        key={`unstaged-${file.fullPath}-${index}`}
                                        title={file.fileName}
                                        subtitle={renderFileSubtitle(file)}
                                        icon={renderFileIcon(file)}
                                        rightElement={renderStatusIcon(file)}
                                        onPress={() => handleFilePress(file)}
                                        showDivider={index < gitStatusFiles.unstagedFiles.length - 1}
                                    />
                                ))}
                            </>
                        )}
                    </>
                ) : null}
            </ItemList>
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        maxWidth: layout.maxWidth,
        alignSelf: 'center',
        width: '100%',
    }
}));
