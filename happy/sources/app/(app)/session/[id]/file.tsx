import * as React from 'react';
import { View, ScrollView, ActivityIndicator, Platform, Pressable, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/StyledText';
import { SimpleSyntaxHighlighter } from '@/components/SimpleSyntaxHighlighter';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { Typography } from '@/constants/Typography';
import { sessionReadFile, sessionBash } from '@/sync/ops';
import { storage } from '@/sync/storage';
import { Modal } from '@/modal';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { layout } from '@/components/layout';
import { t } from '@/text';
import { FileIcon } from '@/components/FileIcon';
import { useFileEditor } from '@/hooks/useFileEditor';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import WebView from 'react-native-webview';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface FileContent {
    content: string;
    encoding: 'utf8' | 'base64';
    isBinary: boolean;
}

// Image extensions that can be displayed inline
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'];

// Get the MIME type for an image extension
function getImageMime(ext: string): string {
    if (ext === 'jpg') return 'image/jpeg';
    return `image/${ext}`;
}

// Check if a file is a viewable image
function isImageFile(path: string): boolean {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    return IMAGE_EXTENSIONS.includes(ext);
}

// Check if a file is a PDF
function isPdfFile(path: string): boolean {
    return path.toLowerCase().endsWith('.pdf');
}

// Check if a file is an SVG (text-based, not binary)
function isSvgFile(path: string): boolean {
    return path.toLowerCase().endsWith('.svg');
}

// Diff display component
const DiffDisplay: React.FC<{ diffContent: string }> = ({ diffContent }) => {
    const { theme } = useUnistyles();
    const lines = diffContent.split('\n');

    return (
        <View>
            {lines.map((line, index) => {
                const baseStyle = { ...Typography.mono(), fontSize: 14, lineHeight: 20 };
                let lineStyle: any = baseStyle;
                let backgroundColor = 'transparent';

                if (line.startsWith('+') && !line.startsWith('+++')) {
                    lineStyle = { ...baseStyle, color: theme.colors.diff.addedText };
                    backgroundColor = theme.colors.diff.addedBg;
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                    lineStyle = { ...baseStyle, color: theme.colors.diff.removedText };
                    backgroundColor = theme.colors.diff.removedBg;
                } else if (line.startsWith('@@')) {
                    lineStyle = { ...baseStyle, color: theme.colors.diff.hunkHeaderText, fontWeight: '600' };
                    backgroundColor = theme.colors.diff.hunkHeaderBg;
                } else if (line.startsWith('+++') || line.startsWith('---')) {
                    lineStyle = { ...baseStyle, color: theme.colors.text, fontWeight: '600' };
                } else {
                    lineStyle = { ...baseStyle, color: theme.colors.diff.contextText };
                }

                return (
                    <View
                        key={index}
                        style={{
                            backgroundColor,
                            paddingHorizontal: 8,
                            paddingVertical: 1,
                            borderLeftWidth: line.startsWith('+') && !line.startsWith('+++') ? 3 :
                                           line.startsWith('-') && !line.startsWith('---') ? 3 : 0,
                            borderLeftColor: line.startsWith('+') && !line.startsWith('+++') ? theme.colors.diff.addedBorder : theme.colors.diff.removedBorder
                        }}
                    >
                        <Text style={lineStyle}>
                            {line || ' '}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
};

export default function FileScreen() {
    const route = useRoute();
    const router = useRouter();
    const navigation = useNavigation();
    const { theme } = useUnistyles();
    const { id: sessionId } = useLocalSearchParams<{ id: string }>();
    const searchParams = useLocalSearchParams();
    const encodedPath = searchParams.path as string;
    let filePath = '';

    // Decode path - supports both encodeURIComponent (new) and base64/atob (legacy)
    try {
        if (encodedPath) {
            // Try decodeURIComponent first (new encoding)
            filePath = decodeURIComponent(encodedPath);
        }
    } catch {
        try {
            // Fallback to base64/atob (legacy encoding)
            filePath = atob(encodedPath);
        } catch {
            console.error('Failed to decode file path');
            filePath = encodedPath || '';
        }
    }

    const [fileContent, setFileContent] = React.useState<FileContent | null>(null);
    const [diffContent, setDiffContent] = React.useState<string | null>(null);
    const [displayMode, setDisplayMode] = React.useState<'file' | 'diff'>('file');
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // File editor hook
    const editor = useFileEditor({
        sessionId: sessionId!,
        filePath,
        initialContent: fileContent?.content || '',
    });

    // Check if file is markdown
    const isMarkdown = filePath.endsWith('.md') || filePath.endsWith('.mdx');

    // Set header buttons dynamically
    React.useEffect(() => {
        if (isLoading || !fileContent || fileContent.isBinary) return;

        const headerButtons = () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {/* Markdown preview button */}
                {isMarkdown && !editor.isEditMode && (
                    <TouchableOpacity
                        onPress={() => router.push(`/session/${sessionId}/markdown-preview?path=${encodedPath}`)}
                    >
                        <Ionicons name="eye-outline" size={22} color={theme.colors.header.tint} />
                    </TouchableOpacity>
                )}

                {/* Annotate button (for markdown files) */}
                {isMarkdown && !editor.isEditMode && (
                    <TouchableOpacity
                        onPress={() => router.push(`/session/${sessionId}/annotate?path=${encodedPath}`)}
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={22} color={theme.colors.header.tint} />
                    </TouchableOpacity>
                )}

                {editor.isEditMode ? (
                    <>
                        {/* Cancel button */}
                        <TouchableOpacity onPress={editor.exitEditMode}>
                            <Text style={{ color: theme.colors.header.tint, fontSize: 16 }}>
                                {t('common.cancel')}
                            </Text>
                        </TouchableOpacity>

                        {/* Save button */}
                        <TouchableOpacity
                            onPress={editor.saveFile}
                            disabled={!editor.isDirty || editor.isSaving}
                        >
                            {editor.isSaving ? (
                                <ActivityIndicator size="small" color={theme.colors.header.tint} />
                            ) : (
                                <Text style={{
                                    color: editor.isDirty ? theme.colors.header.tint : theme.colors.textSecondary,
                                    fontSize: 16,
                                    fontWeight: '600',
                                }}>
                                    {t('editor.save')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    /* Edit button */
                    <TouchableOpacity onPress={editor.enterEditMode}>
                        <Ionicons name="create-outline" size={22} color={theme.colors.header.tint} />
                    </TouchableOpacity>
                )}
            </View>
        );

        navigation.setOptions({
            headerRight: headerButtons,
        });
    }, [
        isLoading, fileContent, editor.isEditMode, editor.isDirty, editor.isSaving,
        isMarkdown, navigation, theme, sessionId, encodedPath, router,
        editor.enterEditMode, editor.exitEditMode, editor.saveFile,
    ]);

    // Determine file language from extension
    const getFileLanguage = React.useCallback((path: string): string | null => {
        const ext = path.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'js':
            case 'jsx':
                return 'javascript';
            case 'ts':
            case 'tsx':
                return 'typescript';
            case 'py':
                return 'python';
            case 'html':
            case 'htm':
                return 'html';
            case 'css':
                return 'css';
            case 'json':
                return 'json';
            case 'md':
                return 'markdown';
            case 'xml':
                return 'xml';
            case 'yaml':
            case 'yml':
                return 'yaml';
            case 'sh':
            case 'bash':
                return 'bash';
            case 'sql':
                return 'sql';
            case 'go':
                return 'go';
            case 'rust':
            case 'rs':
                return 'rust';
            case 'java':
                return 'java';
            case 'c':
                return 'c';
            case 'cpp':
            case 'cc':
            case 'cxx':
                return 'cpp';
            case 'php':
                return 'php';
            case 'rb':
                return 'ruby';
            case 'swift':
                return 'swift';
            case 'kt':
                return 'kotlin';
            default:
                return null;
        }
    }, []);

    // Check if file is likely binary based on extension
    // SVG is text-based, not binary. Images and PDFs are binary but viewable.
    const isBinaryFile = React.useCallback((path: string): boolean => {
        const ext = path.split('.').pop()?.toLowerCase();
        const binaryExtensions = [
            'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp',
            'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm',
            'mp3', 'wav', 'flac', 'aac', 'ogg',
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            'zip', 'tar', 'gz', 'rar', '7z',
            'exe', 'dmg', 'deb', 'rpm',
            'woff', 'woff2', 'ttf', 'otf',
            'db', 'sqlite', 'sqlite3'
        ];
        return ext ? binaryExtensions.includes(ext) : false;
    }, []);

    // Load file content
    React.useEffect(() => {
        let isCancelled = false;

        const loadFile = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Get session metadata for git commands
                const session = storage.getState().sessions[sessionId!];
                const sessionPath = session?.metadata?.path;

                // For binary files, still read content for viewable types (images, PDF)
                if (isBinaryFile(filePath)) {
                    const isViewable = isImageFile(filePath) || isPdfFile(filePath);
                    if (isViewable) {
                        try {
                            const response = await sessionReadFile(sessionId, filePath);
                            if (!isCancelled && response.success && response.content) {
                                setFileContent({
                                    content: response.content,
                                    encoding: 'base64',
                                    isBinary: true
                                });
                            } else if (!isCancelled) {
                                setFileContent({ content: '', encoding: 'base64', isBinary: true });
                            }
                        } catch {
                            if (!isCancelled) {
                                setFileContent({ content: '', encoding: 'base64', isBinary: true });
                            }
                        }
                    } else {
                        if (!isCancelled) {
                            setFileContent({ content: '', encoding: 'base64', isBinary: true });
                        }
                    }
                    if (!isCancelled) setIsLoading(false);
                    return;
                }

                // Fetch git diff for the file (if in git repo)
                if (sessionPath && sessionId) {
                    try {
                        const diffResponse = await sessionBash(sessionId, {
                            command: `git diff --no-ext-diff "${filePath}"`,
                            cwd: sessionPath,
                            timeout: 5000
                        });

                        if (!isCancelled && diffResponse.success && diffResponse.stdout.trim()) {
                            setDiffContent(diffResponse.stdout);
                        }
                    } catch (diffError) {
                        console.log('Could not fetch git diff:', diffError);
                    }
                }

                const response = await sessionReadFile(sessionId, filePath);

                if (!isCancelled) {
                    if (response.success && response.content) {
                        let decodedContent: string;
                        try {
                            decodedContent = atob(response.content);
                        } catch (decodeError) {
                            setFileContent({
                                content: '',
                                encoding: 'base64',
                                isBinary: true
                            });
                            return;
                        }

                        const hasNullBytes = decodedContent.includes('\0');
                        const nonPrintableCount = decodedContent.split('').filter(char => {
                            const code = char.charCodeAt(0);
                            return code < 32 && code !== 9 && code !== 10 && code !== 13;
                        }).length;
                        const isBinary = hasNullBytes || (nonPrintableCount / decodedContent.length > 0.1);

                        setFileContent({
                            content: isBinary ? '' : decodedContent,
                            encoding: 'utf8',
                            isBinary
                        });
                    } else {
                        setError(response.error || 'Failed to read file');
                    }
                }
            } catch (error) {
                console.error('Failed to load file:', error);
                if (!isCancelled) {
                    setError('Failed to load file');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadFile();

        return () => {
            isCancelled = true;
        };
    }, [sessionId, filePath, isBinaryFile]);

    // Show error modal if there's an error
    React.useEffect(() => {
        if (error) {
            Modal.alert(t('common.error'), error);
        }
    }, [error]);

    // Set default display mode based on diff availability
    React.useEffect(() => {
        if (diffContent) {
            setDisplayMode('diff');
        } else if (fileContent) {
            setDisplayMode('file');
        }
    }, [diffContent, fileContent]);

    const fileName = filePath.split('/').pop() || filePath;
    const language = getFileLanguage(filePath);

    if (isLoading) {
        return (
            <View style={{
                flex: 1,
                backgroundColor: theme.colors.surface,
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                <Text style={{
                    marginTop: 16,
                    fontSize: 16,
                    color: theme.colors.textSecondary,
                    ...Typography.default()
                }}>
                    {t('files.loadingFile', { fileName })}
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={{
                flex: 1,
                backgroundColor: theme.colors.surface,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20
            }}>
                <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: theme.colors.textDestructive,
                    marginBottom: 8,
                    ...Typography.default('semiBold')
                }}>
                    {t('common.error')}
                </Text>
                <Text style={{
                    fontSize: 16,
                    color: theme.colors.textSecondary,
                    textAlign: 'center',
                    ...Typography.default()
                }}>
                    {error}
                </Text>
            </View>
        );
    }

    if (fileContent?.isBinary) {
        const ext = filePath.split('.').pop()?.toLowerCase() || '';

        // Image viewer with pinch-to-zoom
        if (isImageFile(filePath) && fileContent.content) {
            return <ImageViewer
                base64Content={fileContent.content}
                ext={ext}
                fileName={fileName}
                sessionId={sessionId!}
            />;
        }

        // PDF viewer
        if (isPdfFile(filePath) && fileContent.content) {
            return <PdfViewer
                base64Content={fileContent.content}
                fileName={fileName}
                sessionId={sessionId!}
            />;
        }

        // Unsupported binary file
        return (
            <View style={{
                flex: 1,
                backgroundColor: theme.colors.surface,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20
            }}>
                <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: theme.colors.textSecondary,
                    marginBottom: 8,
                    ...Typography.default('semiBold')
                }}>
                    {t('files.binaryFile')}
                </Text>
                <Text style={{
                    fontSize: 16,
                    color: theme.colors.textSecondary,
                    textAlign: 'center',
                    ...Typography.default()
                }}>
                    {t('files.cannotDisplayBinary')}
                </Text>
                <Text style={{
                    fontSize: 14,
                    color: '#999',
                    textAlign: 'center',
                    marginTop: 8,
                    ...Typography.default()
                }}>
                    {fileName}
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>

            {/* File path header */}
            <View style={{
                padding: 16,
                borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }),
                borderBottomColor: theme.colors.divider,
                backgroundColor: theme.colors.surfaceHigh,
                flexDirection: 'row',
                alignItems: 'center'
            }}>
                <FileIcon fileName={fileName} size={20} />
                <Text style={{
                    fontSize: 14,
                    color: theme.colors.textSecondary,
                    marginLeft: 8,
                    flex: 1,
                    ...Typography.mono()
                }}>
                    {filePath}
                </Text>
                {editor.isEditMode && editor.isDirty && (
                    <View style={{
                        backgroundColor: theme.colors.warning,
                        borderRadius: 4,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        marginLeft: 8,
                    }}>
                        <Text style={{ fontSize: 11, color: 'white', fontWeight: '600' }}>
                            {t('editor.edit')}
                        </Text>
                    </View>
                )}
            </View>

            {/* Toggle buttons for File/Diff view (hidden in edit mode) */}
            {diffContent && !editor.isEditMode && (
                <View style={{
                    flexDirection: 'row',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }),
                    borderBottomColor: theme.colors.divider,
                    backgroundColor: theme.colors.surface
                }}>
                    <Pressable
                        onPress={() => setDisplayMode('diff')}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: displayMode === 'diff' ? theme.colors.textLink : theme.colors.input.background,
                            marginRight: 8
                        }}
                    >
                        <Text style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: displayMode === 'diff' ? 'white' : theme.colors.textSecondary,
                            ...Typography.default()
                        }}>
                            {t('files.diff')}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => setDisplayMode('file')}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: displayMode === 'file' ? theme.colors.textLink : theme.colors.input.background
                        }}
                    >
                        <Text style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: displayMode === 'file' ? 'white' : theme.colors.textSecondary,
                            ...Typography.default()
                        }}>
                            {t('files.file')}
                        </Text>
                    </Pressable>
                </View>
            )}

            {/* Content display */}
            {editor.isEditMode ? (
                <CodeEditor
                    content={editor.editedContent}
                    onChange={editor.setEditedContent}
                    editable={true}
                />
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16 }}
                    showsVerticalScrollIndicator={true}
                >
                    {displayMode === 'diff' && diffContent ? (
                        <DiffDisplay diffContent={diffContent} />
                    ) : displayMode === 'file' && fileContent?.content ? (
                        <SimpleSyntaxHighlighter
                            code={fileContent.content}
                            language={language}
                            selectable={true}
                        />
                    ) : displayMode === 'file' && fileContent && !fileContent.content ? (
                        <Text style={{
                            fontSize: 16,
                            color: theme.colors.textSecondary,
                            fontStyle: 'italic',
                            ...Typography.default()
                        }}>
                            {t('files.fileEmpty')}
                        </Text>
                    ) : !diffContent && !fileContent?.content ? (
                        <Text style={{
                            fontSize: 16,
                            color: theme.colors.textSecondary,
                            fontStyle: 'italic',
                            ...Typography.default()
                        }}>
                            {t('files.noChanges')}
                        </Text>
                    ) : null}
                </ScrollView>
            )}
        </View>
    );
}

