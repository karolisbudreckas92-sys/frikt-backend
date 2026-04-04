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
import { api } from '@/src/services/api';
import { fonts } from '@/src/theme/colors';

const { width } = Dimensions.get('window');
const BADGE_SIZE = (width - 80) / 4;

const colors = {
  background: '#1A1D24',
  cardBg: '#2B2F36',
  surface: '#3A3F47',
  primary: '#E85D3A',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#3A3F47',
  unlocked: '#E85D3A',
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

// Badge category definitions with exact order
const BADGE_CATEGORIES = [
  {
    id: 'streaks',
    title: 'Visit Streaks',
    subtitle: 'Come back daily to keep your streak alive.',
    badgeIds: ['streak_2', 'streak_7', 'streak_14', 'streak_30', 'streak_100']
  },
  {
    id: 'explorer',
    title: 'Explorer',
    subtitle: "Tap into other people's frustrations.",
    badgeIds: ['explorer_3', 'explorer_25', 'explorer_100']
  },
  {
    id: 'relater',
    title: 'The Relater',
    subtitle: "Show others they're not alone.",
    badgeIds: ['relater_1', 'relater_10', 'relater_50', 'relater_200', 'relater_500']
  },
  {
    id: 'creator',
    title: 'Friction Creator',
    subtitle: 'Let it out. Post your frustrations.',
    badgeIds: ['creator_1', 'creator_5', 'creator_10', 'drama_influencer', 'universal_problem']
  },
  {
    id: 'commenter',
    title: 'The Commenter',
    subtitle: 'Join the conversation.',
    badgeIds: ['commenter_1', 'commenter_10', 'commenter_25']
  },
  {
    id: 'impact',
    title: 'Social Impact',
    subtitle: 'Your Frikts resonated with others.',
    badgeIds: ['impact_5', 'impact_25', 'impact_100']
  },
  {
    id: 'special',
    title: 'Special Milestones',
    subtitle: 'Rare achievements for dedicated Frikters.',
    badgeIds: ['follow_5', 'og_member', 'early_frikter']
  },
  {
    id: 'category_specialist',
    title: 'Category Specialists',
    subtitle: 'Master each frustration category.',
    badgeIds: [] // Will be populated dynamically based on user's posts
  }
];

// All category badge IDs
const CATEGORY_BADGE_IDS = [
  'category_money_apprentice', 'category_money_master',
  'category_work_apprentice', 'category_work_master',
  'category_health_apprentice', 'category_health_master',
  'category_home_apprentice', 'category_home_master',
  'category_tech_apprentice', 'category_tech_master',
  'category_school_apprentice', 'category_school_master',
  'category_relationships_apprentice', 'category_relationships_master',
  'category_travel_apprentice', 'category_travel_master',
  'category_services_apprentice', 'category_services_master'
];

// Hidden badges that should only appear when unlocked
const HIDDEN_UNTIL_UNLOCKED = ['drama_influencer', 'universal_problem'];

// Badge requirements/reasons mapping
const badgeRequirements: Record<string, { howToGet: string; whyGot: string }> = {
  // Streak badges
  'streak_2': { howToGet: 'Visit the app 2 days in a row', whyGot: 'You visited the app 2 days in a row' },
  'streak_7': { howToGet: 'Visit the app 7 days in a row', whyGot: 'You visited the app 7 days in a row' },
  'streak_14': { howToGet: 'Visit the app 14 days in a row', whyGot: 'You visited the app 14 days in a row' },
  'streak_30': { howToGet: 'Visit the app 30 days in a row', whyGot: 'You visited the app 30 days in a row' },
  'streak_100': { howToGet: 'Visit the app 100 days in a row', whyGot: 'You visited the app 100 days in a row' },
  
  // Explorer badges
  'explorer_3': { howToGet: 'Open 3 different Frikts', whyGot: 'You opened 3 different Frikts' },
  'explorer_25': { howToGet: 'Open 25 different Frikts', whyGot: 'You explored 25 different Frikts' },
  'explorer_100': { howToGet: 'Open 100 different Frikts', whyGot: 'You explored 100 different Frikts' },
  
  // Relater badges
  'relater_1': { howToGet: 'Relate to your first Frikt', whyGot: 'You related to your first Frikt' },
  'relater_10': { howToGet: 'Relate to 10 Frikts', whyGot: 'You related to 10 Frikts' },
  'relater_50': { howToGet: 'Relate to 50 Frikts', whyGot: 'You related to 50 Frikts' },
  'relater_200': { howToGet: 'Relate to 200 Frikts', whyGot: 'You related to 200 Frikts' },
  'relater_500': { howToGet: 'Relate to 500 Frikts', whyGot: 'You related to 500 Frikts' },
  
  // Creator badges
  'creator_1': { howToGet: 'Post your first Frikt', whyGot: 'You posted your first Frikt' },
  'creator_5': { howToGet: 'Post 5 Frikts', whyGot: 'You posted 5 Frikts' },
  'creator_10': { howToGet: 'Post 10 Frikts', whyGot: 'You posted 10 Frikts' },
  'drama_influencer': { howToGet: 'Get 20 relates on a single Frikt', whyGot: 'One of your Frikts got 20 relates' },
  'universal_problem': { howToGet: 'Get 50 relates on a single Frikt', whyGot: 'One of your Frikts got 50 relates' },
  
  // Commenter badges
  'commenter_1': { howToGet: 'Post your first comment', whyGot: 'You posted your first comment' },
  'commenter_10': { howToGet: 'Post 10 comments', whyGot: 'You posted 10 comments' },
  'commenter_25': { howToGet: 'Post 25 comments', whyGot: 'You posted 25 comments' },
  
  // Social badges
  'follow_5': { howToGet: 'Follow 5 users', whyGot: 'You followed 5 users' },
  
  // Social impact badges
  'impact_5': { howToGet: 'Receive 5 relates on your Frikts', whyGot: 'Your Frikts received 5 relates' },
  'impact_25': { howToGet: 'Receive 25 relates on your Frikts', whyGot: 'Your Frikts received 25 relates' },
  'impact_100': { howToGet: 'Receive 100 relates on your Frikts', whyGot: 'Your Frikts received 100 relates' },
  
  // Special badges
  'og_member': { howToGet: 'Be an original member of FRIKT', whyGot: 'You were one of the first FRIKT users' },
  'early_frikter': { howToGet: 'Join FRIKT early', whyGot: 'You joined FRIKT in its early days' },
  
  // Category badges
  'category_money_apprentice': { howToGet: 'Post 1 Frikt about Money', whyGot: 'You posted your first Frikt about Money' },
  'category_money_master': { howToGet: 'Post 5 Frikts about Money', whyGot: 'You posted 5 Frikts about Money' },
  'category_work_apprentice': { howToGet: 'Post 1 Frikt about Work', whyGot: 'You posted your first Frikt about Work' },
  'category_work_master': { howToGet: 'Post 5 Frikts about Work', whyGot: 'You posted 5 Frikts about Work' },
  'category_health_apprentice': { howToGet: 'Post 1 Frikt about Health', whyGot: 'You posted your first Frikt about Health' },
  'category_health_master': { howToGet: 'Post 5 Frikts about Health', whyGot: 'You posted 5 Frikts about Health' },
  'category_home_apprentice': { howToGet: 'Post 1 Frikt about Home', whyGot: 'You posted your first Frikt about Home' },
  'category_home_master': { howToGet: 'Post 5 Frikts about Home', whyGot: 'You posted 5 Frikts about Home' },
  'category_tech_apprentice': { howToGet: 'Post 1 Frikt about Tech', whyGot: 'You posted your first Frikt about Tech' },
  'category_tech_master': { howToGet: 'Post 5 Frikts about Tech', whyGot: 'You posted 5 Frikts about Tech' },
  'category_school_apprentice': { howToGet: 'Post 1 Frikt about School', whyGot: 'You posted your first Frikt about School' },
  'category_school_master': { howToGet: 'Post 5 Frikts about School', whyGot: 'You posted 5 Frikts about School' },
  'category_relationships_apprentice': { howToGet: 'Post 1 Frikt about Relationships', whyGot: 'You posted your first Frikt about Relationships' },
  'category_relationships_master': { howToGet: 'Post 5 Frikts about Relationships', whyGot: 'You posted 5 Frikts about Relationships' },
  'category_travel_apprentice': { howToGet: 'Post 1 Frikt about Travel', whyGot: 'You posted your first Frikt about Travel' },
  'category_travel_master': { howToGet: 'Post 5 Frikts about Travel', whyGot: 'You posted 5 Frikts about Travel' },
  'category_services_apprentice': { howToGet: 'Post 1 Frikt about Services', whyGot: 'You posted your first Frikt about Services' },
  'category_services_master': { howToGet: 'Post 5 Frikts about Services', whyGot: 'You posted 5 Frikts about Services' },
};

// Get requirement text for a badge
function getBadgeText(badge: Badge | null): { title: string; text: string } {
  if (!badge) {
    return { title: '', text: '' };
  }
  
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

// Badge Component
function BadgeItem({ badge, onPress }: { badge: Badge; onPress: () => void }) {
  if (!badge) return null;
  
  const isUnlocked = badge.unlocked === true;
  const progress = badge.progress;
  const progressPercent = progress && progress.target > 0 
    ? Math.min(100, (progress.current / progress.target) * 100) 
    : 0;
  
  return (
    <TouchableOpacity style={styles.badgeContainer} onPress={onPress}>
      <View style={[
        styles.badgeIcon,
        isUnlocked ? styles.badgeIconUnlocked : styles.badgeIconLocked
      ]}>
        {isUnlocked ? (
          <Text style={styles.badgeEmoji}>{badge.icon || '🏆'}</Text>
        ) : (
          <View style={styles.lockedBadge}>
            <Text style={styles.badgeEmojiLocked}>{badge.icon || '🏆'}</Text>
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
            </View>
          </View>
        )}
      </View>
      
      <Text style={[
        styles.badgeLabel,
        !isUnlocked && styles.badgeLabelLocked
      ]} numberOfLines={2}>
        {badge.name || 'Badge'}
      </Text>
      
      {/* Progress bar for locked badges */}
      {!isUnlocked && progress && progress.target > 0 && (
        <View style={styles.miniProgressContainer}>
          <View style={styles.miniProgressBar}>
            <View style={[styles.miniProgressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.miniProgressText}>
            {progress.current}/{progress.target}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Badge Detail Content
function BadgeDetailContent({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  if (!badge) return null;
  
  const isUnlocked = badge.unlocked === true;
  const badgeText = getBadgeText(badge);
  const progress = badge.progress;
  const progressPercent = progress && progress.target > 0 
    ? Math.min(100, (progress.current / progress.target) * 100) 
    : 0;
  
  return (
    <View style={styles.detailContent}>
      <View style={[
        styles.detailBadgeIcon,
        isUnlocked ? styles.badgeIconUnlocked : styles.badgeIconLocked
      ]}>
        {isUnlocked ? (
          <Text style={styles.detailEmoji}>{badge.icon || '🏆'}</Text>
        ) : (
          <Ionicons name="lock-closed" size={40} color="#9CA3AF" />
        )}
      </View>
      
      <Text style={styles.detailTitle}>{badge.name || 'Badge'}</Text>
      
      <View style={styles.requirementBox}>
        <Text style={[
          styles.requirementLabel,
          isUnlocked ? styles.requirementLabelUnlocked : styles.requirementLabelLocked
        ]}>
          {badgeText.title}
        </Text>
        <Text style={styles.requirementText}>
          {badgeText.text}
        </Text>
      </View>

      {isUnlocked && badge.unlocked_at && (
        <Text style={styles.detailDate}>
          Earned on {new Date(badge.unlocked_at).toLocaleDateString()}
        </Text>
      )}

      {!isUnlocked && progress && progress.target > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Progress: {progress.current} / {progress.target}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.detailCloseButton} onPress={onClose}>
        <Text style={styles.detailCloseText}>Got it</Text>
      </TouchableOpacity>
    </View>
  );
}

// Summary Header with progress
function SummaryHeader({ totalUnlocked, totalPossible }: { totalUnlocked: number; totalPossible: number }) {
  const progressPercent = totalPossible > 0 ? (totalUnlocked / totalPossible) * 100 : 0;
  
  return (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryText}>
        {totalUnlocked} / {totalPossible} badges earned
      </Text>
      <View style={styles.summaryProgressBar}>
        <View style={[styles.summaryProgressFill, { width: `${progressPercent}%` }]} />
      </View>
    </View>
  );
}

// Category Section
function CategorySection({ 
  title, 
  subtitle, 
  badges, 
  onBadgePress 
}: { 
  title: string; 
  subtitle: string; 
  badges: Badge[]; 
  onBadgePress: (badge: Badge) => void;
}) {
  if (badges.length === 0) return null;
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <View style={styles.badgeGrid}>
        {badges.map((badge) => (
          <BadgeItem 
            key={badge.badge_id} 
            badge={badge}
            onPress={() => onBadgePress(badge)}
          />
        ))}
      </View>
    </View>
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

  // Create a map of all badges for easy lookup
  const allBadgesMap: Record<string, Badge> = {};
  
  (badgeData.unlocked || []).forEach(badge => {
    allBadgesMap[badge.badge_id] = { ...badge, unlocked: true };
  });
  
  (badgeData.locked || []).forEach(badge => {
    allBadgesMap[badge.badge_id] = { ...badge, unlocked: false };
  });

  // Get badges for a category, filtering out hidden ones if not unlocked
  const getBadgesForCategory = (badgeIds: string[]): Badge[] => {
    return badgeIds
      .map(id => allBadgesMap[id])
      .filter(badge => {
        if (!badge) return false;
        // Hide certain badges until unlocked
        if (HIDDEN_UNTIL_UNLOCKED.includes(badge.badge_id) && !badge.unlocked) {
          return false;
        }
        return true;
      });
  };

  // Get category badges that user has interacted with
  const getCategorySpecialistBadges = (): Badge[] => {
    const categoryBadges: Badge[] = [];
    const categories = ['money', 'work', 'health', 'home', 'tech', 'school', 'relationships', 'travel', 'services'];
    
    categories.forEach(cat => {
      const apprenticeId = `category_${cat}_apprentice`;
      const masterId = `category_${cat}_master`;
      const apprentice = allBadgesMap[apprenticeId];
      const master = allBadgesMap[masterId];
      
      // Show category badges if user has made any progress OR has unlocked any
      const hasProgress = apprentice?.progress && apprentice.progress.current > 0;
      const hasUnlocked = apprentice?.unlocked || master?.unlocked;
      
      if (hasProgress || hasUnlocked) {
        if (apprentice) categoryBadges.push(apprentice);
        if (master) categoryBadges.push(master);
      }
    });
    
    return categoryBadges;
  };

  const totalUnlocked = badgeData.total_unlocked || 0;
  const totalPossible = badgeData.total_possible || 45;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Badges</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {/* Summary Header */}
          <SummaryHeader totalUnlocked={totalUnlocked} totalPossible={totalPossible} />

          {/* Category Sections */}
          {BADGE_CATEGORIES.map((category) => {
            let badges: Badge[];
            
            if (category.id === 'category_specialist') {
              badges = getCategorySpecialistBadges();
            } else {
              badges = getBadgesForCategory(category.badgeIds);
            }
            
            return (
              <CategorySection
                key={category.id}
                title={category.title}
                subtitle={category.subtitle}
                badges={badges}
                onBadgePress={setSelectedBadge}
              />
            );
          })}

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
            {selectedBadge && (
              <BadgeDetailContent 
                badge={selectedBadge} 
                onClose={() => setSelectedBadge(null)} 
              />
            )}
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

// Main Export - Button for Profile
export function BadgeSection() {
  const [badgeData, setBadgeData] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const loadBadges = async () => {
      try {
        const data = await api.getMyBadges();
        if (mounted && data) {
          setBadgeData(data);
        }
      } catch (err) {
        console.error('[BadgeSection] Error:', err);
        if (mounted) setError(true);
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
        <Text style={styles.statsLabel}>Badges</Text>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (error || !badgeData) {
    return null;
  }

  const totalUnlocked = badgeData.total_unlocked || 0;
  const totalPossible = badgeData.total_possible || 45;
  const unlockedBadges = badgeData.unlocked || [];
  const firstBadgeIcon = unlockedBadges.length > 0 ? (unlockedBadges[0]?.icon || '🏆') : '🏆';

  return (
    <>
      <TouchableOpacity 
        style={styles.statsRow} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.statsLabel}>Badges</Text>
        <Ionicons name="chevron-forward" size={14} color="#999999" />
        <View style={styles.statsBadge}>
          <Text style={styles.statsIcon}>{firstBadgeIcon}</Text>
          <Text style={styles.statsCount}>{totalUnlocked}/{totalPossible}</Text>
        </View>
      </TouchableOpacity>

      <BadgesModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        badgeData={badgeData}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Profile button styles
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
    color: '#1A1A1A',
    flex: 1,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1EB',
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
    fontSize: 14,
    color: '#E85D3A',
  },
  
  // Modal styles
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
    color: colors.textPrimary,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  
  // Summary header
  summaryContainer: {
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  summaryText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  summaryProgressBar: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  summaryProgressFill: {
    height: '100%',
    backgroundColor: '#E85D3A',
    borderRadius: 4,
  },
  
  // Section styles
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  
  // Badge item styles
  badgeContainer: {
    width: BADGE_SIZE,
    alignItems: 'center',
    marginBottom: 20,
  },
  badgeIcon: {
    width: BADGE_SIZE - 16,
    height: BADGE_SIZE - 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeIconUnlocked: {
    backgroundColor: '#FFF1EB',
    borderWidth: 2,
    borderColor: '#E85D3A',
  },
  badgeIconLocked: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.locked,
  },
  badgeEmoji: {
    fontSize: 26,
  },
  badgeEmojiLocked: {
    fontSize: 26,
    opacity: 0.3,
  },
  lockedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 4,
  },
  badgeLabel: {
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 2,
  },
  badgeLabelLocked: {
    color: colors.textSecondary,
  },
  
  // Mini progress bar on badge
  miniProgressContainer: {
    width: BADGE_SIZE - 20,
    marginTop: 4,
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#E85D3A',
    borderRadius: 2,
  },
  miniProgressText: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  
  // Detail modal styles
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
  detailBadgeIcon: {
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
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  requirementBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  requirementLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  requirementLabelUnlocked: {
    color: '#10B981',
  },
  requirementLabelLocked: {
    color: '#E85D3A',
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
    backgroundColor: '#E85D3A',
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
  },
});

export default BadgeSection;
