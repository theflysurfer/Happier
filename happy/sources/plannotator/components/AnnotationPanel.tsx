/**
 * AnnotationPanel - List of annotations with delete action
 */

import React from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { Annotation, AnnotationType, ReviewTag } from '../types';
import { t } from '@/text';

interface AnnotationPanelProps {
  annotations: Annotation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  annotations,
  selectedId,
  onSelect,
  onDelete,
}) => {
  const { theme } = useUnistyles();

  const getTypeIcon = (type: AnnotationType) => {
    switch (type) {
      case AnnotationType.DELETION:
        return 'trash-outline';
      case AnnotationType.INSERTION:
        return 'add-circle-outline';
      case AnnotationType.REPLACEMENT:
        return 'swap-horizontal-outline';
      case AnnotationType.COMMENT:
        return 'chatbubble-outline';
      case AnnotationType.GLOBAL_COMMENT:
        return 'earth-outline';
      default:
        return 'help-outline';
    }
  };

  const getTypeColor = (type: AnnotationType) => {
    switch (type) {
      case AnnotationType.DELETION:
        return theme.colors.deleteAction;
      case AnnotationType.INSERTION:
        return theme.colors.success;
      case AnnotationType.REPLACEMENT:
        return '#6366f1';
      case AnnotationType.COMMENT:
        return '#f59e0b';
      case AnnotationType.GLOBAL_COMMENT:
        return '#8b5cf6';
      default:
        return theme.colors.textSecondary;
    }
  };

  const getTypeLabel = (type: AnnotationType) => {
    switch (type) {
      case AnnotationType.DELETION:
        return 'Delete';
      case AnnotationType.INSERTION:
        return 'Insert';
      case AnnotationType.REPLACEMENT:
        return 'Replace';
      case AnnotationType.COMMENT:
        return 'Comment';
      case AnnotationType.GLOBAL_COMMENT:
        return 'Global';
      default:
        return 'Unknown';
    }
  };

  const renderItem = ({ item }: { item: Annotation }) => {
    const isSelected = item.id === selectedId;
    const typeColor = getTypeColor(item.type);

    return (
      <Pressable
        onPress={() => onSelect(item.id)}
        style={{
          backgroundColor: isSelected
            ? theme.dark
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.05)'
            : 'transparent',
          padding: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* Type indicator */}
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: `${typeColor}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            <Ionicons name={getTypeIcon(item.type)} size={14} color={typeColor} />
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: typeColor,
                }}
              >
                {getTypeLabel(item.type)}
              </Text>
              {item.isMacro && (
                <View style={{ backgroundColor: '#EF444430', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#EF4444' }}>MACRO</Text>
                </View>
              )}
              {item.tags?.map(tag => (
                <View
                  key={tag}
                  style={{
                    backgroundColor: tag === ReviewTag.TODO ? '#3B82F620' : tag === ReviewTag.FIX ? '#EF444420' : tag === ReviewTag.VERIFY ? '#EAB30820' : '#22C55E20',
                    paddingHorizontal: 4,
                    paddingVertical: 1,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '600', color: tag === ReviewTag.TODO ? '#3B82F6' : tag === ReviewTag.FIX ? '#EF4444' : tag === ReviewTag.VERIFY ? '#EAB308' : '#22C55E' }}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>

            <Text
              style={{
                fontSize: 13,
                color: theme.colors.text,
                marginBottom: item.text ? 4 : 0,
              }}
              numberOfLines={2}
            >
              "{item.originalText.slice(0, 60)}
              {item.originalText.length > 60 ? '...' : ''}"
            </Text>

            {item.text && (
              <Text
                style={{
                  fontSize: 13,
                  color: theme.colors.textSecondary,
                  fontStyle: 'italic',
                }}
                numberOfLines={2}
              >
                → {item.text}
              </Text>
            )}
          </View>

          {/* Delete button */}
          <Pressable
            onPress={() => onDelete(item.id)}
            hitSlop={10}
            style={{
              padding: 4,
            }}
          >
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  if (annotations.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <Ionicons name="document-text-outline" size={32} color={theme.colors.textSecondary} />
        <Text
          style={{
            marginTop: 8,
            fontSize: 14,
            color: theme.colors.textSecondary,
            textAlign: 'center',
          }}
        >
          {t('annotations.noAnnotations')}{'\n'}{t('annotations.noAnnotationsHint')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={annotations}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      style={{ flex: 1 }}
    />
  );
};
