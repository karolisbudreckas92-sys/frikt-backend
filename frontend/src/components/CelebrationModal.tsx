import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform, Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { fonts } from '@/src/theme/colors';
import { useAuth } from '@/src/context/AuthContext';

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
  shareBg: '#0A0A0A',
  shareText: '#FFFFFF',
  shareTagline: '#9A9A9A',
};

// Off-screen render size for the share image (square)
const SHARE_IMAGE_SIZE = 1080;

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
  onViewAllBadges,
}: CelebrationModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);
  const shareCardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const { user } = useAuth();
  const usernameHandle = user ? `@${(user.displayName || user.name || '').trim()}` : '';

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

  const handleShare = async () => {
    if (!badge || isSharing) return;
    setIsSharing(true);

    try {
      if (Platform.OS === 'web') {
        Alert.alert('Sharing', 'Image sharing is available on mobile.');
        return;
      }

      // Capture the off-screen share card
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
        width: SHARE_IMAGE_SIZE,
        height: SHARE_IMAGE_SIZE,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Cannot open share sheet on this device.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `I just unlocked ${badge.name} on FRIKT`,
        UTI: 'public.png',
      });
    } catch (err) {
      console.warn('Badge share failed', err);
      Alert.alert('Could not share', 'Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

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
            { transform: [{ scale: scaleAnim }] },
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

          {/* Dismiss button (primary) */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            data-testid="celebration-dismiss-btn"
          >
            <Text style={styles.dismissText}>
              {additionalBadgesCount > 0 ? 'Next' : 'Nice!'}
            </Text>
          </TouchableOpacity>

          {/* Share button (secondary) */}
          <TouchableOpacity
            style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
            onPress={handleShare}
            disabled={isSharing}
            data-testid="celebration-share-btn"
          >
            <Text style={styles.shareButtonText}>
              {isSharing ? 'Preparing…' : 'Share my badge'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Off-screen share card — rendered but positioned absolute outside viewport */}
        <View
          ref={shareCardRef}
          collapsable={false}
          style={styles.shareCard}
        >
          <View style={styles.shareIconWrap}>
            <View style={styles.shareIconGlow} />
            <View style={styles.shareIconCircle}>
              <Text style={styles.shareIconEmoji}>{badge.icon}</Text>
            </View>
          </View>
          <Text style={styles.shareName}>{badge.name}</Text>
          <Text style={styles.shareTagline} numberOfLines={3}>
            {badge.description}
          </Text>
          {!!usernameHandle && usernameHandle !== '@' && (
            <Text style={styles.shareUsername} numberOfLines={1}>
              {usernameHandle}
            </Text>
          )}
          <Text style={styles.shareFooter}>frikt.com</Text>
        </View>
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
  shareButton: {
    marginTop: 12,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 24,
    minWidth: 140,
    alignItems: 'center',
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontFamily: fonts.semibold,
  },
  // Off-screen share card (1080x1080 PNG export target)
  shareCard: {
    position: 'absolute',
    top: -10000,
    left: -10000,
    width: SHARE_IMAGE_SIZE,
    height: SHARE_IMAGE_SIZE,
    backgroundColor: colors.shareBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 80,
    paddingTop: 100,
    paddingBottom: 100,
  },
  shareIconWrap: {
    position: 'relative',
    marginBottom: 60,
  },
  shareIconGlow: {
    position: 'absolute',
    top: -40,
    left: -40,
    right: -40,
    bottom: -40,
    backgroundColor: colors.gold,
    borderRadius: 240,
    opacity: 0.18,
  },
  shareIconCircle: {
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
    borderWidth: 8,
    borderColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIconEmoji: {
    fontSize: 220,
  },
  shareName: {
    color: colors.shareText,
    fontSize: 88,
    fontFamily: fonts.bold,
    textAlign: 'center',
    marginBottom: 28,
  },
  shareTagline: {
    color: colors.shareTagline,
    fontSize: 36,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 50,
    maxWidth: 880,
    marginBottom: 32,
  },
  shareUsername: {
    color: colors.shareText,
    fontSize: 28,
    fontFamily: fonts.semibold,
    textAlign: 'center',
    opacity: 0.85,
    marginBottom: 60,
  },
  shareFooter: {
    color: colors.primary,
    fontSize: 32,
    fontFamily: fonts.semibold,
    letterSpacing: 3,
    position: 'absolute',
    bottom: 80,
  },
});

export default CelebrationModal;
