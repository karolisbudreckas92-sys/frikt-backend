import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, fonts} from '@/src/theme/colors';
import PostWizard from '@/src/components/PostWizard';
import Toast from 'react-native-root-toast';
import { useBadges } from '@/src/contexts/BadgeContext';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';

export default function PostTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ community_id?: string; community_name?: string }>();
  const { showCelebration } = useBadges();
  const [focusKey, setFocusKey] = useState(0);

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

    // Forget the community this post was started from (tab params persist otherwise)
    router.setParams({ community_id: undefined, community_name: undefined });
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
    router.setParams({ community_id: undefined, community_name: undefined });
    router.back();
  };

  return (
    <ErrorBoundary screenName="CreateFrikt">
    <View style={styles.container}>
      <PostWizard
        key={focusKey}
        initialCommunityId={params.community_id}
        initialCommunityName={params.community_name}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
