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
import { colors, fonts } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import ProblemCard from '@/src/components/ProblemCard';
import MissionBanner from '@/src/components/MissionBanner';
import Toast from 'react-native-root-toast';
import { useBadges } from '@/src/contexts/BadgeContext';
import { useNotifications } from '@/src/contexts/NotificationContext';

type FeedType = 'foryou' | 'trending' | 'new';
type ViewMode = 'global' | 'comm';

const CORAL = '#E85D3A';

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

// Extract slug from "frikt.com/<slug>" or similar input. Returns null if invalid.
const extractSlug = (raw: string): string | null => {
  let s = (raw || '').trim();
  if (!s) return null;
  // Strip protocol
  s = s.replace(/^https?:\/\//i, '');
  // Strip www.
  s = s.replace(/^www\./i, '');
  // Strip host + leading slash
  s = s.replace(/^frikt\.com\/?/i, '');
  // Strip any trailing path/query
  s = s.split(/[/?#]/)[0];
  s = s.toLowerCase().trim();
  // Validate against slug rules
  if (!/^[a-z0-9-]{3,40}$/.test(s)) return null;
  return s;
};

export default function Home() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const [feed, setFeed] = useState<FeedType>('new');
  const [problems, setProblems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMission, setShowMission] = useState(true);
  const [hasError, setHasError] = useState(false);
  const hasTrackedVisit = useRef(false);

  // Comm state
  const [myCommunities, setMyCommunities] = useState<any[]>([]);
  const [exploreCommunities, setExploreCommunities] = useState<any[]>([]);
  const [exploreSearch, setExploreSearch] = useState('');
  const [commLoaded, setCommLoaded] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [isOpeningLink, setIsOpeningLink] = useState(false);

  const { unreadCount, refreshCount } = useNotifications();

  let trackVisit: (() => Promise<any[]>) | undefined;
  try {
    const badgeContext = useBadges();
    trackVisit = badgeContext.trackVisit;
  } catch (e) {}

  const loadCommData = useCallback(async () => {
    try {
      const [mine, explore] = await Promise.all([
        api.getCommunitiesMine().catch(() => []),
        api.getCommunitiesExplore(undefined, 30, 0).catch(() => []),
      ]);
      setMyCommunities(Array.isArray(mine) ? mine : []);
      setExploreCommunities(Array.isArray(explore) ? explore : []);
    } finally {
      setCommLoaded(true);
    }
  }, []);

  const loadExploreSearch = useCallback(async (query: string) => {
    try {
      const data = await api.getCommunitiesExplore(query || undefined, 30, 0);
      setExploreCommunities(Array.isArray(data) ? data : []);
    } catch (e) {
      // keep existing list
    }
  }, []);

  const loadProblems = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setHasError(false);

    try {
      const data = await api.getProblems(feed);
      setProblems(data);
    } catch (error) {
      console.error('Error loading Frikts:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [feed]);

  // Load communities on mount
  useEffect(() => {
    loadCommData();
  }, [loadCommData]);

  // Load problems for Global feed when tab is active
  useEffect(() => {
    if (viewMode !== 'global') return;
    loadProblems();
    refreshCount();
    if (!hasTrackedVisit.current && trackVisit) {
      hasTrackedVisit.current = true;
      trackVisit();
    }
  }, [feed, viewMode, loadProblems, refreshCount, trackVisit]);

  // Debounced explore search
  useEffect(() => {
    if (viewMode !== 'comm') return;
    const t = setTimeout(() => {
      loadExploreSearch(exploreSearch.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [exploreSearch, viewMode, loadExploreSearch]);

  const handleOpenLinkOrCode = async () => {
    const raw = linkInput.trim();
    if (!raw) return;
    const slug = extractSlug(raw);
    if (!slug) {
      Alert.alert('Invalid link', 'Paste a link like "frikt.com/your-community" or just the handle after the slash.');
      return;
    }
    setIsOpeningLink(true);
    try {
      const data = await api.getCommunityBySlug(slug);
      if (!data || !data.id) {
        showToast('Community not found', true);
        return;
      }
      // If private and no access, prompt for code
      if (data.requires_code && !data.has_access) {
        Alert.prompt(
          data.name || 'Enter access code',
          'This is a private community. Enter the access code to open it.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Unlock',
              onPress: async (code?: string) => {
                if (!code || !code.trim()) return;
                try {
                  await api.accessCommunity(data.id, code.trim());
                  setLinkInput('');
                  await loadCommData();
                  router.push(`/community/${data.id}`);
                } catch (err: any) {
                  showToast(err.response?.data?.detail || 'Invalid access code', true);
                }
              },
            },
          ],
          'plain-text'
        );
        return;
      }
      // Public / unlisted / already-has-access → open directly
      setLinkInput('');
      router.push(`/community/${data.id}`);
    } catch (e: any) {
      if (e.response?.status === 404) {
        showToast('Community not found', true);
      } else {
        showToast(e.response?.data?.detail || 'Could not open community', true);
      }
    } finally {
      setIsOpeningLink(false);
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
        style={[styles.toggleButton, viewMode === 'comm' && styles.toggleButtonActiveLocal]}
        onPress={() => setViewMode('comm')}
        data-testid="comm-toggle"
      >
        <Ionicons name="people" size={14} color={viewMode === 'comm' ? '#fff' : colors.textSecondary} />
        <Text style={[styles.toggleText, viewMode === 'comm' && styles.toggleTextActive]}>Comm</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGlobalHeader = () => (
    <View style={styles.headerContainer}>
      {renderToggle()}
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
    </View>
  );

  const renderCommView = () => (
    <ScrollView
      contentContainerStyle={styles.commScroll}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={async () => {
            setIsRefreshing(true);
            await loadCommData();
            await loadExploreSearch(exploreSearch.trim());
            setIsRefreshing(false);
          }}
          tintColor={CORAL}
        />
      }
    >
      {renderToggle()}

      {/* Have a link or code */}
      <View style={styles.linkSection} data-testid="comm-link-section">
        <Text style={styles.sectionTitle}>Have a link or code?</Text>
        <View style={styles.linkRow}>
          <TextInput
            style={styles.linkInput}
            placeholder="frikt.com/your-community"
            placeholderTextColor={colors.textMuted}
            value={linkInput}
            onChangeText={setLinkInput}
            autoCapitalize="none"
            autoCorrect={false}
            data-testid="comm-link-input"
          />
          <TouchableOpacity
            style={[styles.linkButton, (!linkInput.trim() || isOpeningLink) && styles.linkButtonDisabled]}
            onPress={handleOpenLinkOrCode}
            disabled={!linkInput.trim() || isOpeningLink}
            data-testid="comm-link-open"
          >
            {isOpeningLink ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.linkButtonText}>Open</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* My communities */}
      <View style={styles.block} data-testid="my-communities-section">
        <Text style={styles.sectionTitle}>My communities</Text>
        {!commLoaded ? (
          <ActivityIndicator color={CORAL} style={{ marginTop: 12 }} />
        ) : myCommunities.length === 0 ? (
          <Text style={styles.emptyRowText}>
            You haven't opened any community yet. Explore below or paste a link.
          </Text>
        ) : (
          myCommunities.map((c: any) => (
            <TouchableOpacity
              key={c.id}
              style={styles.commRow}
              onPress={() => router.push(`/community/${c.id}`)}
              activeOpacity={0.7}
              data-testid={`my-community-${c.id}`}
            >
              {c.avatar_url ? (
                <Image source={{ uri: c.avatar_url }} style={styles.commAvatar} />
              ) : (
                <View style={[styles.commAvatar, styles.commAvatarPlaceholder]}>
                  <Ionicons name="people" size={18} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.commInfo}>
                <View style={styles.commNameRow}>
                  <Text style={styles.commName} numberOfLines={1}>{c.name}</Text>
                  {c.is_owner ? (
                    <View style={styles.ownerBadge}>
                      <Text style={styles.ownerBadgeText}>Owner</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.commMeta} numberOfLines={1}>
                  frikt.com/{c.slug} · {c.member_count} {c.member_count === 1 ? 'member' : 'members'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Explore */}
      <View style={styles.block} data-testid="explore-communities-section">
        <Text style={styles.sectionTitle}>Explore</Text>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search public communities"
            placeholderTextColor={colors.textMuted}
            value={exploreSearch}
            onChangeText={setExploreSearch}
            autoCapitalize="none"
            autoCorrect={false}
            data-testid="explore-search-input"
          />
          {exploreSearch.length > 0 && (
            <TouchableOpacity onPress={() => setExploreSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {!commLoaded ? (
          <ActivityIndicator color={CORAL} style={{ marginTop: 12 }} />
        ) : exploreCommunities.length === 0 ? (
          <Text style={styles.emptyRowText}>No public communities found.</Text>
        ) : (
          exploreCommunities.map((c: any) => (
            <TouchableOpacity
              key={c.id}
              style={styles.commRow}
              onPress={() => router.push(`/community/${c.id}`)}
              activeOpacity={0.7}
              data-testid={`explore-community-${c.id}`}
            >
              {c.avatar_url ? (
                <Image source={{ uri: c.avatar_url }} style={styles.commAvatar} />
              ) : (
                <View style={[styles.commAvatar, styles.commAvatarPlaceholder]}>
                  <Ionicons name="people" size={18} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.commInfo}>
                <Text style={styles.commName} numberOfLines={1}>{c.name}</Text>
                <Text style={styles.commMeta} numberOfLines={1}>
                  frikt.com/{c.slug} · {c.member_count} {c.member_count === 1 ? 'member' : 'members'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
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
        <Text style={styles.emptyTitle}>No Frikts yet</Text>
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

      {viewMode === 'comm' ? (
        renderCommView()
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
          ListHeaderComponent={renderGlobalHeader}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadProblems(true)}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {isLoading && viewMode === 'global' && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

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
  logo: { fontSize: 24, color: colors.primary, letterSpacing: -0.5, fontFamily: fonts.bold },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerButton: { position: 'relative', padding: 4 },
  notifBadge: {
    position: 'absolute', top: 0, right: 0, backgroundColor: colors.error,
    borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10, fontFamily: fonts.bold },
  headerContainer: { marginBottom: 8 },

  toggleContainer: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 8,
    backgroundColor: colors.surface, borderRadius: 24, padding: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  toggleButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 22, gap: 4,
  },
  toggleButtonActive: { backgroundColor: colors.primary },
  toggleButtonActiveLocal: { backgroundColor: CORAL },
  toggleText: { fontSize: 14, color: colors.textSecondary, fontFamily: fonts.medium },
  toggleTextActive: { color: '#fff' },

  feedTabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  feedHelperText: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 16, paddingTop: 6, fontStyle: 'italic' },
  feedTab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, height: 36, justifyContent: 'center' },
  feedTabActive: { backgroundColor: CORAL, borderColor: CORAL },
  feedTabText: { fontSize: 13, color: colors.text },
  feedTabTextActive: { color: '#FFFFFF' },

  commScroll: { paddingBottom: 100 },

  linkSection: {
    marginHorizontal: 16, marginTop: 16, padding: 14, backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
  },
  linkRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  linkInput: {
    flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text,
  },
  linkButton: {
    backgroundColor: CORAL, borderRadius: 10, paddingHorizontal: 18,
    justifyContent: 'center', alignItems: 'center', minWidth: 72,
  },
  linkButtonDisabled: { backgroundColor: colors.disabledBg },
  linkButtonText: { color: '#fff', fontSize: 14, fontFamily: fonts.bold },

  block: { marginTop: 18, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, color: colors.text, fontFamily: fonts.bold, marginBottom: 6 },
  emptyRowText: { fontSize: 13, color: colors.textMuted, paddingVertical: 10 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 6, marginBottom: 4,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },

  commRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  commAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  commAvatarPlaceholder: {
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  commInfo: { flex: 1 },
  commNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commName: { fontSize: 15, color: colors.text, fontFamily: fonts.semibold, flexShrink: 1 },
  commMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  ownerBadge: { backgroundColor: CORAL + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  ownerBadgeText: { fontSize: 10, color: CORAL, fontFamily: fonts.bold },

  listContent: { paddingBottom: 100 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, color: colors.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginTop: 20, gap: 8,
  },
  ctaButtonText: { fontSize: 14, color: colors.white, fontFamily: fonts.semibold },
  retryButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginTop: 20, gap: 8,
  },
  retryButtonText: { fontSize: 14, color: colors.white, fontFamily: fonts.semibold },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background,
  },
});
