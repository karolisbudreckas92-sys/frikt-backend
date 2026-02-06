import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { useAuth } from '@/src/context/AuthContext';

export default function Profile() {
  const router = useRouter();
  const { user, logout, isAdmin, refreshUser } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    if (!user) return;
    
    try {
      const data = await api.getUserStats(user.id);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  // Refresh user data when screen comes into focus
  useEffect(() => {
    refreshUser();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const getDisplayName = () => {
    return user?.displayName || user?.name || 'User';
  };

  const getInitial = () => {
    return getDisplayName().charAt(0).toUpperCase();
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => router.push('/edit-profile')}
          >
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitial()}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <Text style={styles.name}>{getDisplayName()}</Text>
          
          {user.bio && (
            <Text style={styles.bio}>{user.bio}</Text>
          )}
          
          {user.showCity && user.city && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={styles.location}>{user.city}</Text>
            </View>
          )}

          {/* Edit Profile Button */}
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={styles.editProfileText}>Edit profile</Text>
          </TouchableOpacity>

          {stats?.rocket10_completed && (
            <View style={styles.badge}>
              <Ionicons name="rocket" size={14} color={colors.accent} />
              <Text style={styles.badgeText}>Rocket 10 Finisher</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.posts_count || 0}</Text>
            <Text style={styles.statLabel}>Frikts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.comments_count || 0}</Text>
            <Text style={styles.statLabel}>Comments</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.relates_count || 0}</Text>
            <Text style={styles.statLabel}>Relates</Text>
          </View>
        </View>

        {/* Streak Card */}
        {stats?.streak_days > 0 && (
          <View style={styles.streakCard}>
            <Ionicons name="flame" size={24} color={colors.warning} />
            <View style={styles.streakInfo}>
              <Text style={styles.streakTitle}>{stats.streak_days} day streak!</Text>
              <Text style={styles.streakText}>Keep contributing to maintain it</Text>
            </View>
          </View>
        )}

        {/* Admin Section */}
        {isAdmin && (
          <View style={styles.menuSection}>
            <Text style={styles.menuTitle}>Administration</Text>
            
            <TouchableOpacity style={styles.adminMenuItem} onPress={() => router.push('/admin')}>
              <View style={styles.adminMenuIcon}>
                <Ionicons name="shield-checkmark" size={22} color={colors.white} />
              </View>
              <Text style={styles.menuText}>Admin Panel</Text>
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>ADMIN</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Activity Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.menuTitle}>Your Activity</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/my-posts')}>
            <View style={styles.menuIcon}>
              <Ionicons name="document-text-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.menuText}>My Frikts</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/saved')}>
            <View style={styles.menuIcon}>
              <Ionicons name="bookmark-outline" size={22} color={colors.accent} />
            </View>
            <Text style={styles.menuText}>Saved Frikts</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications')}>
            <View style={styles.menuIcon}>
              <Ionicons name="notifications-outline" size={22} color={colors.warning} />
            </View>
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notification-settings')}>
            <View style={styles.menuIcon}>
              <Ionicons name="settings-outline" size={22} color={colors.info} />
            </View>
            <Text style={styles.menuText}>Notification Settings</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
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
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  bio: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  location: {
    fontSize: 13,
    color: colors.textMuted,
  },
  editProfileButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.softAmber,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  streakInfo: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  streakText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  adminMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  adminMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminBadge: {
    backgroundColor: colors.softRed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + '40',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
});
