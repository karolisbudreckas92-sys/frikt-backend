import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows, radius } from '../theme/colors';
import { formatDistanceToNow } from 'date-fns';

interface Problem {
  id: string;
  title: string;
  category_name: string;
  category_color: string;
  relates_count: number;
  comments_count: number;
  when_happens?: string | null;
  created_at: string;
  user_has_related: boolean;
}

interface ProblemCardProps {
  problem: Problem;
  onPress: () => void;
  onRelate: () => void;
}

export default function ProblemCard({ problem, onPress, onRelate }: ProblemCardProps) {
  const timeAgo = formatDistanceToNow(new Date(problem.created_at), { addSuffix: true });
  const snippet = problem.when_happens && problem.when_happens.length > 80 
    ? problem.when_happens.substring(0, 80) + '...' 
    : (problem.when_happens || '');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>
            {problem.category_name}
          </Text>
        </View>
        <Text style={styles.timeText}>{timeAgo}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>{problem.title}</Text>
      {snippet ? (
        <Text style={styles.snippet} numberOfLines={2}>{snippet}</Text>
      ) : null}

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.relateButton, problem.user_has_related && styles.relateButtonActive]} 
          onPress={(e) => {
            e.stopPropagation();
            onRelate();
          }}
        >
          <Ionicons 
            name={problem.user_has_related ? 'heart' : 'heart-outline'} 
            size={18} 
            color={problem.user_has_related ? colors.primary : colors.textSecondary} 
          />
          <Text style={[
            styles.relateText, 
            problem.user_has_related && styles.relateTextActive
          ]}>
            {problem.relates_count} Relate{problem.relates_count !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>

        <View style={styles.statItem}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.statText}>{problem.comments_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.softRed,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  snippet: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  relateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  relateButtonActive: {
    backgroundColor: colors.softRed,
    borderColor: colors.primary,
  },
  relateText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  relateTextActive: {
    color: colors.primary,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
