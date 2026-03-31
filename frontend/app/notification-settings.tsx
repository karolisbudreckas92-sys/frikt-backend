import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import { registerForPushNotificationsAsync } from '@/src/services/notifications';

export default function NotificationSettings() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    pushNotifications: true,
    newComments: true,
    newRelates: true,
    commentReplies: true,
    follows: true,
    trending: true,
  });
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    loadSettings();
    checkPushStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getNotificationSettings();
      setSettings({
        pushNotifications: data.push_notifications,
        newComments: data.new_comments,
        newRelates: data.new_relates,
        commentReplies: data.comment_replies ?? true,
        follows: data.follows ?? true,
        trending: data.trending,
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPushStatus = async () => {
    const token = await registerForPushNotificationsAsync();
    // Token is valid if it exists and starts with "ExponentPushToken"
    const isValid = !!token && token.startsWith('ExponentPushToken');
    setPushEnabled(isValid);
  };

  const handleToggle = async (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    setIsSaving(true);
    try {
      await api.updateNotificationSettings({
        push_notifications: newSettings.pushNotifications,
        new_comments: newSettings.newComments,
        new_relates: newSettings.newRelates,
        comment_replies: newSettings.commentReplies,
        follows: newSettings.follows,
        trending: newSettings.trending,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      // Revert on error
      setSettings(settings);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Notification Settings</Text>
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
        <Text style={styles.title}>Notification Settings</Text>
        {isSaving ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statusCard}>
          <View style={[styles.statusIcon, { backgroundColor: pushEnabled ? colors.accent + '20' : colors.warning + '20' }]}>
            <Ionicons 
              name={pushEnabled ? 'notifications' : 'notifications-off'} 
              size={24} 
              color={pushEnabled ? colors.accent : colors.warning} 
            />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              {pushEnabled ? 'Push Notifications Enabled' : 'Push Notifications Limited'}
            </Text>
            <Text style={styles.statusText}>
              {pushEnabled 
                ? 'You will receive push notifications on this device' 
                : 'Enable notifications in your device settings to receive alerts'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Master Toggle</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <View style={[styles.settingIcon, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="notifications" size={20} color={colors.accent} />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Enable or disable all push notifications</Text>
            </View>
          </View>
          <Switch
            value={settings.pushNotifications}
            onValueChange={(value) => handleToggle('pushNotifications', value)}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.white}
          />
        </View>

        <Text style={styles.sectionTitle}>Notification Types</Text>

        <View style={[styles.settingCard, !settings.pushNotifications && styles.settingDisabled]}>
          <View style={styles.settingInfo}>
            <View style={[styles.settingIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="chatbubble" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>New Comments</Text>
              <Text style={styles.settingDesc}>When someone comments on your problem</Text>
            </View>
          </View>
          <Switch
            value={settings.newComments}
            onValueChange={(value) => handleToggle('newComments', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
            disabled={!settings.pushNotifications}
          />
        </View>

        <View style={[styles.settingCard, !settings.pushNotifications && styles.settingDisabled]}>
          <View style={styles.settingInfo}>
            <View style={[styles.settingIcon, { backgroundColor: colors.relateActive + '20' }]}>
              <Ionicons name="heart" size={20} color={colors.relateActive} />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>New Relates</Text>
              <Text style={styles.settingDesc}>When someone relates to your problem</Text>
            </View>
          </View>
          <Switch
            value={settings.newRelates}
            onValueChange={(value) => handleToggle('newRelates', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
            disabled={!settings.pushNotifications}
          />
        </View>

        <View style={[styles.settingCard, !settings.pushNotifications && styles.settingDisabled]}>
          <View style={styles.settingInfo}>
            <View style={[styles.settingIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="return-down-forward" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Comment Replies</Text>
              <Text style={styles.settingDesc}>When someone replies to your comment</Text>
            </View>
          </View>
          <Switch
            value={settings.commentReplies}
            onValueChange={(value) => handleToggle('commentReplies', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
            disabled={!settings.pushNotifications}
          />
        </View>

        <View style={[styles.settingCard, !settings.pushNotifications && styles.settingDisabled]}>
          <View style={styles.settingInfo}>
            <View style={[styles.settingIcon, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="person-add" size={20} color={colors.accent} />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>New Followers</Text>
              <Text style={styles.settingDesc}>When someone follows you</Text>
            </View>
          </View>
          <Switch
            value={settings.follows}
            onValueChange={(value) => handleToggle('follows', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
            disabled={!settings.pushNotifications}
          />
        </View>

        <View style={[styles.settingCard, !settings.pushNotifications && styles.settingDisabled]}>
          <View style={styles.settingInfo}>
            <View style={[styles.settingIcon, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="trending-up" size={20} color={colors.accent} />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Trending Updates</Text>
              <Text style={styles.settingDesc}>When your problem starts trending</Text>
            </View>
          </View>
          <Switch
            value={settings.trending}
            onValueChange={(value) => handleToggle('trending', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
            disabled={!settings.pushNotifications}
          />
        </View>

        <Text style={styles.footerText}>
          {settings.pushNotifications 
            ? 'Push notifications will be sent to your device when enabled.'
            : 'All push notifications are disabled. Enable the master toggle to receive alerts.'}
        </Text>
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
    marginLeft: 14,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  statusText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  settingDisabled: {
    opacity: 0.5,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  settingDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});
