import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import ProblemCard from '@/src/components/ProblemCard';
import Toast from 'react-native-root-toast';

type SearchType = 'frikts' | 'users';

interface UserResult {
  id: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  posts_count: number;
}

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

export default function Search() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('frikts');
  const [friktsResults, setFriktsResults] = useState<any[]>([]);
  const [usersResults, setUsersResults] = useState<UserResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    Keyboard.dismiss();
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      if (searchType === 'frikts') {
        const data = await api.getProblems('new', undefined, query.trim());
        setFriktsResults(data);
      } else {
        const data = await api.searchUsers(query.trim());
        setUsersResults(data);
      }
    } catch (error) {
      console.error('Error searching:', error);
      showToast('Search failed', true);
    } finally {
      setIsLoading(false);
    }
  }, [query, searchType]);

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    // Clear results when switching type
    if (type === 'frikts') {
      setUsersResults([]);
    } else {
      setFriktsResults([]);
    }
    // Re-search if there's a query
    if (query.trim() && hasSearched) {
      setTimeout(() => {
        handleSearchWithType(type);
      }, 100);
    }
  };

  const handleSearchWithType = async (type: SearchType) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      if (type === 'frikts') {
        const data = await api.getProblems('new', undefined, query.trim());
        setFriktsResults(data);
      } else {
        const data = await api.searchUsers(query.trim());
        setUsersResults(data);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelate = async (problemId: string, isRelated: boolean) => {
    // Optimistic update
    setFriktsResults(prev => prev.map(p => {
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
      setFriktsResults(prev => prev.map(p => {
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

  const renderUserCard = ({ item }: { item: UserResult }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => router.push(`/user/${item.id}`)}
      activeOpacity={0.7}
      data-testid={`user-card-${item.id}`}
    >
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.userAvatar} />
      ) : (
        <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
          <Text style={styles.userAvatarText}>
            {(item.displayName || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        {item.bio ? (
          <Text style={styles.userBio} numberOfLines={2}>{item.bio}</Text>
        ) : null}
        <Text style={styles.userStats}>{item.posts_count} Frikts</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const renderEmptyFrikts = () => {
    if (isLoading) return null;
    
    return hasSearched ? (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No Frikts found</Text>
        <Text style={styles.emptyText}>Try different keywords</Text>
      </View>
    ) : (
      <View style={styles.emptyContainer}>
        <Ionicons name="bulb-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Start searching</Text>
        <Text style={styles.emptyText}>Find Frikts others have shared</Text>
      </View>
    );
  };

  const renderEmptyUsers = () => {
    if (isLoading) return null;
    
    return hasSearched ? (
      <View style={styles.emptyContainer}>
        <Ionicons name="person-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No users found</Text>
        <Text style={styles.emptyText}>Try a different name</Text>
      </View>
    ) : (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Find users</Text>
        <Text style={styles.emptyText}>Search by name to find people</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>Find Frikts and users</Text>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentButton, searchType === 'frikts' && styles.segmentButtonActive]}
          onPress={() => handleSearchTypeChange('frikts')}
          activeOpacity={0.7}
          data-testid="search-tab-frikts"
        >
          <Ionicons 
            name="document-text-outline" 
            size={18} 
            color={searchType === 'frikts' ? colors.white : colors.textSecondary} 
          />
          <Text style={[styles.segmentText, searchType === 'frikts' && styles.segmentTextActive]}>
            Frikts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, searchType === 'users' && styles.segmentButtonActive]}
          onPress={() => handleSearchTypeChange('users')}
          activeOpacity={0.7}
          data-testid="search-tab-users"
        >
          <Ionicons 
            name="people-outline" 
            size={18} 
            color={searchType === 'users' ? colors.white : colors.textSecondary} 
          />
          <Text style={[styles.segmentText, searchType === 'users' && styles.segmentTextActive]}>
            Users
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchType === 'frikts' ? 'Search Frikts...' : 'Search users...'}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            data-testid="search-input"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.searchButton, !query.trim() && styles.searchButtonDisabled]} 
          onPress={handleSearch}
          disabled={!query.trim()}
          activeOpacity={0.7}
          data-testid="search-submit-btn"
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : searchType === 'frikts' ? (
        <FlatList
          data={friktsResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProblemCard
              problem={item}
              onPress={() => router.push(`/problem/${item.id}`)}
              onRelate={() => handleRelate(item.id, item.user_has_related)}
            />
          )}
          ListEmptyComponent={renderEmptyFrikts}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={usersResults}
          keyExtractor={(item) => item.id}
          renderItem={renderUserCard}
          ListEmptyComponent={renderEmptyUsers}
          contentContainerStyle={styles.listContent}
        />
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
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.sm,
    gap: 6,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: colors.text,
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
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
  // User card styles
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userBio: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  userStats: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});
