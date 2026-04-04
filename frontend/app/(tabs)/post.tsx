import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts} from '@/src/theme/colors';
import PostWizard from '@/src/components/PostWizard';
import Toast from 'react-native-root-toast';
import { useBadges } from '@/src/contexts/BadgeContext';
import { useFocusEffect } from '@react-navigation/native';

export default function PostTab() {
  const router = useRouter();
  const { showCelebration } = useBadges();
  const [focusKey, setFocusKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocusKey(k => k + 1);
    }, [])
  );

  const handleComplete = (problemId?: string, newlyAwardedBadges?: any[]) => {
    // Show success toast
    Toast.show('Frikt posted ✅', {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
      shadow: true,
      animation: true,
      hideOnPress: true,
      backgroundColor: colors.accent,
      textColor: colors.white,
      containerStyle: {
        borderRadius: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginBottom: 80,
      },
    });

    // Navigate to home first
    router.replace('/(tabs)/home');
    
    // Show celebration if badges were awarded (after navigation)
    if (newlyAwardedBadges && newlyAwardedBadges.length > 0) {
      setTimeout(() => {
        showCelebration(newlyAwardedBadges);
      }, 500);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <PostWizard key={focusKey} onComplete={handleComplete} onCancel={handleCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
