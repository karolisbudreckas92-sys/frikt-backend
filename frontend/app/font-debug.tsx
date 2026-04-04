import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Font from 'expo-font';

const FONT_NAMES = [
  'PlusJakartaSans_400Regular',
  'PlusJakartaSans_500Medium',
  'PlusJakartaSans_600SemiBold',
  'PlusJakartaSans_700Bold',
];

export default function FontDebug() {
  const router = useRouter();
  const [loadedFonts, setLoadedFonts] = useState<string[]>([]);
  const [allFonts, setAllFonts] = useState<string[]>([]);

  useEffect(() => {
    // Check which of our fonts are loaded
    const loaded = FONT_NAMES.filter(name => Font.isLoaded(name));
    setLoadedFonts(loaded);

    // Get ALL loaded fonts
    try {
      const all = Font.getLoadedFonts();
      setAllFonts(all);
    } catch (e) {
      setAllFonts(['Error: ' + String(e)]);
    }
  }, []);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={s.backText}>Back</Text>
      </TouchableOpacity>
      
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>FONT DIAGNOSTICS</Text>
        <Text style={s.info}>Platform: {Platform.OS} | Version: {Platform.Version}</Text>
        <Text style={s.info}>Hermes: {typeof HermesInternal !== 'undefined' ? 'YES' : 'NO'}</Text>
        <Text style={s.info}>DEV: {__DEV__ ? 'YES' : 'NO'}</Text>

        <Text style={s.section}>Our Fonts Status:</Text>
        {FONT_NAMES.map(name => {
          const isLoaded = loadedFonts.includes(name);
          return (
            <View key={name} style={s.fontRow}>
              <Text style={[s.status, { color: isLoaded ? '#22c55e' : '#ef4444' }]}>
                {isLoaded ? 'LOADED' : 'MISSING'}
              </Text>
              <Text style={s.fontName}>{name}</Text>
            </View>
          );
        })}

        <Text style={s.section}>Font Render Test:</Text>
        {FONT_NAMES.map(name => {
          const isLoaded = loadedFonts.includes(name);
          return (
            <Text 
              key={name} 
              style={[s.sample, isLoaded ? { fontFamily: name } : {}]}
            >
              {name}: The quick brown fox jumps
            </Text>
          );
        })}

        <Text style={s.section}>All Loaded Fonts ({allFonts.length}):</Text>
        {allFonts.map((f, i) => (
          <Text key={i} style={s.fontName}>{f}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  back: { padding: 16 },
  backText: { color: '#e94560', fontSize: 16, fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  info: { fontSize: 13, color: '#aaa', marginBottom: 4 },
  section: { fontSize: 16, fontWeight: '700', color: '#e94560', marginTop: 24, marginBottom: 12 },
  fontRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  status: { fontSize: 12, fontWeight: '700', width: 70 },
  fontName: { fontSize: 13, color: '#ccc' },
  sample: { fontSize: 15, color: '#fff', marginBottom: 8, lineHeight: 22 },
});
