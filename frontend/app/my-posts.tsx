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
import { colors } from '../src/theme/colors';
import { api } from '../src/services/api';
import ProblemCard from '../src/components/ProblemCard';

export default function MyPosts() {
  const router = useRouter();
  const [problems, setProblems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMyPosts = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const data = await api.getMyPosts();
      setProblems(data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMyPosts();
  }, []);

  const handleRelate = async (problemId: string, isRelated: boolean) => {
    try {
      if (isRelated) {
        await api.unrelateToProblem(problemId);
      } else {
        await api.relateToProblem(problemId);
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
    } catch (error) {
      console.error('Error toggling relate:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>My Problems</Text>
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
        <Text style={styles.title}>My Problems</Text>
        <View style={{ width: 32 }} />
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
            onRefresh={() => loadMyPosts(true)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No problems posted</Text>
            <Text style={styles.emptyText}>Share your first friction!</Text>
            <TouchableOpacity 
              style={styles.postButton}
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
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
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
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
