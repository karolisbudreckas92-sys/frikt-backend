import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

const colors = {
  background: '#F6F3EE',
  cardBg: '#FFFFFF',
  darkBar: '#2B2F36',
  primary: '#E4572E',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E5E5E5',
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

function SafeBadgeSection() {
  const [badgeData, setBadgeData] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const loadBadges = async () => {
      try {
        const data = await api.getMyBadges();
        if (mounted) {
          setBadgeData(data);
          setError(null);
        }
      } catch (err: any) {
        console.error('[BadgeSection] Error:', err);
        if (mounted) {
          setError(err?.message || 'Failed to load');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadBadges();
    
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Badges</Text>
        </View>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
      </View>
    );
  }

  if (error || !badgeData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Badges</Text>
        </View>
        <Text style={styles.emptyText}>Coming soon...</Text>
      </View>
    );
  }

  const allBadges = [...(badgeData.unlocked || []), ...(badgeData.locked || [])];
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Badges</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {badgeData.total_unlocked || 0} / {allBadges.length}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
        {(badgeData.unlocked || []).map((badge) => (
          <TouchableOpacity
            key={badge.badge_id}
            style={styles.badgeItem}
            onPress={() => setSelectedBadge(badge)}
          >
            <View style={[styles.badgeIcon, styles.badgeUnlocked]}>
              <Text style={styles.badgeEmoji}>{badge.icon || '🏆'}</Text>
            </View>
            <Text style={styles.badgeName} numberOfLines={1}>{badge.name || 'Badge'}</Text>
          </TouchableOpacity>
        ))}
        
        {(badgeData.locked || []).map((badge) => (
          <TouchableOpacity
            key={badge.badge_id}
            style={styles.badgeItem}
            onPress={() => setSelectedBadge(badge)}
          >
            <View style={[styles.badgeIcon, styles.badgeLocked]}>
              <Ionicons name="lock-closed" size={20} color="#CCCCCC" />
            </View>
            <Text style={[styles.badgeName, styles.badgeNameLocked]} numberOfLines={1}>
              {badge.name || 'Badge'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
              {selectedBadge?.unlocked ? (
                <Text style={styles.modalBadgeEmoji}>{selectedBadge?.icon || '🏆'}</Text>
              ) : (
                <Ionicons name="lock-closed" size={32} color="#CCCCCC" />
              )}
            </View>
            <Text style={styles.modalTitle}>{selectedBadge?.name || 'Badge'}</Text>
            <Text style={styles.modalDescription}>
              {selectedBadge?.description || selectedBadge?.requirement || 'Complete actions to unlock'}
            </Text>
            {selectedBadge?.unlocked && selectedBadge?.unlocked_at && (
              <Text style={styles.modalUnlockedDate}>
                Unlocked {new Date(selectedBadge.unlocked_at).toLocaleDateString()}
              </Text>
            )}
            {!selectedBadge?.unlocked && selectedBadge?.progress && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${Math.min(100, (selectedBadge.progress.current / selectedBadge.progress.target) * 100)}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {selectedBadge.progress.current} / {selectedBadge.progress.target}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedBadge(null)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export function BadgeSection() {
  try {
    return <SafeBadgeSection />;
  } catch (e) {
    console.error('[BadgeSection] Crash:', e);
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Badges</Text>
        </View>
        <Text style={styles.emptyText}>Coming soon...</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  badgeScroll: {
    flexDirection: 'row',
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 64,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeUnlocked: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  badgeLocked: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  badgeEmoji: {
    fontSize: 22,
  },
  badgeName: {
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalBadgeIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBadgeEmoji: {
    fontSize: 36,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalUnlockedDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BadgeSection;
