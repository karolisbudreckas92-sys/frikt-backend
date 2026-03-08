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
  unlocked: '#F59E0B',
  locked: '#4B5563',
  profileBg: '#F6F3EE',
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

// Badge requirements/reasons mapping
const badgeRequirements: Record<string, { howToGet: string; whyGot: string }> = {
  // Streak badges
  'just_browsing': { howToGet: 'Visit the app 2 days in a row', whyGot: 'You visited the app 2 days in a row' },
  'hooked': { howToGet: 'Visit the app 7 days in a row', whyGot: 'You visited the app 7 days in a row' },
  'regular_visitor': { howToGet: 'Visit the app 14 days in a row', whyGot: 'You visited the app 14 days in a row' },
  'mayor_of_frikt': { howToGet: 'Visit the app 30 days in a row', whyGot: 'You visited the app 30 days in a row' },
  'i_love_problems': { howToGet: 'Visit the app 100 days in a row', whyGot: 'You visited the app 100 days in a row' },
  
  // Explorer badges
  'curious_human': { howToGet: 'Open 3 different Frikts', whyGot: 'You opened 3 different Frikts' },
  'nosey': { howToGet: 'Open 25 different Frikts', whyGot: 'You explored 25 different Frikts' },
  'rabbit_hole': { howToGet: 'Open 100 different Frikts', whyGot: 'You explored 100 different Frikts' },
  
  // Relater badges
  'not_alone': { howToGet: 'Relate to your first Frikt', whyGot: 'You related to your first Frikt' },
  'empathy_expert': { howToGet: 'Relate to 10 Frikts', whyGot: 'You related to 10 Frikts' },
  'honorary_therapist': { howToGet: 'Relate to 50 Frikts', whyGot: 'You related to 50 Frikts' },
  'community_pillar': { howToGet: 'Relate to 200 Frikts', whyGot: 'You related to 200 Frikts' },
  'mother_theresa': { howToGet: 'Relate to 500 Frikts', whyGot: 'You related to 500 Frikts' },
  
  // Creator badges
  'first_vent': { howToGet: 'Post your first Frikt', whyGot: 'You posted your first Frikt' },
  'regular_frikter': { howToGet: 'Post 5 Frikts', whyGot: 'You posted 5 Frikts' },
  'professional_hater': { howToGet: 'Post 10 Frikts', whyGot: 'You posted 10 Frikts' },
  'drama_influencer': { howToGet: 'Get 20 relates on a single Frikt', whyGot: 'One of your Frikts got 20 relates' },
  'universal_problem': { howToGet: 'Get 50 relates on a single Frikt', whyGot: 'One of your Frikts got 50 relates' },
  
  // Commenter badges
  'helpful_stranger': { howToGet: 'Post your first comment', whyGot: 'You posted your first comment' },
  'voice_of_reason': { howToGet: 'Post 10 comments', whyGot: 'You posted 10 comments' },
  'community_voice': { howToGet: 'Post 25 comments', whyGot: 'You posted 25 comments' },
  
  // Social badges
  'nosey_neighbor': { howToGet: 'Follow 5 users', whyGot: 'You followed 5 users' },
  
  // Social impact badges
  'trending_topic': { howToGet: 'Receive 5 relates on your Frikts', whyGot: 'Your Frikts received 5 relates' },
  'local_celebrity': { howToGet: 'Receive 25 relates on your Frikts', whyGot: 'Your Frikts received 25 relates' },
  'frikt_famous': { howToGet: 'Receive 100 relates on your Frikts', whyGot: 'Your Frikts received 100 relates' },
  
  // Special badges
  'og_member': { howToGet: 'Be an original member of FRIKT', whyGot: 'You were one of the first FRIKT users' },
  'early_frikter': { howToGet: 'Join FRIKT early', whyGot: 'You joined FRIKT in its early days' },
};

// Get requirement text for a badge
function getBadgeText(badge: Badge): { title: string; text: string } {
  const req = badgeRequirements[badge.badge_id];
  
  if (badge.unlocked) {
    return {
      title: 'You earned this because:',
      text: req?.whyGot || badge.description || 'You completed the required action'
    };
  } else {
    return {
      title: 'How to unlock:',
      text: req?.howToGet || badge.requirement || 'Complete the required action'
    };
  }
}

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
              
              {/* Requirement/Reason Section */}
              {selectedBadge && (
                <View style={styles.requirementBox}>
                  <Text style={[
                    styles.requirementLabel,
                    selectedBadge.unlocked ? styles.requirementLabelUnlocked : styles.requirementLabelLocked
                  ]}>
                    {getBadgeText(selectedBadge).title}
                  </Text>
                  <Text style={styles.requirementText}>
                    {getBadgeText(selectedBadge).text}
                  </Text>
                </View>
              )}

              {/* Unlocked date */}
              {selectedBadge?.unlocked && selectedBadge?.unlocked_at && (
                <Text style={styles.detailDate}>
                  Earned on {new Date(selectedBadge.unlocked_at).toLocaleDateString()}
                </Text>
              )}

              {/* Progress bar for locked badges */}
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
                    Progress: {selectedBadge.progress.current} / {selectedBadge.progress.target}
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.detailCloseButton} onPress={() => setSelectedBadge(null)}>
                <Text style={styles.detailCloseText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

// Main Export - Product Hunt style button for Profile
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
      <View style={styles.statsRow}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!badgeData) {
    return null;
  }

  // Get the first unlocked badge icon or default
  const firstBadgeIcon = badgeData.unlocked[0]?.icon || '🏆';

  return (
    <>
      {/* Product Hunt Style Stats Row */}
      <TouchableOpacity 
        style={styles.statsRow} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.statsLabel}>Badges</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        <View style={styles.statsBadge}>
          <Text style={styles.statsIcon}>{firstBadgeIcon}</Text>
          <Text style={styles.statsCount}>{badgeData.total_unlocked}</Text>
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
  // Product Hunt Style Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  statsLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 1,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  statsIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  statsCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D97706',
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
    fontSize: 20,
    fontWeight: '700',
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
    marginBottom: 20,
  },
  hexagon: {
    width: BADGE_SIZE - 16,
    height: BADGE_SIZE - 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  hexagonUnlocked: {
    backgroundColor: '#FEF3C7',
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
    paddingHorizontal: 2,
  },
  hexagonLabelLocked: {
    color: colors.textSecondary,
  },

  // Detail Modal
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    padding: 28,
    width: '88%',
    alignItems: 'center',
  },
  detailHexagon: {
    width: 88,
    height: 88,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailEmoji: {
    fontSize: 44,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  
  // Requirement Box
  requirementBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  requirementLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  requirementLabelUnlocked: {
    color: '#10B981',
  },
  requirementLabelLocked: {
    color: '#F59E0B',
  },
  requirementText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  
  detailDate: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    height: 10,
    backgroundColor: colors.surface,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  detailCloseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  detailCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BadgeSection;
