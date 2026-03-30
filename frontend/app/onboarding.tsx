import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const CORAL = '#E85D3A';
const BG = '#FAF8F3';
const DARK = '#333333';
const MUTED = '#999999';

const slides = [
  {
    icon: 'megaphone-outline' as const,
    title: "What's bothering you today?",
    body: 'Frikt is where everyday frustrations get heard. Post yours in one sentence. Others tap Relate if they feel the same.',
  },
  {
    icon: 'trending-up-outline' as const,
    title: "What rises can't be ignored",
    body: 'The more people relate, the higher it goes. No algorithm. Just real problems ranked by real people.',
  },
  {
    icon: 'location-outline' as const,
    title: 'Go local',
    body: "Got an invite code? Join your community and share frustrations that matter to your neighborhood. No code yet? Start with the global feed.",
  },
  {
    icon: 'flash-outline' as const,
    title: "You're ready",
    body: 'Share what frustrates you. See what frustrates others. Together, patterns become impossible to ignore.',
    isLast: true,
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/(tabs)/home');
  };

  const goNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const renderSlide = ({ item, index }: { item: typeof slides[0]; index: number }) => (
    <View style={styles.slide}>
      <View style={styles.iconContainer}>
        {item.isLast ? (
          <Text style={styles.logo}>frikt</Text>
        ) : (
          <Ionicons name={item.icon} size={64} color={CORAL} />
        )}
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
      {item.isLast ? (
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={completeOnboarding}
          activeOpacity={0.8}
          data-testid="onboarding-get-started-btn"
        >
          <Text style={styles.ctaText}>Get Started</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.nextButton}
          onPress={goNext}
          activeOpacity={0.8}
          data-testid={`onboarding-next-btn-${index}`}
        >
          <Text style={styles.nextText}>Next</Text>
          <Ionicons name="arrow-forward" size={18} color={CORAL} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={completeOnboarding}
          activeOpacity={0.7}
          data-testid="onboarding-skip-btn"
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 15,
    color: MUTED,
    fontWeight: '500',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: CORAL,
    letterSpacing: -1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: DARK,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 32,
  },
  body: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  nextText: {
    fontSize: 17,
    fontWeight: '600',
    color: CORAL,
  },
  ctaButton: {
    backgroundColor: CORAL,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: CORAL,
    width: 24,
  },
  dotInactive: {
    backgroundColor: '#D9D9D9',
  },
});
