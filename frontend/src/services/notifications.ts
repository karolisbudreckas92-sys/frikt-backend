import { useEffect, useRef, useState } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const LAST_TOKEN_REGISTRATION_KEY = 'last_push_token_registration';
const TOKEN_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // SDK 53+ keys (kept alongside legacy ones for compatibility)
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Force-set the iOS app icon badge to a specific value.
 * Uses the canonical `setBadgeCountAsync` (the legacy `setBadgeCount` named
 * export does not exist in expo-notifications 0.32+).
 */
async function setBadgeCountSafe(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch (e) {
    console.warn('[badge] setBadgeCountAsync failed:', e);
  }
}

/**
 * Sync iOS app icon badge with the server's authoritative unread count.
 * Called on login, on app foreground, and after marking notifications as read.
 */
export async function syncBadgeWithUnreadCount(): Promise<number> {
  try {
    const data = await api.getNotifications();
    const count = data?.unread_count ?? 0;
    await setBadgeCountSafe(count);
    return count;
  } catch (e) {
    console.warn('[badge] syncBadgeWithUnreadCount failed:', e);
    return -1;
  }
}

/**
 * Clear the iOS app icon badge AND dismiss any banners in Notification Center.
 * Always sets the badge to 0 explicitly.
 */
export async function clearNotificationBadge(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (e) {
    console.warn('[badge] dismissAllNotificationsAsync failed:', e);
  }
  await setBadgeCountSafe(0);
}

export function usePushNotifications(enabled: boolean = true) {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const tokenListener = useRef<any>();

  useEffect(() => {
    if (!enabled) return;
    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(n => {
      setNotification(n);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(_response => {
      // User tapped on notification — handled in _layout
    });

    // Listen for token rotation
    tokenListener.current = Notifications.addPushTokenListener(async (tokenData) => {
      const newToken = tokenData.data;
      if (newToken) {
        setExpoPushToken(newToken);
        try {
          await api.registerPushToken(newToken, Platform.OS);
          await AsyncStorage.setItem(LAST_TOKEN_REGISTRATION_KEY, Date.now().toString());
        } catch (e) {
          console.error('Failed to re-register rotated push token:', e);
        }
      }
    });

    // Re-register token on app foreground if stale (>7 days) + always sync badge
    let appStateListener: any;
    try {
      appStateListener = AppState.addEventListener('change', handleAppStateChange);
    } catch (e) {
      console.warn('[notifications] AppState.addEventListener failed:', e);
    }

    return () => {
      // Cleanup must be bulletproof: a crash here on logout will hard-crash the app.
      try {
        notificationListener.current?.remove?.();
      } catch (e) {
        console.warn('[notifications] cleanup notificationListener failed:', e);
      }
      try {
        responseListener.current?.remove?.();
      } catch (e) {
        console.warn('[notifications] cleanup responseListener failed:', e);
      }
      try {
        tokenListener.current?.remove?.();
      } catch (e) {
        console.warn('[notifications] cleanup tokenListener failed:', e);
      }
      try {
        appStateListener?.remove?.();
      } catch (e) {
        console.warn('[notifications] cleanup appStateListener failed:', e);
      }
      notificationListener.current = undefined;
      responseListener.current = undefined;
      tokenListener.current = undefined;
    };
  }, [enabled]);

  const handleAppStateChange = async (state: AppStateStatus) => {
    if (state === 'active') {
      // Always sync badge when app becomes active — if server says 0, clear
      const serverCount = await syncBadgeWithUnreadCount();
      if (serverCount === 0) {
        await setBadgeCountSafe(0);
      }
      // Token freshness check
      const lastRegistered = await AsyncStorage.getItem(LAST_TOKEN_REGISTRATION_KEY);
      const now = Date.now();
      if (!lastRegistered || (now - parseInt(lastRegistered)) > TOKEN_REFRESH_INTERVAL_MS) {
        await registerForPushNotifications();
      }
    }
  };

  async function registerForPushNotifications() {
    if (!Device.isDevice) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      const token = tokenData.data;
      setExpoPushToken(token);

      await api.registerPushToken(token, Platform.OS);
      await AsyncStorage.setItem(LAST_TOKEN_REGISTRATION_KEY, Date.now().toString());

      // After registering token, sync badge with server (catches stale badges after fresh login)
      await syncBadgeWithUnreadCount();
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  }

  return { expoPushToken, notification };
}
