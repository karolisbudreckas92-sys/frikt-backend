import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import ProblemCard from '@/src/components/ProblemCard';
import MissionBanner from '@/src/components/MissionBanner';

type FeedType = 'foryou' | 'trending' | 'new';

export default function Home() {
  const router = useRouter();
  const [feed, setFeed] = useState<FeedType>('new');
  const [problems, setProblems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMission, setShowMission] = useState(true);

  const loadProblems = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const data = await api.getProblems(feed);
      setProblems(data);
    } catch (error) {
      console.error('Error loading problems:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [feed]);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  useEffect(() => {
    loadProblems();
    loadNotifications();
  }, [feed]);

  const handleRelate = async (problemId: string, isRelated: boolean) => {
    try {
      if (isRelated) {
        await api.unrelateToProblem(problemId);
      } else {
        await api.relateToProblem(problemId);
      }
      // Update local state
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
    } catch (error) {
      console.error('Error toggling relate:', error);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {showMission && (
        <MissionBanner onDismiss={() => setShowMission(false)} />
      )}
      
      <View style={styles.feedTabs}>
        {(['foryou', 'trending', 'new'] as FeedType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.feedTab, feed === tab && styles.feedTabActive]}
            onPress={() => setFeed(tab)}
          >
            <Text style={[styles.feedTabText, feed === tab && styles.feedTabTextActive]}>
              {tab === 'foryou' ? 'For You' : tab === 'trending' ? 'Trending' : 'New'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>PathGro</Text>
        <TouchableOpacity 
          style={styles.notifButton}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

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
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No problems yet</Text>
              <Text style={styles.emptyText}>Be the first to share a friction!</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadProblems(true)}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  logo: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  notifButton: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  headerContainer: {
    marginBottom: 8,
  },
  feedTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  feedTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  feedTabActive: {
    backgroundColor: colors.primary,
  },
  feedTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  feedTabTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
