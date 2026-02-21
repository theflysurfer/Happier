import * as React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/Typography';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

interface BreadcrumbProps {
    path: string;
    rootPath: string;
    onNavigate: (path: string) => void;
}

export const Breadcrumb = React.memo<BreadcrumbProps>(({ path, rootPath, onNavigate }) => {
    const { theme } = useUnistyles();

    const segments = React.useMemo(() => {
        // Show path relative to root
        let relativePath = path;
        if (path.startsWith(rootPath)) {
            relativePath = path.slice(rootPath.length);
        }
        if (relativePath.startsWith('/')) {
            relativePath = relativePath.slice(1);
        }

        const parts = relativePath ? relativePath.split('/') : [];
        const result: { name: string; fullPath: string }[] = [
            { name: rootPath.split('/').pop() || '/', fullPath: rootPath },
        ];

        let accumulated = rootPath;
        for (const part of parts) {
            accumulated = accumulated.endsWith('/')
                ? `${accumulated}${part}`
                : `${accumulated}/${part}`;
            result.push({ name: part, fullPath: accumulated });
        }

        return result;
    }, [path, rootPath]);

    return (
        <View style={[styles.container, { borderBottomColor: theme.colors.divider }]}>
            <View style={styles.content}>
                {segments.map((segment, index) => {
                    const isLast = index === segments.length - 1;
                    return (
                        <React.Fragment key={segment.fullPath}>
                            <Pressable
                                onPress={() => !isLast && onNavigate(segment.fullPath)}
                                style={({ pressed }) => [
                                    styles.segment,
                                    pressed && !isLast && { opacity: 0.6 },
                                ]}
                                disabled={isLast}
                            >
                                <Text
                                    style={[
                                        styles.segmentText,
                                        {
                                            color: isLast
                                                ? theme.colors.text
                                                : theme.colors.textLink,
                                        },
                                    ]}
                                >
                                    {segment.name}
                                </Text>
                            </Pressable>
                            {!isLast && (
                                <Ionicons
                                    name="chevron-forward"
                                    size={14}
                                    color={theme.colors.textSecondary}
                                    style={styles.chevron}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </View>
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }),
        backgroundColor: theme.colors.surfaceHigh,
    },
    content: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    segment: {
        paddingVertical: 2,
    },
    segmentText: {
        ...Typography.mono(),
        fontSize: 14,
    },
    chevron: {
        marginHorizontal: 4,
    },
}));
