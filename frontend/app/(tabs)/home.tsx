import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import ProblemCard from '@/src/components/ProblemCard';
import MissionBanner from '@/src/components/MissionBanner';
import Toast from 'react-native-root-toast';
import { useBadges } from '@/src/contexts/BadgeContext';
import { useNotifications } from '@/src/contexts/NotificationContext';

type FeedType = 'foryou' | 'trending' | 'new';
type LocalSortType = 'trending' | 'new' | 'top';
type ViewMode = 'global' | 'local';

const showToast = (message: string, isError: boolean = false) => {
  Toast.show(message, {
    duration: Toast.durations.SHORT,
    position: Toast.positions.BOTTOM,
    shadow: true,
    animation: true,
    hideOnPress: true,
    backgroundColor: isError ? colors.error : colors.accent,
    textColor: colors.white,
    containerStyle: {
      borderRadius: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      marginBottom: 80,
    },
  });
};

export default function Home() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const [feed, setFeed] = useState<FeedType>('new');
  const [localSort, setLocalSort] = useState<LocalSortType>('trending');
  const [problems, setProblems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMission, setShowMission] = useState(true);
  const [hasError, setHasError] = useState(false);
  const hasTrackedVisit = useRef(false);
  
  // Community state
  const [myCommunity, setMyCommunity] = useState<any>(null);
  const [communityLoaded, setCommunityLoaded] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  const { unreadCount, refreshCount } = useNotifications();
  
  let trackVisit: (() => Promise<any[]>) | undefined;
  try {
    const badgeContext = useBadges();
    trackVisit = badgeContext.trackVisit;
  } catch (e) {}

  const loadCommunity = useCallback(async () => {
    try {
      const data = await api.getMyCommunity();
      setMyCommunity(data);
    } catch (error) {
      setMyCommunity(null);
    } finally {
      setCommunityLoaded(true);
    }
  }, []);

  const loadProblems = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setHasError(false);
    
    try {
      let data;
      if (viewMode === 'local' && myCommunity) {
        data = await api.getProblems('local', undefined, undefined, 0, myCommunity.id, localSort);
      } else {
        data = await api.getProblems(feed);
      }
      setProblems(data);
    } catch (error) {
      console.error('Error loading Frikts:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [feed, viewMode, myCommunity, localSort]);

  useEffect(() => {
    loadCommunity();
  }, []);

  useEffect(() => {
    if (viewMode === 'local' && !communityLoaded) return;
    loadProblems();
    refreshCount();
    
    if (!hasTrackedVisit.current && trackVisit) {
      hasTrackedVisit.current = true;
      trackVisit();
    }
  }, [feed, viewMode, localSort, communityLoaded]);

  const handleJoinCommunity = async () => {
    if (!joinCode.trim()) return;
    setIsJoining(true);
    try {
      const result = await api.joinCommunity(joinCode.trim());
      setMyCommunity(result.community);
      setJoinCode('');
      showToast(`Joined ${result.community.name}!`);
      loadProblems();
    } catch (error: any) {
      if (error.response?.status === 409) {
        const detail = error.response.data?.detail;
        Alert.alert(
          'Switch Community?',
          `You're already in "${detail?.current_community}". Switch to "${detail?.new_community}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Switch',
              onPress: async () => {
                try {
                  const result = await api.switchCommunity(joinCode.trim());
                  setMyCommunity(result.community);
                  setJoinCode('');
                  showToast(`Switched to ${result.community.name}!`);
                  loadProblems();
                } catch (e) {
                  showToast('Failed to switch', true);
                }
              }
            }
          ]
        );
      } else {
        showToast(error.response?.data?.detail || 'Invalid code', true);
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleRelate = async (problemId: string, isRelated: boolean) => {
    setProblems(prev => prev.map(p => {
      if (p.id === problemId) {
        return {
          ...p,
          user_has_related: !isRelated,
          relates_count: isRelated ? p.relates_count - 1 : p.relates_count + 1,
        };
      }
      return p;
    }));

    try {
      if (isRelated) {
        await api.unrelateToProblem(problemId);
      } else {
        await api.relateToProblem(problemId);
        showToast('Relates +1');
      }
    } catch (error: any) {
      setProblems(prev => prev.map(p => {
        if (p.id === problemId) {
          return {
            ...p,
            user_has_related: isRelated,
            relates_count: isRelated ? p.relates_count : p.relates_count - 1,
          };
        }
        return p;
      }));
      showToast(error.response?.data?.detail || 'Failed to update', true);
    }
  };

  const renderToggle = () => (
    <View style={styles.toggleContainer} data-testid="feed-toggle">
      <TouchableOpacity
        style={[styles.toggleButton, viewMode === 'global' && styles.toggleButtonActive]}
        onPress={() => setViewMode('global')}
        data-testid="global-toggle"
      >
        <Text style={[styles.toggleText, viewMode === 'global' && styles.toggleTextActive]}>Global</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleButton, viewMode === 'local' && styles.toggleButtonActiveLocal]}
        onPress={() => setViewMode('local')}
        data-testid="local-toggle"
      >
        <Ionicons name="location" size={14} color={viewMode === 'local' ? '#fff' : colors.textSecondary} />
        <Text style={[styles.toggleText, viewMode === 'local' && styles.toggleTextActive]}>Local</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {renderToggle()}
      
      {viewMode === 'global' ? (
        <>
          {showMission && <MissionBanner onDismiss={() => setShowMission(false)} />}
          <View style={styles.feedTabs}>
            {(['foryou', 'trending', 'new'] as FeedType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.feedTab, feed === tab && styles.feedTabActive]}
                onPress={() => setFeed(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.feedTabText, feed === tab && styles.feedTabTextActive]}>
                  {tab === 'foryou' ? 'For You' : tab === 'trending' ? 'Trending' : 'New'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.feedHelperText}>
            {feed === 'foryou' && 'Based on your categories'}
            {feed === 'trending' && 'Hot this week'}
            {feed === 'new' && 'Latest frikts'}
          </Text>
        </>
      ) : myCommunity ? (
        <>
          <View style={styles.communityHeader}>
            {myCommunity.avatar_url ? (
              <Image source={{ uri: myCommunity.avatar_url }} style={{ width: 20, height: 20, borderRadius: 10 }} />
            ) : (
              <Ionicons name="location" size={16} color="#E85D3A" />
            )}
            <Text style={styles.communityName}>{myCommunity.name}</Text>
            <Text style={styles.communityStats}>
              {myCommunity.member_count || 0} members
            </Text>
          </View>
          <View style={styles.feedTabs}>
            {(['trending', 'new', 'top'] as LocalSortType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.feedTab, localSort === tab && styles.feedTabActiveLocal]}
                onPress={() => setLocalSort(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.feedTabText, localSort === tab && styles.feedTabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );

  const renderLocalNoComm = () => (
    <View style={styles.noCommContainer} data-testid="no-community-view">
      <Ionicons name="location-outline" size={56} color="#E85D3A" />
      <Text style={styles.noCommTitle}>Join a local community</Text>
      <Text style={styles.noCommSubtitle}>See what's bugging your neighbours</Text>
      
      <View style={styles.joinInputRow}>
        <TextInput
          style={styles.joinInput}
          placeholder="Enter community code..."
          placeholderTextColor={colors.textMuted}
          value={joinCode}
          onChangeText={setJoinCode}
          autoCapitalize="characters"
          data-testid="community-code-input"
        />
        <TouchableOpacity
          style={[styles.joinButton, !joinCode.trim() && styles.joinButtonDisabled]}
          onPress={handleJoinCommunity}
          disabled={!joinCode.trim() || isJoining}
          data-testid="join-community-btn"
        >
          {isJoining ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.joinButtonText}>Join</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <Text style={styles.orText}>or</Text>
      
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push('/(tabs)/search')}
        data-testid="browse-communities-btn"
      >
        <Ionicons name="search-outline" size={18} color="#E85D3A" />
        <Text style={styles.browseButtonText}>Browse Communities</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={() => router.push('/request-community')}
        data-testid="request-community-link"
      >
        <Text style={styles.requestLink}>Want a local community? Request one here</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    if (viewMode === 'local' && !myCommunity) return renderLocalNoComm();
    
    if (hasError) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Couldn't load Frikts</Text>
          <Text style={styles.emptyText}>Check your connection and try again</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => loadProblems()}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={18} color={colors.white} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>
          {viewMode === 'local' ? 'No local Frikts yet' : 'No Frikts yet'}
        </Text>
        <Text style={styles.emptyText}>Be the first to share a friction!</Text>
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => router.push('/(tabs)/post')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.ctaButtonText}>Drop a Frikt</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>frikt</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/feedback')}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbox-ellipses-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'local' && !myCommunity && communityLoaded ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { loadCommunity(); }}
              tintColor={colors.primary}
            />
          }
        >
          {renderHeader()}
          {renderLocalNoComm()}
        </ScrollView>
      ) : (
        <FlatList
          data={problems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProblemCard
              problem={item}
              onPress={() => router.push(`/problem/${item.id}`)}
              onRelate={() => handleRelate(item.id, item.user_has_related)}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { loadCommunity(); loadProblems(true); }}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const CORAL = '#E85D3A';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: { fontSize: 24, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerButton: { position: 'relative', padding: 4 },
  notifBadge: {
    position: 'absolute', top: 0, right: 0, backgroundColor: colors.error,
    borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  headerContainer: { marginBottom: 8 },
  
  // Toggle
  toggleContainer: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12,
    backgroundColor: colors.surface, borderRadius: 24, padding: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  toggleButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 22, gap: 4,
  },
  toggleButtonActive: { backgroundColor: colors.primary },
  toggleButtonActiveLocal: { backgroundColor: CORAL },
  toggleText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  toggleTextActive: { color: '#fff' },
  
  // Feed tabs
  feedTabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  feedHelperText: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 16, paddingTop: 6, fontStyle: 'italic' },
  feedTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.surface },
  feedTabActive: { backgroundColor: colors.primary },
  feedTabActiveLocal: { backgroundColor: CORAL },
  feedTabText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  feedTabTextActive: { color: colors.white },
  
  // Community header
  communityHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 6,
  },
  communityName: { fontSize: 16, fontWeight: '700', color: colors.text },
  communityStats: { fontSize: 13, color: colors.textMuted },
  
  // No community
  noCommContainer: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  noCommTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16 },
  noCommSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  joinInputRow: {
    flexDirection: 'row', marginTop: 24, width: '100%', gap: 8,
  },
  joinInput: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: colors.text,
  },
  joinButton: {
    backgroundColor: CORAL, borderRadius: 12, paddingHorizontal: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  joinButtonDisabled: { opacity: 0.5 },
  joinButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  orText: { fontSize: 13, color: colors.textMuted, marginVertical: 16 },
  browseButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5,
    borderColor: CORAL, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24,
  },
  browseButtonText: { color: CORAL, fontWeight: '600', fontSize: 14 },
  requestLink: { color: CORAL, fontSize: 13, marginTop: 20, textDecorationLine: 'underline' },
  
  listContent: { paddingBottom: 100 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginTop: 20, gap: 8,
  },
  ctaButtonText: { fontSize: 14, fontWeight: '600', color: colors.white },
  retryButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginTop: 20, gap: 8,
  },
  retryButtonText: { fontSize: 14, fontWeight: '600', color: colors.white },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background,
  },
});
