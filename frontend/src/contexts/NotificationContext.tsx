import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { api } from '../services/api';

interface NotificationContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  markAllAsRead: () => Promise<void>;
  refreshCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshCount = useCallback(async () => {
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