// Share a base64 file via the system share sheet
async function shareBase64File(base64Content: string, fileName: string, mimeType: string) {
    try {
        const tempFile = new ExpoFile(Paths.cache, fileName);
        // Decode base64 to bytes and write to cache
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        tempFile.write(bytes);
        await Sharing.shareAsync(tempFile.uri, { mimeType });
    } catch (error) {
        console.error('Share failed:', error);
        Modal.alert(t('common.error'), 'Failed to share file');
    }
}

// Image viewer with pinch-to-zoom
const ImageViewer = React.memo(({ base64Content, ext, fileName, sessionId }: {
    base64Content: string;
    ext: string;
    fileName: string;
    sessionId: string;
}) => {
    const { theme } = useUnistyles();
    const mime = getImageMime(ext);
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            savedScale.value = scale.value;
            if (scale.value < 1) {
                scale.value = 1;
                savedScale.value = 1;
                translateX.value = 0;
                translateY.value = 0;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            }
        });

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (savedScale.value > 1) {
                translateX.value = savedTranslateX.value + e.translationX;
                translateY.value = savedTranslateY.value + e.translationY;
            }
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .onStart(() => {
            if (savedScale.value > 1) {
                scale.value = 1;
                savedScale.value = 1;
                translateX.value = 0;
                translateY.value = 0;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                scale.value = 2.5;
                savedScale.value = 2.5;
            }
        });

    const composed = Gesture.Simultaneous(pinchGesture, panGesture, doubleTap);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
            <GestureDetector gesture={composed}>
                <Animated.View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, animatedStyle]}>
                    <Image
                        source={{ uri: `data:${mime};base64,${base64Content}` }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                    />
                </Animated.View>
            </GestureDetector>
            <View style={styles.shareBar}>
                <Text style={[styles.shareFileName, { color: theme.colors.textSecondary }]}>{fileName}</Text>
                <TouchableOpacity
                    onPress={() => shareBase64File(base64Content, fileName, mime)}
                    style={styles.shareButton}
                >
                    <Ionicons name="share-outline" size={22} color={theme.colors.textLink} />
                </TouchableOpacity>
            </View>
        </View>
    );
});

