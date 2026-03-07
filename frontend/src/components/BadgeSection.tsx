import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

const { width: screenWidth } = Dimensions.get('window');

const colors = {
  background: '#F6F3EE',
  cardBg: '#FFFFFF',
  darkBar: '#2B2F36',
  primary: '#E4572E',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E5E5E5',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

interface Badge {
  badge_id: string;
  name: string;
  icon: string;
  category: string;
  threshold: number | null;
  description?: string;
  requirement?: string;
  unlocked?: boolean;
  unlocked_at?: string;
  progress?: { current: number; target: number } | null;
}

interface BadgeData {
  unlocked: Badge[];
  locked: Badge[];
  total_unlocked: number;
  total_possible: number;
  stats: any;
}

export function BadgeSection() {
  const [badgeData, setBadgeData] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      const data = await api.getMyBadges();
      setBadgeData(data);
    } catch (error) {
      console.error('Failed to load badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      streak: '🔥 Streaks',
      explorer: '🧭 Explorer',
      relater: '🫂 Relater',
      creator: '💣 Creator',
      commenter: '💬 Commenter',
      impact: '🔥 Impact',
      special: '⭐ Special',
      category_specialist: '🏆 Category Expert',
      viral: '🌟 Viral',
    };
    return labels[category] || category;
  };

  const groupBadgesByCategory = (badges: Badge[]) => {
    const groups: Record<string, Badge[]> = {};
    badges.forEach(badge => {
      const cat = badge.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(badge);
    });
    return groups;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading badges...</Text>
      </View>
    );
  }

  if (!badgeData) {
    return null;
  }

  const unlockedGroups = groupBadgesByCategory(badgeData.unlocked);
  const lockedGroups = groupBadgesByCategory(badgeData.locked);
  const allCategories = [...new Set([...Object.keys(unlockedGroups), ...Object.keys(lockedGroups)])];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Badges</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {badgeData.total_unlocked} / {badgeData.total_possible}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
        {/* Unlocked badges first */}
        {badgeData.unlocked.map((badge) => (
          <TouchableOpacity
            key={badge.badge_id}
            style={styles.badgeItem}
            onPress={() => setSelectedBadge(badge)}
            data-testid={`badge-${badge.badge_id}`}
          >
            <View style={[styles.badgeIcon, styles.badgeUnlocked]}>
              <Text style={styles.badgeEmoji}>{badge.icon}</Text>
            </View>
            <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
          </TouchableOpacity>
        ))}
        
        {/* Locked badges */}
        {badgeData.locked.map((badge) => (
          <TouchableOpacity
            key={badge.badge_id}
            style={styles.badgeItem}
            onPress={() => setSelectedBadge(badge)}
            data-testid={`badge-locked-${badge.badge_id}`}
          >
            <View style={[styles.badgeIcon, styles.badgeLocked]}>
              <Text style={[styles.badgeEmoji, styles.badgeEmojiLocked]}>{badge.icon}</Text>
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
              </View>
            </View>
            <Text style={[styles.badgeName, styles.badgeNameLocked]} numberOfLines={1}>
              {badge.name}
            </Text>
            {badge.progress && (
              <Text style={styles.progressText}>
                {badge.progress.current}/{badge.progress.target}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Badge Detail Modal */}
      <Modal
        visible={selectedBadge !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setSelectedBadge(null)}
        >
          <View style={styles.modalContent}>
            <View style={[
              styles.modalBadgeIcon,
              selectedBadge?.unlocked ? styles.badgeUnlocked : styles.badgeLocked
            ]}>
              <Text style={styles.modalBadgeEmoji}>{selectedBadge?.icon}</Text>
            </View>
            
            <Text style={styles.modalTitle}>{selectedBadge?.name}</Text>
            
            {selectedBadge?.unlocked ? (
              <Text style={styles.modalDescription}>{selectedBadge?.description}</Text>
            ) : (
              <>
                <Text style={styles.modalRequirement}>{selectedBadge?.requirement}</Text>
                {selectedBadge?.progress && (
                  <View style={styles.progressBar}>
                    <View style={styles.progressTrack}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${(selectedBadge.progress.current / selectedBadge.progress.target) * 100}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressLabel}>
                      {selectedBadge.progress.current} / {selectedBadge.progress.target}
                    </Text>
                  </View>
                )}
              </>
            )}

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedBadge(null)}
            >
              <Text style={styles.closeButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  loadingText: {
    color: colors.textMuted,
    textAlign: 'center',
    padding: 20,
  },
  badgeScroll: {
    flexDirection: 'row',
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeUnlocked: {
    backgroundColor: colors.gold + '20',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  badgeLocked: {
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.textMuted + '40',
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeEmojiLocked: {
    opacity: 0.4,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 2,
  },
  badgeName: {
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
  },
  badgeNameLocked: {
    color: colors.textMuted,
  },
  progressText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  modalBadgeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBadgeEmoji: {
    fontSize: 44,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalRequirement: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    marginBottom: 20,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BadgeSection;
