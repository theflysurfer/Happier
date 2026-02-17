import * as React from 'react';
import { View, TextInput, ScrollView, Platform } from 'react-native';
import { Text } from '@/components/StyledText';
import { Typography } from '@/constants/Typography';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

interface CodeEditorProps {
    content: string;
    onChange: (content: string) => void;
    editable?: boolean;
}

export const CodeEditor = React.memo<CodeEditorProps>(({ content, onChange, editable = true }) => {
    const { theme } = useUnistyles();
    const lineCount = React.useMemo(() => content.split('\n').length, [content]);

    const lineNumbers = React.useMemo(() => {
        const lines = [];
        for (let i = 1; i <= lineCount; i++) {
            lines.push(i);
        }
        return lines;
    }, [lineCount]);

    const gutterWidth = React.useMemo(() => {
        const digits = String(lineCount).length;
        return Math.max(40, digits * 10 + 20);
    }, [lineCount]);

    return (
        <ScrollView
            style={styles.container}
            horizontal={false}
            showsVerticalScrollIndicator={true}
        >
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ flexGrow: 1 }}
            >
                <View style={styles.editorRow}>
                    {/* Line numbers */}
                    <View
                        style={[
                            styles.gutter,
                            {
                                width: gutterWidth,
                                backgroundColor: theme.colors.surfaceHigh,
                                borderRightColor: theme.colors.divider,
                            },
                        ]}
                    >
                        {lineNumbers.map((num) => (
                            <Text
                                key={num}
                                style={[
                                    styles.lineNumber,
                                    { color: theme.colors.textSecondary },
                                ]}
                            >
                                {num}
                            </Text>
                        ))}
                    </View>

                    {/* Editor */}
                    <TextInput
                        style={[
                            styles.textInput,
                            {
                                color: theme.colors.text,
                                minHeight: lineCount * 20 + 32,
                            },
                            Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {},
                        ]}
                        value={content}
                        onChangeText={onChange}
                        multiline
                        editable={editable}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        autoComplete="off"
                        textAlignVertical="top"
                        scrollEnabled={false}
                        placeholder=""
                        placeholderTextColor={theme.colors.textSecondary}
                    />
                </View>
            </ScrollView>
        </ScrollView>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
    },
    editorRow: {
        flexDirection: 'row',
        minWidth: '100%',
    },
    gutter: {
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRightWidth: 1,
        alignItems: 'flex-end',
    },
    lineNumber: {
        ...Typography.mono(),
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'right',
    },
    textInput: {
        ...Typography.mono(),
        fontSize: 14,
        lineHeight: 20,
        paddingHorizontal: 12,
        paddingVertical: 16,
        flex: 1,
        minWidth: 300,
    },
}));