// PDF viewer using WebView
const PdfViewer = React.memo(({ base64Content, fileName, sessionId }: {
    base64Content: string;
    fileName: string;
    sessionId: string;
}) => {
    const { theme } = useUnistyles();

    // WebView renders PDFs natively on Android via Google Docs viewer or built-in
    // On iOS, WKWebView can render PDFs from data URIs
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { margin: 0; padding: 0; background: ${theme.colors.surface}; }
                embed, iframe { width: 100%; height: 100vh; border: none; }
            </style>
        </head>
        <body>
            <embed src="data:application/pdf;base64,${base64Content}" type="application/pdf" width="100%" height="100%">
        </body>
        </html>
    `;

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
            <WebView
                source={{ html }}
                style={{ flex: 1 }}
                originWhitelist={['*']}
                javaScriptEnabled={true}
                scalesPageToFit={true}
            />
            <View style={styles.shareBar}>
                <Text style={[styles.shareFileName, { color: theme.colors.textSecondary }]}>{fileName}</Text>
                <TouchableOpacity
                    onPress={() => shareBase64File(base64Content, fileName, 'application/pdf')}
                    style={styles.shareButton}
                >
                    <Ionicons name="share-outline" size={22} color={theme.colors.textLink} />
                </TouchableOpacity>
            </View>
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
    shareBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        backgroundColor: theme.colors.surfaceHigh,
    },
    shareFileName: {
        flex: 1,
        fontSize: 14,
        ...Typography.mono(),
    },
    shareButton: {
        padding: 8,
        marginLeft: 8,
    },
}));
