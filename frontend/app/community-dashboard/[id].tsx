import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/src/theme/colors';
import { api } from '@/src/services/api';

const CORAL = '#E85D3A';

const PERIODS: { label: string; days: number }[] = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  try {
    const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return ''; }
};

export default function CommunityDashboard() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(90);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getCommunityDashboard(id!, days, 50, 0);
      setData(res);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load dashboard', [{ text: 'OK', onPress: () => router.back() }]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, days, router]);

  useEffect(() => { load(); }, [load]);

  const community = data?.community;
  const peakCount = (data?.frikts_by_date || []).reduce((m: number, r: any) => Math.max(m, r.count || 0), 0) || 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{community?.name || 'Dashboard'}</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={CORAL} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); load(); }} tintColor={CORAL} />}
        >
          {/* Period */}
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.days}
                style={[styles.periodBtn, days === p.days && styles.periodBtnActive]}
                onPress={() => setDays(p.days)}
                data-testid={`period-${p.label}`}
              >
                <Text style={[styles.periodText, days === p.days && styles.periodTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data?.total_frikts ?? 0}</Text>
              <Text style={styles.statLabel}>Frikts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data?.total_relates ?? 0}</Text>
              <Text style={styles.statLabel}>Relates</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{community?.member_count ?? 0}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
          </View>

          {/* Bar chart */}
          <Text style={styles.sectionTitle}>Frikts over time</Text>
          <View style={styles.chartCard}>
            {(data?.frikts_by_date || []).length === 0 ? (
              <Text style={styles.emptyText}>No frikts in this period.</Text>
            ) : (
              <View style={styles.bars}>
                {[...(data?.frikts_by_date || [])].reverse().map((row: any) => (
                  <View key={row.date} style={styles.barCol}>
                    <View style={[styles.bar, { height: Math.max(4, (row.count / peakCount) * 110) }]} />
                    <Text style={styles.barLabel}>{fmtDate(row.date)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Recent frikts */}
          <Text style={styles.sectionTitle}>Recent frikts</Text>
          {(data?.frikts || []).length === 0 ? (
            <Text style={styles.emptyText}>No recent frikts.</Text>
          ) : (
            (data?.frikts || []).map((f: any) => (
              <TouchableOpacity
                key={f.id}
                style={styles.friktRow}
                onPress={() => router.push(`/problem/${f.id}`)}
                activeOpacity={0.7}
                data-testid={`dashboard-frikt-${f.id}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.friktTitle} numberOfLines={2}>{f.title}</Text>
                  <Text style={styles.friktMeta}>
                    {fmtDate(f.created_at)} · {f.author_name || 'Anon'}
                    {f.source === 'web' ? ' · web' : ''}
                  </Text>
                </View>
                <View style={styles.friktStats}>
                  <View style={styles.friktStat}>
                    <Ionicons name="heart-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.friktStatText}>{f.relates_count ?? 0}</Text>
                  </View>
                  <View style={styles.friktStat}>
                    <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.friktStatText}>{f.comments_count ?? 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, color: colors.text, textAlign: 'center', fontFamily: fonts.semibold },
  scroll: { padding: 16, paddingBottom: 120 },

  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  periodBtnActive: { backgroundColor: CORAL, borderColor: CORAL },
  periodText: { fontSize: 13, color: colors.text },
  periodTextActive: { color: '#fff', fontFamily: fonts.semibold },

  statsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 22, color: colors.text, fontFamily: fonts.bold },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  sectionTitle: { fontSize: 15, color: colors.text, fontFamily: fonts.bold, marginTop: 20, marginBottom: 8 },
  chartCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, minHeight: 140 },
  barCol: { flex: 1, alignItems: 'center' },
  bar: { width: '100%', backgroundColor: CORAL, borderTopLeftRadius: 3, borderTopRightRadius: 3, minWidth: 4 },
  barLabel: { fontSize: 9, color: colors.textMuted, marginTop: 4 },

  friktRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  friktTitle: { fontSize: 14, color: colors.text, fontFamily: fonts.semibold },
  friktMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  friktStats: { alignItems: 'flex-end', gap: 4 },
  friktStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  friktStatText: { fontSize: 12, color: colors.textMuted },

  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
});
