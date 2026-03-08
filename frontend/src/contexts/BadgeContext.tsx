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
  const [badgeQueue, setBadgeQueue] = useState<Badge[]>([]);
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);
  const [showModal, setShowModal] = useState(false);

  const showCelebration = useCallback((badges: Badge[]) => {
    if (badges.length === 0) return;

    // If no modal is showing, show the first badge immediately
    if (!showModal && !currentBadge) {
      setCurrentBadge(badges[0]);
      setBadgeQueue(badges.slice(1));
      setShowModal(true);
    } else {
      // Add all badges to the queue
      setBadgeQueue(prev => [...prev, ...badges]);
    }
  }, [showModal, currentBadge]);

  const handleDismiss = useCallback(() => {
    // Check if there are more badges in the queue
    if (badgeQueue.length > 0) {
      // Show the next badge
      const [nextBadge, ...remainingBadges] = badgeQueue;
      setCurrentBadge(nextBadge);
      setBadgeQueue(remainingBadges);
      // Keep modal visible, just update content
    } else {
      // No more badges, close the modal
      setShowModal(false);
      setCurrentBadge(null);
    }
  }, [badgeQueue]);

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

  // Calculate remaining badges count for display
  const remainingCount = badgeQueue.length;

  return (
    <BadgeContext.Provider value={{ showCelebration, trackVisit, checkPendingBadges }}>
      {children}
      <CelebrationModal
        visible={showModal}
        badge={currentBadge}
        additionalBadgesCount={remainingCount}
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
