import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/src/theme/colors';
import { api } from '@/src/services/api';

interface BlockedUser {
  id: string;
  blocked_user_id: string;
  blocked_user_name: string;
  blocked_user_avatar: string | null;
  created_at: string;
}

export default function BlockedUsers() {
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const loadBlockedUsers = async () => {
    try {
      const data = await api.getBlockedUsers();
      setBlockedUsers(data);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const handleUnblock = async (blockedUserId: string, userName: string) => {
    const confirmUnblock = () => {
      setUnblockingId(blockedUserId);
      performUnblock(blockedUserId);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Unblock @${userName}?`)) {
        confirmUnblock();
      }
    } else {
      Alert.alert(
        `Unblock @${userName}?`,
        'Their content will become visible again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unblock', onPress: confirmUnblock },
        ]
      );
    }
  };

  const performUnblock = async (blockedUserId: string) => {
    try {
      await api.unblockUser(blockedUserId);
      setBlockedUsers(prev => prev.filter(u => u.blocked_user_id !== blockedUserId));
      
      if (Platform.OS === 'web') {
        // Toast on web (you might use a toast library)
      } else {
        Alert.alert('User unblocked');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      Alert.alert('Error', 'Failed to unblock user');
    } finally {
      setUnblockingId(null);
    }
  };

  const renderItem = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userRow}>
      <View style={styles.userInfo}>
        {item.blocked_user_avatar ? (
          <Image source={{ uri: item.blocked_user_avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.blocked_user_name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <View style={styles.nameContainer}>
          <Text style={styles.userName}>{item.blocked_user_name || 'Unknown User'}</Text>
          <Text style={styles.blockedDate}>
            Blocked {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => handleUnblock(item.blocked_user_id, item.blocked_user_name)}
        disabled={unblockingId === item.blocked_user_id}
      >
        {unblockingId === item.blocked_user_id ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.unblockText}>Unblock</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Blocked Users</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={{ width: 32 }} />
      </View>
      {blockedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No blocked users</Text>
          <Text style={styles.emptyText}>
            Users you block will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  listContent: {
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  blockedDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    minWidth: 80,
    alignItems: 'center',
  },
  unblockText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
