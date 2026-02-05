import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/src/theme/colors';
import PostWizard from '@/src/components/PostWizard';
import Toast from 'react-native-root-toast';

export default function PostTab() {
  const router = useRouter();

  const handleComplete = (problemId?: string) => {
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

    // Navigate to the problem detail or home
    if (problemId) {
      router.replace(`/problem/${problemId}`);
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <PostWizard onComplete={handleComplete} onCancel={handleCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
