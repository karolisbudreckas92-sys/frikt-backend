import React, { useEffect, useRef, useState } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_TOKEN_REGISTRATION_KEY = 'push_token_last_registered';
const TOKEN_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const tokenListener = useRef<any>();

  useEffect(() => {
    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Notification received in foreground
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // User tapped on notification
    });

    // Listen for token rotation
    tokenListener.current = Notifications.addPushTokenListener(async (tokenData) => {
      const newToken = tokenData.data;
      if (newToken) {
        setExpoPushToken(newToken);
        try {
          await api.registerPushToken(newToken);
          await AsyncStorage.setItem(LAST_TOKEN_REGISTRATION_KEY, Date.now().toString());
        } catch (e) {
          console.error('Failed to re-register rotated push token:', e);
        }
      }
    });

    // Re-register token on app foreground if stale (>7 days)
    const appStateListener = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      if (tokenListener.current) {
        tokenListener.current.remove();
      }
      appStateListener.remove();
    };
  }, []);

  const handleAppStateChange = async (state: AppStateStatus) => {
    if (state === 'active') {
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
      
      await api.registerPushToken(token);
      await AsyncStorage.setItem(LAST_TOKEN_REGISTRATION_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  }

  return { expoPushToken };
}

// Helper function to clear notification badge
export async function clearNotificationBadge() {
  const { setBadgeCount } = await import('expo-notifications');
  await Notifications.dismissAllNotificationsAsync();
  await setBadgeCount(0);
}
