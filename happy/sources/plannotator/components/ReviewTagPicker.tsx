/**
 * ReviewTagPicker - Modal for selecting review tags and MACRO flag
 */

import React from 'react';
import { View, Pressable, Modal, Switch, Platform } from 'react-native';
import { Text } from '@/components/StyledText';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { ReviewTag } from '../types';
import { t } from '@/text';

interface ReviewTagPickerProps {
    visible: boolean;
    selectedTags: ReviewTag[];
    isMacro: boolean;
    onToggleTag: (tag: ReviewTag) => void;
    onToggleMacro: (value: boolean) => void;
    onClose: () => void;
}

const TAG_COLORS: Record<ReviewTag, string> = {
    [ReviewTag.TODO]: '#3B82F6',
    [ReviewTag.FIX]: '#EF4444',
    [ReviewTag.VERIFY]: '#EAB308',
    [ReviewTag.OK]: '#22C55E',
};

const TAG_LABELS: Record<ReviewTag, string> = {
    [ReviewTag.TODO]: '@TODO',
    [ReviewTag.FIX]: '@FIX',
    [ReviewTag.VERIFY]: '@VERIFY',
    [ReviewTag.OK]: '@OK',
};

export const ReviewTagPicker: React.FC<ReviewTagPickerProps> = ({
    visible,
    selectedTags,
    isMacro,
    onToggleTag,
    onToggleMacro,
    onClose,
}) => {
    const { theme } = useUnistyles();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View
                    style={[
                        styles.container,
                        {
                            backgroundColor: theme.colors.surface,
                            shadowColor: '#000',
                        },
                    ]}
                >
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        {t('annotations.reviewTags')}
                    </Text>

                    {/* Tag buttons */}
                    <View style={styles.tagsRow}>
                        {Object.values(ReviewTag).map((tag) => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                                <Pressable
                                    key={tag}
                                    onPress={() => onToggleTag(tag)}
                                    style={[
                                        styles.tagButton,
                                        {
                                            backgroundColor: isSelected
                                                ? TAG_COLORS[tag]
                                                : theme.colors.surfaceHighest,
                                            borderColor: TAG_COLORS[tag],
                                            borderWidth: 1,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.tagText,
                                            {
                                                color: isSelected
                                                    ? '#FFFFFF'
                                                    : TAG_COLORS[tag],
                                            },
                                        ]}
                                    >
                                        {TAG_LABELS[tag]}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* MACRO toggle */}
                    <View style={[styles.macroRow, { borderTopColor: theme.colors.divider }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.macroLabel, { color: theme.colors.text }]}>
                                {t('annotations.macro')}
                            </Text>
                            <Text style={[styles.macroHint, { color: theme.colors.textSecondary }]}>
                                {t('annotations.macroDescription')}
                            </Text>
                        </View>
                        <Switch
                            value={isMacro}
                            onValueChange={onToggleMacro}
                            trackColor={{ true: '#EF4444' }}
                        />
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create((theme) => ({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    container: {
        borderRadius: 16,
        padding: 20,
        width: '85%',
        maxWidth: 360,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    title: {
        ...Typography.default('semiBold'),
        fontSize: 17,
        marginBottom: 16,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    tagButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    tagText: {
        ...Typography.default('semiBold'),
        fontSize: 14,
    },
    macroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: Platform.select({ ios: 0.33, default: 1 }),
    },
    macroLabel: {
        ...Typography.default('semiBold'),
        fontSize: 15,
    },
    macroHint: {
        ...Typography.default(),
        fontSize: 12,
        marginTop: 2,
    },
}));
