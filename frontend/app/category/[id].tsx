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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import ProblemCard from '@/src/components/ProblemCard';
import { useAuth } from '@/src/context/AuthContext';
import Toast from 'react-native-root-toast';

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

export default function CategoryProblems() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  
  const [category, setCategory] = useState<any>(null);
  const [problems, setProblems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const loadData = async (refresh = false) => {
    if (!id) return;
    
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const [categoriesData, problemsData] = await Promise.all([
        api.getCategories(),
        api.getProblems('new', id),
      ]);
      
      const cat = categoriesData.find((c: any) => c.id === id);
      setCategory(cat);
      setProblems(problemsData);
      setIsFollowing(user?.followed_categories?.includes(id) || false);
    } catch (error) {
      console.error('Error loading category:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleFollow = async () => {
    if (!id) return;
    
    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);

    try {
      if (wasFollowing) {
        await api.unfollowCategory(id);
        showToast('Unfollowed');
      } else {
        await api.followCategory(id);
        showToast('Following 🔔');
      }
    } catch (error) {
      setIsFollowing(wasFollowing);
      showToast('Failed to update', true);
    }
  };

  const handleRelate = async (problemId: string, isRelated: boolean) => {
    // Optimistic update
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
        showToast('Relates +1 ❤️');
      }
    } catch (error) {
      // Rollback
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
      showToast('Failed to update', true);
    }
  };

  if (isLoading || !category) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Category</Text>
          <View style={{ width: 32 }} />
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
            <Ionicons name={category.icon} size={18} color={category.color} />
          </View>
          <Text style={styles.title}>{category.name}</Text>
        </View>
        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.followButtonActive]}
          onPress={handleFollow}
        >
          <Ionicons
            name={isFollowing ? 'checkmark' : 'add'}
            size={18}
            color={isFollowing ? colors.white : category.color}
          />
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
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name={category.icon} size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No problems yet</Text>
            <Text style={styles.emptyText}>Be the first to share a friction in {category.name}!</Text>
            <TouchableOpacity 
              style={[styles.postButton, { backgroundColor: category.color }]}
              onPress={() => router.push('/(tabs)/post')}
            >
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.postButtonText}>Post a Problem</Text>
            </TouchableOpacity>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  followButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
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
    textAlign: 'center',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});
