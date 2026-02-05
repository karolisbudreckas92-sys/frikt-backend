import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import PostWizard from '../../src/components/PostWizard';

export default function PostTab() {
  const router = useRouter();

  const handleComplete = () => {
    router.replace('/(tabs)/home');
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
