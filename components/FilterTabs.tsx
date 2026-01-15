import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';

interface FilterTabsProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export function FilterTabs({ categories, selected, onSelect }: FilterTabsProps) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        style={[styles.tab, selected === 'All' && styles.activeTab]}
        onPress={() => onSelect('All')}
      >
        <Text style={[styles.tabText, selected === 'All' && styles.activeTabText]}>All</Text>
      </TouchableOpacity>

      {categories.map((cat) => (
        <TouchableOpacity
          key={cat}
          style={[styles.tab, selected === cat && styles.activeTab]}
          onPress={() => onSelect(cat)}
        >
          <Text style={[styles.tabText, selected === cat && styles.activeTabText]}>{cat}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#FFF',
  },
});
