import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import type { ImageAttachment } from '@/sync/typesMessage';

const MAX_IMAGE_SIZE = 2048;
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MEDIA_TYPES: ImageAttachment['mediaType'][] = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
];

export interface SelectedImage {
    uri: string;
    width: number;
    height: number;
    mediaType: ImageAttachment['mediaType'];
    base64?: string;
}

interface UseImagePickerReturn {
    images: SelectedImage[];
    pickFromGallery: () => Promise<void>;
    pickFromCamera: () => Promise<void>;
    removeImage: (index: number) => void;
    clearImages: () => void;
    getImagesAsAttachments: () => Promise<ImageAttachment[]>;
    isProcessing: boolean;
}

function getMediaType(uri: string, mimeType?: string): ImageAttachment['mediaType'] {
    if (mimeType && ALLOWED_MEDIA_TYPES.includes(mimeType as ImageAttachment['mediaType'])) {
        return mimeType as ImageAttachment['mediaType'];
    }
    const ext = uri.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'png': return 'image/png';
        case 'gif': return 'image/gif';
        case 'webp': return 'image/webp';
        default: return 'image/jpeg';
    }
}

async function processImage(uri: string, width: number, height: number): Promise<{ uri: string; width: number; height: number; base64: string }> {
    // Check if we need to resize
    const needsResize = width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE;

    let newWidth = width;
    let newHeight = height;

    if (needsResize) {
        const ratio = Math.min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height);
        newWidth = Math.round(width * ratio);
        newHeight = Math.round(height * ratio);
    }

    // Process image (resize if needed, get base64)
    const result = await ImageManipulator.manipulateAsync(
        uri,
        needsResize ? [{ resize: { width: newWidth, height: newHeight } }] : [],
        {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
        }
    );

    return {
        uri: result.uri,
        width: result.width,
        height: result.height,
        base64: result.base64 || '',
    };
}

export function useImagePicker(maxImages: number = 4): UseImagePickerReturn {
    const [images, setImages] = useState<SelectedImage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const addImages = useCallback(async (result: ImagePicker.ImagePickerResult) => {
        if (result.canceled || !result.assets?.length) return;

        setIsProcessing(true);
        try {
            const newImages: SelectedImage[] = [];

            for (const asset of result.assets) {
                if (images.length + newImages.length >= maxImages) break;

                const processed = await processImage(
                    asset.uri,
                    asset.width,
                    asset.height
                );

                newImages.push({
                    uri: processed.uri,
                    width: processed.width,
                    height: processed.height,
                    mediaType: getMediaType(asset.uri, asset.mimeType || undefined),
                    base64: processed.base64,
                });
            }

            setImages(prev => [...prev, ...newImages]);
        } finally {
            setIsProcessing(false);
        }
    }, [images.length, maxImages]);

    const pickFromGallery = useCallback(async () => {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            console.warn('Gallery permission denied');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 1,
            selectionLimit: maxImages - images.length,
        });

        await addImages(result);
    }, [addImages, maxImages, images.length]);

    const pickFromCamera = useCallback(async () => {
        // Request permission
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            console.warn('Camera permission denied');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
        });

        await addImages(result);
    }, [addImages]);

    const removeImage = useCallback((index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    }, []);

    const clearImages = useCallback(() => {
        setImages([]);
    }, []);

    const getImagesAsAttachments = useCallback(async (): Promise<ImageAttachment[]> => {
        return images.map(img => ({
            type: 'base64' as const,
            mediaType: img.mediaType,
            data: img.base64 || '',
            width: img.width,
            height: img.height,
        }));
    }, [images]);

    return {
        images,
        pickFromGallery,
        pickFromCamera,
        removeImage,
        clearImages,
        getImagesAsAttachments,
        isProcessing,
    };
}
