import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CelebrationModal } from '../components/CelebrationModal';
import { api } from '../services/api';

interface Badge {
  badge_id: string;
  name: string;
  icon: string;
  description: string;
  unlocked_at?: string;
}

interface BadgeContextType {
  showCelebration: (badges: Badge[]) => void;
  trackVisit: () => Promise<Badge[]>;
  checkPendingBadges: () => Promise<Badge[]>;
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

export function BadgeProvider({ children }: { children: ReactNode }) {
  const [celebrationBadge, setCelebrationBadge] = useState<Badge | null>(null);
  const [additionalBadges, setAdditionalBadges] = useState<Badge[]>([]);
  const [showModal, setShowModal] = useState(false);

  const showCelebration = useCallback((badges: Badge[]) => {
    if (badges.length === 0) return;

    // Show the first (most significant) badge in the modal
    setCelebrationBadge(badges[0]);
    // Store additional badges for toast notification
    setAdditionalBadges(badges.slice(1));
    setShowModal(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setShowModal(false);
    setCelebrationBadge(null);
    setAdditionalBadges([]);
  }, []);

  const trackVisit = useCallback(async (): Promise<Badge[]> => {
    try {
      const response = await api.trackVisit();
      const newBadges = response.newly_awarded_badges || [];
      if (newBadges.length > 0) {
        showCelebration(newBadges);
      }
      return newBadges;
    } catch (error) {
      console.error('Failed to track visit:', error);
      return [];
    }
  }, [showCelebration]);

  const checkPendingBadges = useCallback(async (): Promise<Badge[]> => {
    // This is called on app open to check for pending badges from other users' actions
    try {
      const response = await api.trackVisit();
      const newBadges = response.newly_awarded_badges || [];
      if (newBadges.length > 0) {
        showCelebration(newBadges);
      }
      return newBadges;
    } catch (error) {
      console.error('Failed to check pending badges:', error);
      return [];
    }
  }, [showCelebration]);

  return (
    <BadgeContext.Provider value={{ showCelebration, trackVisit, checkPendingBadges }}>
      {children}
      <CelebrationModal
        visible={showModal}
        badge={celebrationBadge}
        additionalBadgesCount={additionalBadges.length}
        onDismiss={handleDismiss}
      />
    </BadgeContext.Provider>
  );
}

export function useBadges() {
  const context = useContext(BadgeContext);
  if (!context) {
    throw new Error('useBadges must be used within a BadgeProvider');
  }
  return context;
}

export default BadgeContext;
