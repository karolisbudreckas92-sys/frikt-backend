import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { fonts } from '@/src/theme/colors';

const { width: screenWidth } = Dimensions.get('window');

// Conditional import for confetti (native only)
let ConfettiCannon: any = null;
if (Platform.OS !== 'web') {
  try {
    ConfettiCannon = require('react-native-confetti-cannon').default;
  } catch (e) {
    // Confetti not available
  }
}

const colors = {
  background: '#F6F3EE',
  cardBg: '#FFFFFF',
  primary: '#E85D3A',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  gold: '#FFD700',
};

interface Badge {
  badge_id: string;
  name: string;
  icon: string;
  description: string;
  unlocked_at?: string;
}

interface CelebrationModalProps {
  visible: boolean;
  badge: Badge | null;
  additionalBadgesCount?: number;
  onDismiss: () => void;
  onViewAllBadges?: () => void;
}

export function CelebrationModal({ 
  visible, 
  badge, 
  additionalBadgesCount = 0, 
  onDismiss,
  onViewAllBadges 
}: CelebrationModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (visible && badge) {
      // Entrance animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();

      // Fire confetti on native (short burst)
      if (ConfettiCannon && confettiRef.current) {
        setTimeout(() => {
          confettiRef.current?.start();
        }, 200);
      }
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, badge]);

  if (!badge) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {/* Confetti (native only) */}
        {Platform.OS !== 'web' && ConfettiCannon && (
          <ConfettiCannon
            ref={confettiRef}
            count={60}
            origin={{ x: screenWidth / 2, y: 0 }}
            explosionSpeed={400}
            fallSpeed={2500}
            fadeOut
            autoStart={false}
            colors={[colors.gold, colors.primary, '#FF6B6B', '#4ECDC4', '#45B7D1']}
          />
        )}

        <Animated.View 
          style={[
            styles.modalContent,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          {/* Badge icon */}
          <View style={styles.badgeIconContainer}>
            <View style={styles.badgeGlow} />
            <View style={styles.badgeIcon}>
              <Text style={styles.badgeEmoji}>{badge.icon}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.congratsText}>Badge Unlocked!</Text>
          <Text style={styles.badgeName}>{badge.name}</Text>

          {/* Description */}
          <Text style={styles.description}>{badge.description}</Text>

          {/* Additional badges notification */}
          {additionalBadgesCount > 0 && (
            <View style={styles.additionalBadges}>
              <Text style={styles.additionalBadgesText}>
                +{additionalBadgesCount} more badge{additionalBadgesCount > 1 ? 's' : ''} to view
              </Text>
            </View>
          )}

          {/* Dismiss button */}
          <TouchableOpacity 
            style={styles.dismissButton}
            onPress={onDismiss}
            data-testid="celebration-dismiss-btn"
          >
            <Text style={styles.dismissText}>
              {additionalBadgesCount > 0 ? 'Next' : 'Nice!'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.3,
      shadowRadius: 30,
      elevation: 20,
    }),
  },
  badgeIconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  badgeGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: colors.gold,
    borderRadius: 70,
    opacity: 0.3,
  },
  badgeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.gold + '30',
    borderWidth: 3,
    borderColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 52,
  },
  congratsText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  additionalBadges: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  additionalBadgesText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
  dismissButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 28,
    minWidth: 140,
    alignItems: 'center',
  },
  dismissText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: fonts.bold,
  },
});

export default CelebrationModal;
