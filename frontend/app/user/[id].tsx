import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { colors, radius } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import { getCategoryStyle } from '@/src/theme/categoryStyles';

type SortOption = 'newest' | 'top';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const loadData = async (refresh = false) => {
    if (!id) return;
    
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const [profileData, postsData] = await Promise.all([
        api.getUserProfile(id),
        api.getUserPosts(id, sortBy),
      ]);
      setProfile(profileData);
      setPosts(postsData);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (profile) {
      api.getUserPosts(id!, sortBy).then(setPosts).catch(console.error);
    }
  }, [sortBy]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color={colors.textMuted} />
          <Text style={styles.errorText}>User not found</Text>
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
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(profile.displayName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.displayName}>{profile.displayName}</Text>
          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.posts_count}</Text>
            <Text style={styles.statLabel}>Frikts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.comments_count}</Text>
            <Text style={styles.statLabel}>Comments</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.relates_count}</Text>
            <Text style={styles.statLabel}>Relates</Text>
          </View>
        </View>

        {/* Posts Section */}
        <View style={styles.postsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Frikts</Text>
            <View style={styles.sortTabs}>
              {(['newest', 'top'] as SortOption[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.sortTab, sortBy === option && styles.sortTabActive]}
                  onPress={() => setSortBy(option)}
                >
                  <Text style={[styles.sortTabText, sortBy === option && styles.sortTabTextActive]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No frikts yet</Text>
              <Text style={styles.emptySubtitle}>This user hasn't posted any frikts</Text>
            </View>
          ) : (
            posts.map((post) => {
              const categoryStyle = getCategoryStyle(post.category_id || '');
              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postCard}
                  onPress={() => router.push(`/problem/${post.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.categoryPill, { backgroundColor: categoryStyle.bgColor }]}>
                    <Text style={[styles.categoryText, { color: categoryStyle.color }]}>
                      {post.category_name || categoryStyle.name}
                    </Text>
                  </View>
                  <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
                  <View style={styles.postFooter}>
                    <View style={styles.postStats}>
                      <View style={styles.postStat}>
                        <Ionicons name="heart" size={14} color={colors.primary} />
                        <Text style={styles.postStatText}>{post.relates_count}</Text>
                      </View>
                      <View style={styles.postStat}>
                        <Ionicons name="chatbubble" size={14} color={colors.textMuted} />
                        <Text style={styles.postStatText}>{post.comments_count}</Text>
                      </View>
                    </View>
                    <Text style={styles.postTime}>
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 16,
    marginTop: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  postsSection: {
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  sortTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
  },
  sortTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  sortTabActive: {
    backgroundColor: colors.primary,
  },
  sortTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  sortTabTextActive: {
    color: colors.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  postCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 21,
    marginBottom: 10,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postStats: {
    flexDirection: 'row',
    gap: 12,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  postTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
