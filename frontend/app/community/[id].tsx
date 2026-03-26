import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/src/theme/colors';
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
  const [sortBy, setSortBy] = useState<SortType>('trending');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const loadCommunity = useCallback(async () => {
    try {
      const data = await api.getCommunity(id!);
      setCommunity(data);
      if (data.has_pending_request) setRequestSent(true);
    } catch (error) {
      showToast('Failed to load community', true);
    }
  }, [id]);

  const loadFeed = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      const data = await api.getProblems('local', undefined, undefined, 0, id, sortBy);
      setProblems(data);
    } catch (error) {
      console.error('Error loading local feed:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, sortBy]);

  useEffect(() => {
    loadCommunity();
  }, [id]);

  useEffect(() => {
    if (community) loadFeed();
  }, [community, sortBy]);

  const handleRequestJoin = async () => {
    setIsRequesting(true);
    try {
      await api.requestJoinCommunity(id!, requestMessage.trim() || undefined);
      setRequestSent(true);
      showToast('Request submitted!');
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to submit request', true);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRelate = async (problemId: string, isRelated: boolean) => {
    if (!community?.is_member) {
      showToast('Only community members can relate', true);
      return;
    }
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

  const renderHeader = () => (
    <View>
      {/* Community info */}
      <View style={styles.communityInfo}>
        <View style={styles.communityIcon}>
          <Ionicons name="location" size={28} color="#fff" />
        </View>
        <Text style={styles.communityName}>{community?.name}</Text>
        <Text style={styles.communityStats}>
          {community?.member_count || 0} members | {community?.frikt_count || 0} frikts
        </Text>
      </View>

      {/* Request to Join banner (non-members only) */}
      {community && !community.is_member && (
        <View style={styles.joinBanner} data-testid="request-join-banner">
          {requestSent ? (
            <View style={styles.requestSentContainer}>
              <Ionicons name="checkmark-circle" size={20} color={CORAL} />
              <Text style={styles.requestSentText}>
                Request sent! We'll review it and share the code with you if approved.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.joinBannerTitle}>Want to join {community.name}?</Text>
              <TextInput
                style={styles.joinMessageInput}
                placeholder="Add a message (optional)..."
                placeholderTextColor={colors.textMuted}
                value={requestMessage}
                onChangeText={setRequestMessage}
                multiline
                data-testid="join-request-message"
              />
              <TouchableOpacity
                style={styles.requestJoinButton}
                onPress={handleRequestJoin}
                disabled={isRequesting}
                data-testid="request-join-btn"
              >
                {isRequesting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.requestJoinButtonText}>Request to Join</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Non-member notice */}
      {community && !community.is_member && (
        <View style={styles.nonMemberNotice}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.nonMemberNoticeText}>
            You can browse and comment, but only members can relate to local frikts.
          </Text>
        </View>
      )}

      {/* Sort pills */}
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{community?.name || 'Community'}</Text>
        <View style={{ width: 32 }} />
      </View>

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
            <Text style={styles.emptyText}>
              {community?.is_member ? 'Be the first to share a local friction!' : 'This community has no posts yet.'}
            </Text>
          </View>
        )}
      </ScrollView>
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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.text, textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  communityInfo: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  communityIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: CORAL,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  communityName: { fontSize: 22, fontWeight: '700', color: colors.text },
  communityStats: { fontSize: 14, color: colors.textMuted, marginTop: 4 },

  joinBanner: {
    marginHorizontal: 16, padding: 16, borderRadius: radius.lg,
    backgroundColor: '#FFF3EF', borderWidth: 1, borderColor: CORAL + '30',
  },
  joinBannerTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10 },
  joinMessageInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: 12, fontSize: 14, color: colors.text,
    minHeight: 60, textAlignVertical: 'top', marginBottom: 10,
  },
  requestJoinButton: {
    backgroundColor: CORAL, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center',
  },
  requestJoinButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  requestSentContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestSentText: { flex: 1, fontSize: 14, color: CORAL, lineHeight: 20 },

  nonMemberNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16,
    marginTop: 10, paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: colors.surface, borderRadius: radius.sm,
  },
  nonMemberNoticeText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 16 },

  sortPills: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.surface },
  pillActive: { backgroundColor: CORAL },
  pillText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  pillTextActive: { color: '#fff' },

  listContent: { paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text, marginTop: 12 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
});
