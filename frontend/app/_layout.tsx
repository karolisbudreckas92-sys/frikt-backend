import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { usePushNotifications } from '@/src/services/notifications';
import * as Notifications from 'expo-notifications';
import { RootSiblingParent } from 'react-native-root-siblings';
import { BadgeProvider } from '@/src/contexts/BadgeContext';
import { NotificationProvider } from '@/src/contexts/NotificationContext';
import { useFonts } from 'expo-font';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Alert, Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

// Initialize Sentry BEFORE anything else
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0.2,
  enableNative: true,
  enabled: !__DEV__, // Only send in production builds
});

// Catch native crashes globally and show them
if ((global as any).ErrorUtils) {
  const defaultHandler = (global as any).ErrorUtils.getGlobalHandler();
  (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
    console.error('[NATIVE CRASH]', isFatal ? 'FATAL' : 'NON-FATAL', error?.message || error);
    if (isFatal && Platform.OS !== 'web') {
      Alert.alert(
        'App Error (Debug)',
        `${error?.message || error}\n\nStack: ${error?.stack?.substring(0, 500) || 'none'}`,
        [{ text: 'OK' }]
      );
    }
    defaultHandler(error, isFatal);
  });
}

SplashScreen.preventAutoHideAsync().catch(() => {});

// Debug: Show backend URL on first launch
const BACKEND_URL = 'https://frikt-backend-production.up.railway.app';
let hasShownDebug = false;

function RootLayoutNav() {
  const router = useRouter();
  const { user } = useAuth();
  const { notification } = usePushNotifications(!!user);

  useEffect(() => {
    if (!hasShownDebug) {
      hasShownDebug = true;
      console.log('[APP] Backend URL:', BACKEND_URL);
    }
  }, []);

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
        <Stack.Screen name="onboarding" options={{ presentation: 'card', gestureEnabled: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'PlusJakartaSans_400Regular': require('../assets/fonts/PlusJakartaSans_400Regular.ttf'),
    'PlusJakartaSans_500Medium': require('../assets/fonts/PlusJakartaSans_500Medium.ttf'),
    'PlusJakartaSans_600SemiBold': require('../assets/fonts/PlusJakartaSans_600SemiBold.ttf'),
    'PlusJakartaSans_700Bold': require('../assets/fonts/PlusJakartaSans_700Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Log font status for debugging
      const loadedList = Font.getLoadedFonts();
      console.log('[FONTS] Loaded:', fontsLoaded, 'Error:', fontError);
      console.log('[FONTS] Available fonts:', loadedList.filter(f => f.includes('Jakarta')));
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <RootSiblingParent>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <BadgeProvider>
              <RootLayoutNav />
            </BadgeProvider>
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </RootSiblingParent>
  );
}
