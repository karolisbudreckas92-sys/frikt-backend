import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import ProblemCard from '@/src/components/ProblemCard';
import Toast from 'react-native-root-toast';

type SortType = 'trending' | 'new' | 'top';
const CORAL = '#E85D3A';

const showToast = (message: string, isError: boolean = false) => {
  Toast.show(message, {
    duration: Toast.durations.SHORT,
    position: Toast.positions.BOTTOM,
    backgroundColor: isError ? colors.error : CORAL,
    textColor: '#fff',
    containerStyle: { borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 80 },
  });
};

export default function CommunityDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [community, setCommunity] = useState<any>(null);
  const [problems, setProblems] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<SortType>('new');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // For private communities without access
  const [codeInput, setCodeInput] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  const loadCommunity = useCallback(async () => {
    try {
      const data = await api.getCommunity(id!);
      setCommunity(data);
    } catch (error: any) {
      // 403 → private without access → we already handle that with has_access flag in detail,
      // but if endpoint throws 403, show a message.
      if (error.response?.status === 403) {
        setCommunity({ id, requires_code: true, has_access: false, name: 'Private community' });
      } else {
        showToast('Failed to load community', true);
      }
    }
  }, [id]);

  const loadFeed = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      const data = await api.getProblems('local', undefined, undefined, 0, id, sortBy);
      setProblems(data);
    } catch (error) {
      // Community might be private without access; silently keep problems empty.
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, sortBy]);

  // On first load: fetch community and auto-access if public/unlisted and not in list yet
  useEffect(() => {
    (async () => {
      await loadCommunity();
    })();
  }, [id, loadCommunity]);

  useEffect(() => {
    if (!community) return;
    const canView = !community.requires_code || community.has_access !== false;
    if (!canView) {
      setIsLoading(false);
      return;
    }
    // Auto-access for public/unlisted communities so they show up in "My communities".
    // (The server reports has_access=true for every public/unlisted community, so check
    // membership instead.)
    if (community.visibility && community.visibility !== 'private' && !community.is_member && !community.is_owner) {
      api.accessCommunity(community.id).catch(() => {});
    }
    loadFeed();
  }, [community, sortBy, loadFeed]);

  const handleUnlock = async () => {
    if (!codeInput.trim()) return;
    setIsUnlocking(true);
    try {
      await api.accessCommunity(id!, codeInput.trim());
      setCodeInput('');
      await loadCommunity();
      showToast('Unlocked ✓');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Invalid access code', true);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handlePost = () => {
    if (!community || !community.id) return;
    router.push({ pathname: '/(tabs)/post', params: { community_id: community.id, community_name: community.name } });
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

  const handleRemoveFromList = () => {
    Alert.alert(
      'Remove from my communities?',
      'You can add it back anytime via its link or code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.leaveAccessCommunity(id!);
              router.back();
            } catch (err: any) {
              showToast(err.response?.data?.detail || 'Failed to remove', true);
            }
          },
        },
      ]
    );
  };

  const renderLockedView = () => (
    <View style={styles.lockedWrap} data-testid="locked-community-view">
      <Ionicons name="lock-closed" size={40} color={CORAL} />
      <Text style={styles.lockedTitle}>This is a private Frikt Community</Text>
      <Text style={styles.lockedSubtitle}>Enter the access code to open it.</Text>
      <TextInput
        style={styles.codeInput}
        placeholder="Access code"
        placeholderTextColor={colors.textMuted}
        value={codeInput}
        onChangeText={setCodeInput}
        autoCapitalize="characters"
        autoCorrect={false}
        data-testid="community-code-input"
      />
      <TouchableOpacity
        style={[styles.unlockButton, (!codeInput.trim() || isUnlocking) && styles.unlockButtonDisabled]}
        onPress={handleUnlock}
        disabled={!codeInput.trim() || isUnlocking}
        data-testid="community-unlock-btn"
      >
        {isUnlocking ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.unlockButtonText}>Unlock</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View>
      <View style={styles.communityInfo}>
        <View style={styles.communityIcon}>
          {community?.avatar_url ? (
            <Image source={{ uri: community.avatar_url }} style={{ width: 56, height: 56, borderRadius: 28 }} />
          ) : (
            <Ionicons name="people" size={28} color="#fff" />
          )}
        </View>
        <Text style={styles.communityName}>{community?.name}</Text>
        {community?.slug ? (
          <Text style={styles.communitySlug}>frikt.com/{community.slug}</Text>
        ) : null}
        {community?.description ? (
          <Text style={styles.communityDescription}>{community.description}</Text>
        ) : null}
        <Text style={styles.communityStats}>
          {community?.member_count || 0} members · {community?.frikt_count || 0} frikts
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handlePost} data-testid="community-post-btn">
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Post</Text>
          </TouchableOpacity>
          {community?.is_owner ? (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push(`/community-edit/${community.id}`)}
              data-testid="community-manage-btn"
            >
              <Ionicons name="settings-outline" size={16} color={CORAL} />
              <Text style={styles.secondaryBtnText}>Manage</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleRemoveFromList}
            data-testid="community-remove-btn"
          >
            <Ionicons name="close-outline" size={16} color={CORAL} />
            <Text style={styles.secondaryBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sortPills}>
        {(['trending', 'new', 'top'] as SortType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.pill, sortBy === tab && styles.pillActive]}
            onPress={() => setSortBy(tab)}
            activeOpacity={0.7}
            data-testid={`sort-${tab}`}
          >
            <Text style={[styles.pillText, sortBy === tab && styles.pillTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (!community && isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={CORAL} />
        </View>
      </SafeAreaView>
    );
  }

  const canView = community && (!community.requires_code || community.has_access !== false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{community?.name || 'Community'}</Text>
        <View style={{ width: 32 }} />
      </View>

      {!canView ? (
        renderLockedView()
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { loadCommunity(); loadFeed(true); }}
              tintColor={CORAL}
            />
          }
          contentContainerStyle={styles.listContent}
        >
          {renderHeader()}
          {problems.length > 0 ? (
            problems.map((item) => (
              <ProblemCard
                key={item.id}
                problem={item}
                onPress={() => router.push(`/problem/${item.id}`)}
                onRelate={() => handleRelate(item.id, item.user_has_related)}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No frikts yet</Text>
              <Text style={styles.emptyText}>Be the first to share a friction!</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, color: colors.text, textAlign: 'center', fontFamily: fonts.semibold },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  communityInfo: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  communityIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: CORAL,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  communityName: { fontSize: 22, color: colors.text, fontFamily: fonts.bold, textAlign: 'center' },
  communitySlug: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  communityDescription: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 16 },
  communityStats: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: CORAL, paddingVertical: 10, paddingHorizontal: 18, borderRadius: radius.md,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontFamily: fonts.semibold },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: CORAL, paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md,
  },
  secondaryBtnText: { color: CORAL, fontSize: 14, fontFamily: fonts.semibold },

  sortPills: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.surface },
  pillActive: { backgroundColor: CORAL },
  pillText: { fontSize: 14, color: colors.textSecondary },
  pillTextActive: { color: '#fff' },

  listContent: { paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, color: colors.text, marginTop: 12 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },

  lockedWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingVertical: 60 },
  lockedTitle: { fontSize: 18, color: colors.text, marginTop: 14, textAlign: 'center', fontFamily: fonts.semibold },
  lockedSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  codeInput: {
    marginTop: 24, width: '100%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: colors.text, textAlign: 'center',
  },
  unlockButton: {
    marginTop: 14, backgroundColor: CORAL, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10,
  },
  unlockButtonDisabled: { backgroundColor: colors.disabledBg },
  unlockButtonText: { color: '#fff', fontSize: 15, fontFamily: fonts.bold },
});
