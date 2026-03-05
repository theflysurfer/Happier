import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/Typography';
import { t } from '@/text';

interface ImageDropZoneProps {
    /** Callback when files are dropped or pasted */
    onFilesAdded: (files: File[]) => void;
    /** Whether we've reached the max number of images */
    isFull: boolean;
    /** Wraps the children (input area) */
    children: React.ReactNode;
}

const stylesheet = StyleSheet.create((theme) => ({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.surface + 'E6', // 90% opacity
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: theme.colors.button.primary.background,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    overlayText: {
        fontSize: 14,
        color: theme.colors.button.primary.background,
        marginTop: 8,
        ...Typography.default('semiBold'),
    },
}));

/**
 * Wraps the input area to support drag & drop and clipboard paste of images.
 * Web only — on native, renders children directly.
 */
export function ImageDropZone({ onFilesAdded, isFull, children }: ImageDropZoneProps) {
    const [isDragging, setIsDragging] = React.useState(false);
    const dragCounterRef = React.useRef(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const styles = stylesheet;
    const { theme } = useUnistyles();

    // On native, just pass through
    if (Platform.OS !== 'web') {
        return <>{children}</>;
    }

    // Attach native DOM drag events via ref (React Native Web <View> doesn't forward drag events)
    React.useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleDragEnter = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounterRef.current++;
            if (e.dataTransfer?.types.includes('Files')) {
                setIsDragging(true);
            }
        };

        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounterRef.current--;
            if (dragCounterRef.current === 0) {
                setIsDragging(false);
            }
        };

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            dragCounterRef.current = 0;

            if (isFull) return;

            const files = Array.from(e.dataTransfer?.files || []).filter(f =>
                f.type.startsWith('image/')
            );
            if (files.length > 0) {
                onFilesAdded(files);
            }
        };

        el.addEventListener('dragenter', handleDragEnter);
        el.addEventListener('dragleave', handleDragLeave);
        el.addEventListener('dragover', handleDragOver);
        el.addEventListener('drop', handleDrop);

        return () => {
            el.removeEventListener('dragenter', handleDragEnter);
            el.removeEventListener('dragleave', handleDragLeave);
            el.removeEventListener('dragover', handleDragOver);
            el.removeEventListener('drop', handleDrop);
        };
    }, [onFilesAdded, isFull]);

    // Clipboard paste handler — attached to window
    React.useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (isFull) return;
            const items = e.clipboardData?.items;
            if (!items) return;

            const imageFiles: File[] = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) imageFiles.push(file);
                }
            }

            if (imageFiles.length > 0) {
                e.preventDefault(); // Don't paste as text
                onFilesAdded(imageFiles);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [onFilesAdded, isFull]);

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            {children}
            {isDragging && (
                <View style={styles.overlay}>
                    <Ionicons
                        name="image-outline"
                        size={32}
                        color={theme.colors.button.primary.background}
                    />
                    <Text style={styles.overlayText}>
                        {t('imageUpload.dropHere')}
                    </Text>
                </View>
            )}
        </div>
    );
}
