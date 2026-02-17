import * as React from 'react';
import { View, Pressable, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { hapticsLight } from '../haptics';
import type { SelectedImage } from './useImagePicker';

interface ImagePreviewRowProps {
    images: SelectedImage[];
    onRemove: (index: number) => void;
    isProcessing?: boolean;
}

const THUMBNAIL_SIZE = 60;
const BORDER_RADIUS = 8;

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 8,
    },
    thumbnailContainer: {
        position: 'relative',
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
    },
    thumbnail: {
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        borderRadius: BORDER_RADIUS,
        backgroundColor: theme.colors.surface,
    },
    removeButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: theme.colors.button.primary.background,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
    },
    processingContainer: {
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        borderRadius: BORDER_RADIUS,
        backgroundColor: theme.colors.input.background,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderStyle: 'dashed',
    },
}));

export function ImagePreviewRow({ images, onRemove, isProcessing }: ImagePreviewRowProps) {
    const styles = stylesheet;
    const { theme } = useUnistyles();

    if (images.length === 0 && !isProcessing) {
        return null;
    }

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {images.map((image, index) => (
                <View key={`${image.uri}-${index}`} style={styles.thumbnailContainer}>
                    <Image
                        source={{ uri: image.uri }}
                        style={styles.thumbnail}
                        contentFit="cover"
                    />
                    <Pressable
                        style={styles.removeButton}
                        onPress={() => {
                            hapticsLight();
                            onRemove(index);
                        }}
                        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                    >
                        <Ionicons
                            name="close"
                            size={14}
                            color={theme.colors.button.primary.tint}
                        />
                    </Pressable>
                </View>
            ))}
            {isProcessing && (
                <View style={styles.processingContainer}>
                    <ActivityIndicator
                        size="small"
                        color={theme.colors.text}
                    />
                </View>
            )}
        </ScrollView>
    );
}
