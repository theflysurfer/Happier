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
    addFromFiles: (files: File[]) => Promise<void>;
    removeImage: (index: number) => void;
    clearImages: () => void;
    getImagesAsAttachments: () => Promise<ImageAttachment[]>;
    isProcessing: boolean;
    maxImages: number;
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

async function processImageWeb(uri: string, width: number, height: number): Promise<{ uri: string; width: number; height: number; base64: string }> {
    // Web implementation using Canvas API (more reliable than expo-image-manipulator on web)
    return new Promise((resolve, reject) => {
        const img = new (globalThis.Image || HTMLImageElement)();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Use natural dimensions if width/height were 0
            const naturalW = width || img.naturalWidth;
            const naturalH = height || img.naturalHeight;

            const needsResize = naturalW > MAX_IMAGE_SIZE || naturalH > MAX_IMAGE_SIZE;
            let newWidth = naturalW;
            let newHeight = naturalH;

            if (needsResize) {
                const ratio = Math.min(MAX_IMAGE_SIZE / naturalW, MAX_IMAGE_SIZE / naturalH);
                newWidth = Math.round(naturalW * ratio);
                newHeight = Math.round(naturalH * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Cannot get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const base64 = dataUrl.split(',')[1] || '';
            resolve({
                uri: dataUrl,
                width: newWidth,
                height: newHeight,
                base64,
            });
        };
        img.onerror = () => reject(new Error('Failed to load image for processing'));
        img.src = uri;
    });
}

async function processImageNative(uri: string, width: number, height: number): Promise<{ uri: string; width: number; height: number; base64: string }> {
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

async function processImage(uri: string, width: number, height: number): Promise<{ uri: string; width: number; height: number; base64: string }> {
    if (Platform.OS === 'web') {
        return processImageWeb(uri, width, height);
    }
    return processImageNative(uri, width, height);
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

                // On web, width/height may be 0 — use defaults that skip resize
                const assetWidth = asset.width || 0;
                const assetHeight = asset.height || 0;

                const processed = await processImage(
                    asset.uri,
                    assetWidth,
                    assetHeight
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

    // Add images from raw File objects (web: drag & drop, paste)
    const addFromFiles = useCallback(async (files: File[]) => {
        const imageFiles = files.filter(f => ALLOWED_MEDIA_TYPES.includes(f.type as any));
        if (imageFiles.length === 0) return;

        setIsProcessing(true);
        try {
            const newImages: SelectedImage[] = [];

            for (const file of imageFiles) {
                if (images.length + newImages.length >= maxImages) break;

                // Read file as data URL
                const uri = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = () => reject(new Error('Failed to read file'));
                    reader.readAsDataURL(file);
                });

                const processed = await processImage(uri, 0, 0);

                newImages.push({
                    uri: processed.uri,
                    width: processed.width,
                    height: processed.height,
                    mediaType: getMediaType(file.name, file.type),
                    base64: processed.base64,
                });
            }

            setImages(prev => [...prev, ...newImages]);
        } finally {
            setIsProcessing(false);
        }
    }, [images.length, maxImages]);

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
        addFromFiles,
        removeImage,
        clearImages,
        getImagesAsAttachments,
        isProcessing,
        maxImages,
    };
}
