import React, { useState, useEffect } from 'react';
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
import { useAuth } from '@/src/context/AuthContext';

export default function Categories() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [followedCategories, setFollowedCategories] = useState<string[]>([]);

  // Sync local state with user's followed categories
  useEffect(() => {
    if (user?.followed_categories) {
      setFollowedCategories(user.followed_categories);
    }
  }, [user?.followed_categories]);

  const loadCategories = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleFollowCategory = async (categoryId: string, isFollowing: boolean) => {
    // Optimistic update - update UI immediately
    if (isFollowing) {
      setFollowedCategories(prev => prev.filter(id => id !== categoryId));
    } else {
      setFollowedCategories(prev => [...prev, categoryId]);
    }
    
    try {
      if (isFollowing) {
        await api.unfollowCategory(categoryId);
      } else {
        await api.followCategory(categoryId);
      }
      // Refresh user to sync the state
      await refreshUser();
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Revert optimistic update on error
      if (isFollowing) {
        setFollowedCategories(prev => [...prev, categoryId]);
      } else {
        setFollowedCategories(prev => prev.filter(id => id !== categoryId));
      }
    }
  };

  const renderCategory = ({ item }: { item: any }) => {
    const isFollowing = followedCategories.includes(item.id);
    const isLocal = item.id === 'local';
    
    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => {
          if (isLocal) {
            router.push('/(tabs)/home');
          } else {
            router.push(`/category/${item.id}`);
          }
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
          <Ionicons name={item.icon as any} size={32} color={item.color} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <Text style={styles.categoryHint}>
            {isLocal ? 'Tap to see local frikts' : 'Tap to browse problems'}
          </Text>
        </View>
        {!isLocal && (
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followButtonActive]}
            onPress={() => handleFollowCategory(item.id, isFollowing)}
          >
            <Ionicons
              name={isFollowing ? 'checkmark' : 'add'}
              size={18}
              color={isFollowing ? colors.white : colors.primary}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Categories</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>Follow categories to personalize your feed</Text>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadCategories(true)}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 16,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  categoryHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  followButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
