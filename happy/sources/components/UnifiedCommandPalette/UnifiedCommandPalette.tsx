/**
 * Unified Command Palette Component
 *
 * A unified interface for both Command Palette (Ctrl+K) and Slash Commands (/)
 * Works on both web and mobile platforms.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, Pressable, Platform, ScrollView, TextInput } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/Typography';
import { useUnifiedCommands } from './useUnifiedCommands';
import { UnifiedCommand, CommandCategory } from './types';
import { FloatingOverlay } from '@/components/FloatingOverlay';

interface UnifiedCommandPaletteProps {
    sessionId?: string;
    initialQuery?: string;
    triggeredBy?: 'slash' | 'keyboard' | null;
    onClose: () => void;
    onSelectCommand: (command: UnifiedCommand, text?: string) => void;
    showInput?: boolean;
}

export const UnifiedCommandPalette = React.memo(function UnifiedCommandPalette({
    sessionId,
    initialQuery = '',
    triggeredBy,
    onClose,
    onSelectCommand,
    showInput = false
}: UnifiedCommandPaletteProps) {
    const { theme } = useUnistyles();
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<TextInput>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    // Get commands and search function
    const { searchCommands } = useUnifiedCommands({
        sessionId,
        triggeredBy,
        onSendCommand: (cmd) => {
            // This will be handled by the parent
        }
    });

    // Filter categories based on search query
    const filteredCategories = useMemo(() => {
        return searchCommands(searchQuery);
    }, [searchCommands, searchQuery]);

    // Flatten commands for keyboard navigation
    const allCommands = useMemo(() => {
        return filteredCategories.flatMap(cat => cat.commands);
    }, [filteredCategories]);

    // Reset selection when search changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    // Focus input on mount (web only)
    useEffect(() => {
        if (Platform.OS === 'web' && showInput) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [showInput]);

    // Update search query when initialQuery changes
    useEffect(() => {
        setSearchQuery(initialQuery);
    }, [initialQuery]);

    // Handle command selection
    const handleSelectCommand = useCallback((command: UnifiedCommand) => {
        const result = command.action();
        onSelectCommand(command, typeof result === 'string' ? result : undefined);
        onClose();
    }, [onSelectCommand, onClose]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent | KeyboardEvent) => {
        const key = 'key' in e ? e.key : '';

        switch (key) {
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, allCommands.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (allCommands[selectedIndex]) {
                    handleSelectCommand(allCommands[selectedIndex]);
                }
                break;
            case 'Tab':
                e.preventDefault();
                if (allCommands[selectedIndex]) {
                    handleSelectCommand(allCommands[selectedIndex]);
                }
                break;
        }
    }, [onClose, allCommands, selectedIndex, handleSelectCommand]);

    // Scroll to selected item
    useEffect(() => {
        if (Platform.OS === 'web') {
            const selectedElement = document.querySelector(`[data-command-index="${selectedIndex}"]`);
            selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedIndex]);

    if (filteredCategories.length === 0 && searchQuery.trim()) {
        return (
            <FloatingOverlay maxHeight={300} keyboardShouldPersistTaps="handled">
                {showInput && (
                    <View style={styles.inputContainer}>
                        <Ionicons
                            name="search"
                            size={16}
                            color={theme.colors.textSecondary}
                            style={styles.searchIcon}
                        />
                        <TextInput
                            ref={inputRef}
                            style={[styles.input, { color: theme.colors.text }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search commands..."
                            placeholderTextColor={theme.colors.textSecondary}
                            autoFocus
                            onKeyPress={(e) => handleKeyDown(e.nativeEvent as any)}
                        />
                    </View>
                )}
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                        No commands found
                    </Text>
                </View>
            </FloatingOverlay>
        );
    }

    return (
        <FloatingOverlay maxHeight={showInput ? 400 : 300} keyboardShouldPersistTaps="handled">
            {showInput && (
                <View style={[styles.inputContainer, { borderBottomColor: theme.colors.divider }]}>
                    <Ionicons
                        name="search"
                        size={16}
                        color={theme.colors.textSecondary}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        ref={inputRef}
                        style={[styles.input, { color: theme.colors.text }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search commands..."
                        placeholderTextColor={theme.colors.textSecondary}
                        autoFocus
                        onKeyPress={(e) => handleKeyDown(e.nativeEvent as any)}
                    />
                </View>
            )}
            <ScrollView
                ref={scrollViewRef}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.scrollView}
            >
                {filteredCategories.map((category, catIndex) => {
                    // Calculate the starting index for this category
                    let startIndex = 0;
                    for (let i = 0; i < catIndex; i++) {
                        startIndex += filteredCategories[i].commands.length;
                    }

                    return (
                        <View key={category.id}>
                            <Text style={[styles.categoryTitle, { color: theme.colors.textSecondary }]}>
                                {category.title}
                            </Text>
                            {category.commands.map((command, cmdIndex) => {
                                const commandIndex = startIndex + cmdIndex;
                                const isSelected = commandIndex === selectedIndex;

                                return (
                                    <CommandItem
                                        key={command.id}
                                        command={command}
                                        isSelected={isSelected}
                                        commandIndex={commandIndex}
                                        onPress={() => handleSelectCommand(command)}
                                        onHover={() => setSelectedIndex(commandIndex)}
                                    />
                                );
                            })}
                        </View>
                    );
                })}
            </ScrollView>
        </FloatingOverlay>
    );
});

// Command Item Component
interface CommandItemProps {
    command: UnifiedCommand;
    isSelected: boolean;
    commandIndex: number;
    onPress: () => void;
    onHover: () => void;
}

const CommandItem = React.memo(function CommandItem({
    command,
    isSelected,
    commandIndex,
    onPress,
    onHover
}: CommandItemProps) {
    const { theme } = useUnistyles();
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = useCallback(() => {
        if (Platform.OS === 'web') {
            setIsHovered(true);
            onHover();
        }
    }, [onHover]);

    const handleMouseLeave = useCallback(() => {
        if (Platform.OS === 'web') {
            setIsHovered(false);
        }
    }, []);

    const pressableProps: any = {
        onPress,
        style: ({ pressed }: { pressed: boolean }) => [
            styles.commandItem,
            {
                backgroundColor: isSelected
                    ? theme.colors.surfaceSelected
                    : isHovered
                        ? theme.colors.surfacePressed
                        : 'transparent',
            },
            pressed && { opacity: 0.7 }
        ],
        'data-command-index': commandIndex,
    };

    if (Platform.OS === 'web') {
        pressableProps.onMouseEnter = handleMouseEnter;
        pressableProps.onMouseLeave = handleMouseLeave;
    }

    return (
        <Pressable {...pressableProps}>
            <View style={styles.commandContent}>
                {command.icon && (
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfacePressed }]}>
                        <Ionicons
                            name={command.icon as any}
                            size={16}
                            color={isSelected ? theme.colors.radio.active : theme.colors.textSecondary}
                        />
                    </View>
                )}
                <View style={styles.textContainer}>
                    <Text style={[
                        styles.commandTitle,
                        { color: theme.colors.text },
                        Typography.default()
                    ]}>
                        {command.title}
                    </Text>
                    {command.subtitle && (
                        <Text style={[
                            styles.commandSubtitle,
                            { color: theme.colors.textSecondary },
                            Typography.default()
                        ]}>
                            {command.subtitle}
                        </Text>
                    )}
                </View>
                {command.shortcut && Platform.OS === 'web' && (
                    <View style={[styles.shortcutContainer, { backgroundColor: theme.colors.surfacePressed }]}>
                        <Text style={[styles.shortcutText, { color: theme.colors.textSecondary }, Typography.mono()]}>
                            {command.shortcut}
                        </Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 15,
        padding: 0,
        ...Typography.default(),
    },
    scrollView: {
        maxHeight: 300,
    },
    categoryTitle: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    commandItem: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 8,
        marginVertical: 2,
        borderRadius: 8,
    },
    commandContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    commandTitle: {
        fontSize: 14,
        marginBottom: 1,
    },
    commandSubtitle: {
        fontSize: 12,
    },
    shortcutContainer: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    shortcutText: {
        fontSize: 11,
        fontWeight: '500',
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
    },
});

export default UnifiedCommandPalette;
