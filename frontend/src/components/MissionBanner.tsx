import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows, radius, fonts} from '../theme/colors';
import { api } from '../services/api';

interface MissionBannerProps {
  onDismiss: () => void;
}

export default function MissionBanner({ onDismiss }: MissionBannerProps) {
  const router = useRouter();
  const [mission, setMission] = useState<any>(null);

  useEffect(() => {
    loadMission();
  }, []);

  const loadMission = async () => {
    try {
      const data = await api.getMission();
      setMission(data);
    } catch (error) {
      console.error('Error loading mission:', error);
    }
  };

  if (!mission) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </TouchableOpacity>
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="sunny" size={24} color={colors.accent} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>Today's theme: {mission.theme}</Text>
          <Text style={styles.prompt}>{mission.prompt}</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/(tabs)/post')}
      >
        <Text style={styles.buttonText}>Post in this theme</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.subtle,
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.softGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 20,
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  prompt: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.text,
    lineHeight: 21,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.white,
  },
  buttonHint: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.7,
  },
});
