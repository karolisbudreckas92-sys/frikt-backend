import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  SafeAreaView,
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

const { width } = Dimensions.get('window');
const BADGE_SIZE = (width - 80) / 4;

const colors = {
  background: '#1A1D24',
  cardBg: '#2B2F36',
  surface: '#3A3F47',
  primary: '#E4572E',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#3A3F47',
  gold: '#FFD700',
  unlocked: '#F59E0B',
  locked: '#4B5563',
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

// Group badges by category
function groupByCategory(badges: Badge[]): Record<string, Badge[]> {
  return badges.reduce((acc, badge) => {
    const cat = badge.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);
}

// Category display names
const categoryNames: Record<string, string> = {
  'streak': 'Visit Streaks',
  'explorer': 'Explorer',
  'relater': 'Relater',
  'creator': 'Creator',
  'commenter': 'Commenter',
  'social_impact': 'Social Impact',
  'social': 'Social',
  'category_pioneer': 'Category Pioneer',
  'category_expert': 'Category Expert',
  'special': 'Special',
  'Other': 'Other',
};

// Hexagon Badge Component
function HexagonBadge({ badge, onPress }: { badge: Badge; onPress: () => void }) {
  const isUnlocked = badge.unlocked;
  
  return (
    <TouchableOpacity style={styles.hexagonContainer} onPress={onPress}>
      <View style={[
        styles.hexagon,
        isUnlocked ? styles.hexagonUnlocked : styles.hexagonLocked
      ]}>
        {isUnlocked ? (
          <Text style={styles.hexagonEmoji}>{badge.icon || '🏆'}</Text>
        ) : (
          <Ionicons name="lock-closed" size={24} color="#9CA3AF" />
        )}
      </View>
      <Text style={[
        styles.hexagonLabel,
        !isUnlocked && styles.hexagonLabelLocked
      ]} numberOfLines={2}>
        {badge.name}
      </Text>
    </TouchableOpacity>
  );
}

// Full Badges Screen Modal
function BadgesModal({ 
  visible, 
  onClose, 
  badgeData 
}: { 
  visible: boolean; 
  onClose: () => void; 
  badgeData: BadgeData | null;
}) {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  if (!badgeData) return null;

  // Combine and group all badges
  const allBadges = [
    ...badgeData.unlocked.map(b => ({ ...b, unlocked: true })),
    ...badgeData.locked.map(b => ({ ...b, unlocked: false }))
  ];
  const groupedBadges = groupByCategory(allBadges);
  const categories = Object.keys(groupedBadges);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Badges</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {/* Unlocked Section */}
          {badgeData.unlocked.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Unlocked</Text>
              <Text style={styles.sectionSubtitle}>
                {badgeData.total_unlocked} badges earned
              </Text>
              <View style={styles.badgeGrid}>
                {badgeData.unlocked.map((badge) => (
                  <HexagonBadge 
                    key={badge.badge_id} 
                    badge={{ ...badge, unlocked: true }}
                    onPress={() => setSelectedBadge({ ...badge, unlocked: true })}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Locked Section */}
          {badgeData.locked.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Locked</Text>
              <Text style={styles.sectionSubtitle}>
                {badgeData.locked.length} badges to unlock
              </Text>
              <View style={styles.badgeGrid}>
                {badgeData.locked.map((badge) => (
                  <HexagonBadge 
                    key={badge.badge_id} 
                    badge={{ ...badge, unlocked: false }}
                    onPress={() => setSelectedBadge({ ...badge, unlocked: false })}
                  />
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Badge Detail Modal */}
        <Modal
          visible={selectedBadge !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedBadge(null)}
        >
          <TouchableOpacity 
            style={styles.detailOverlay} 
            activeOpacity={1} 
            onPress={() => setSelectedBadge(null)}
          >
            <View style={styles.detailContent}>
              <View style={[
                styles.detailHexagon,
                selectedBadge?.unlocked ? styles.hexagonUnlocked : styles.hexagonLocked
              ]}>
                {selectedBadge?.unlocked ? (
                  <Text style={styles.detailEmoji}>{selectedBadge?.icon || '🏆'}</Text>
                ) : (
                  <Ionicons name="lock-closed" size={40} color="#9CA3AF" />
                )}
              </View>
              <Text style={styles.detailTitle}>{selectedBadge?.name}</Text>
              <Text style={styles.detailDescription}>
                {selectedBadge?.description || selectedBadge?.requirement || 'Complete actions to unlock'}
              </Text>
              {selectedBadge?.unlocked && selectedBadge?.unlocked_at && (
                <Text style={styles.detailDate}>
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
              <TouchableOpacity style={styles.detailCloseButton} onPress={() => setSelectedBadge(null)}>
                <Text style={styles.detailCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

// Main Export - Compact Badge Button for Profile
export function BadgeSection() {
  const [badgeData, setBadgeData] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const loadBadges = async () => {
      try {
        const data = await api.getMyBadges();
        if (mounted) setBadgeData(data);
      } catch (err) {
        console.error('[BadgeSection] Error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadBadges();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <View style={styles.compactContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!badgeData) {
    return null;
  }

  return (
    <>
      {/* Compact Button */}
      <TouchableOpacity 
        style={styles.compactContainer} 
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.compactLabel}>Badges</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        <View style={styles.compactBadge}>
          <Text style={styles.compactIcon}>🏆</Text>
          <Text style={styles.compactCount}>{badgeData.total_unlocked}</Text>
        </View>
      </TouchableOpacity>

      {/* Full Badges Modal */}
      <BadgesModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        badgeData={badgeData}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Compact Button Styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  compactLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 1,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: 8,
  },
  compactIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  compactCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E4572E',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Section Styles
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },

  // Badge Grid
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Hexagon Badge
  hexagonContainer: {
    width: BADGE_SIZE,
    alignItems: 'center',
    marginBottom: 16,
  },
  hexagon: {
    width: BADGE_SIZE - 16,
    height: BADGE_SIZE - 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  hexagonUnlocked: {
    backgroundColor: '#F59E0B20',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  hexagonLocked: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.locked,
  },
  hexagonEmoji: {
    fontSize: 28,
  },
  hexagonLabel: {
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },
  hexagonLabelLocked: {
    color: colors.textSecondary,
  },

  // Detail Modal
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  detailHexagon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailEmoji: {
    fontSize: 40,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  detailDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  detailDate: {
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
    backgroundColor: colors.surface,
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
  detailCloseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  detailCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BadgeSection;
