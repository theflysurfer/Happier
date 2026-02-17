/**
 * Command Palette Provider
 *
 * Provides the Ctrl+K keyboard shortcut to open the unified command palette.
 * The slash "/" trigger is handled separately in AgentInput.
 */

import React, { useCallback } from 'react';
import { Platform, View } from 'react-native';
import { Modal } from '@/modal';
import { useGlobalKeyboard } from '@/hooks/useGlobalKeyboard';
import { storage } from '@/sync/storage';
import { useShallow } from 'zustand/react/shallow';
import { UnifiedCommandPalette, UnifiedCommand } from '@/components/UnifiedCommandPalette';
import { StyleSheet } from 'react-native-unistyles';

// Modal wrapper component for the command palette
function CommandPaletteModal({ onClose }: { onClose: () => void }) {
    const handleCommandSelect = useCallback((command: UnifiedCommand, text?: string) => {
        // Commands are executed by the palette itself
        // Just close the modal
        onClose();
    }, [onClose]);

    return (
        <View style={styles.modalContainer}>
            <UnifiedCommandPalette
                triggeredBy="keyboard"
                onClose={onClose}
                onSelectCommand={handleCommandSelect}
                showInput={true}
            />
        </View>
    );
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
    const commandPaletteEnabled = storage(useShallow((state) => state.localSettings.commandPaletteEnabled));

    const showCommandPalette = useCallback(() => {
        if (Platform.OS !== 'web' || !commandPaletteEnabled) return;

        Modal.show({
            component: CommandPaletteModal,
            props: {}
        } as any);
    }, [commandPaletteEnabled]);

    // Set up global keyboard handler only if feature is enabled
    useGlobalKeyboard(commandPaletteEnabled ? showCommandPalette : () => {});

    return <>{children}</>;
}

const styles = StyleSheet.create({
    modalContainer: {
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
    },
});
