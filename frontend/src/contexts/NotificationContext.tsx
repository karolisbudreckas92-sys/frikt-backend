import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface NotificationContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  markAllAsRead: () => Promise<void>;
  refreshCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  const refreshCount = useCallback(async () => {
    if (!userRef.current) {
      setUnreadCount(0);
      return;
    }
    try {
      const data = await api.getNotifications();
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('[NotificationContext] Error refreshing count:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    // Optimistically set count to 0
    setUnreadCount(0);

    try {
      await api.markNotificationsRead();
    } catch (error) {
      console.error('[NotificationContext] Error marking as read:', error);
      // Refresh count on error to get accurate state
      await refreshCount();
    }
  }, [refreshCount]);

  // Refresh count on login / when user changes
  useEffect(() => {
    if (user) {
      refreshCount();
    } else {
      setUnreadCount(0);
    }
  }, [user, refreshCount]);

  // Refresh count when app comes to foreground (catches pushes that arrived while
  // the app was in background or killed).
  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    const handler = (state: AppStateStatus) => {
      if (state === 'active') {
        refreshCount();
      }
    };
    try {
      sub = AppState.addEventListener('change', handler);
    } catch (e) {
      console.warn('[NotificationContext] AppState listener failed:', e);
    }
    return () => {
      try { sub?.remove?.(); } catch (e) { /* noop */ }
    };
  }, [refreshCount]);

  // Refresh count when a push notification arrives while the app is in foreground.
  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    try {
      sub = Notifications.addNotificationReceivedListener(() => {
        refreshCount();
      });
    } catch (e) {
      console.warn('[NotificationContext] addNotificationReceivedListener failed:', e);
    }
    return () => {
      try { sub?.remove?.(); } catch (e) { /* noop */ }
    };
  }, [refreshCount]);

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      setUnreadCount,
      markAllAsRead,
      refreshCount
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
