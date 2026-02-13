import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { usePushNotifications } from '@/src/services/notifications';
import * as Notifications from 'expo-notifications';
import { RootSiblingParent } from 'react-native-root-siblings';
import { Alert } from 'react-native';

// Debug: Show backend URL on first launch
const BACKEND_URL = 'https://frikt-backend-production.up.railway.app';
let hasShownDebug = false;

function RootLayoutNav() {
  const router = useRouter();
  const { user } = useAuth();
  const { notification } = usePushNotifications();

  // Debug alert - show once to verify URL
  useEffect(() => {
    if (!hasShownDebug) {
      hasShownDebug = true;
      // Uncomment below line to see debug alert:
      // Alert.alert('Debug', `Backend URL: ${BACKEND_URL}`);
      console.log('[APP] Backend URL:', BACKEND_URL);
    }
  }, []);

  // Handle notification tap navigation
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.problemId && user) {
        router.push(`/problem/${data.problemId}`);
      }
    });

    return () => subscription.remove();
  }, [user]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="problem/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
        <Stack.Screen name="notification-settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="saved" options={{ presentation: 'card' }} />
        <Stack.Screen name="my-posts" options={{ presentation: 'card' }} />
        <Stack.Screen name="category/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="edit-profile" options={{ presentation: 'card' }} />
        <Stack.Screen name="edit-problem" options={{ presentation: 'card' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <RootSiblingParent>
      <SafeAreaProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </SafeAreaProvider>
    </RootSiblingParent>
  );
}
