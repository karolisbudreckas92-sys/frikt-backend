import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/src/theme/colors';
import { api } from '@/src/services/api';

const CORAL = '#E85D3A';

export default function MyCommunities() {
  const router = useRouter();
  const [communities, setCommunities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getCommunitiesOwned();
      setCommunities(Array.isArray(data) ? data : []);
    } catch (e) {
      setCommunities([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visibilityLabel = (v: string) => {
    if (v === 'public') return 'Public';
    if (v === 'unlisted') return 'Unlisted';
    return 'Private';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} data-testid="back-btn">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My communities</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); load(); }} tintColor={CORAL} />
        }
      >
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/community-create')}
          data-testid="create-community-btn"
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.createBtnText}>Create community</Text>
        </TouchableOpacity>

        {isLoading ? (
          <ActivityIndicator color={CORAL} style={{ marginTop: 24 }} />
        ) : communities.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No communities yet</Text>
            <Text style={styles.emptyText}>Create one to invite your people. You can make up to 10.</Text>
          </View>
        ) : (
          communities.map((c: any) => (
            <TouchableOpacity
              key={c.id}
              style={styles.row}
              onPress={() => router.push(`/community-edit/${c.id}`)}
              activeOpacity={0.7}
              data-testid={`owned-community-${c.id}`}
            >
              {c.avatar_url ? (
                <Image source={{ uri: c.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="people" size={20} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{c.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  frikt.com/{c.slug} · {visibilityLabel(c.visibility)}
                </Text>
                <Text style={styles.meta}>
                  {c.member_count} members · {c.frikt_count} frikts
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, color: colors.text, textAlign: 'center', fontFamily: fonts.semibold },
  scroll: { padding: 16, paddingBottom: 100 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: CORAL, paddingVertical: 14, borderRadius: radius.md, marginBottom: 12,
  },
  createBtnText: { color: '#fff', fontSize: 15, fontFamily: fonts.bold },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, color: colors.text, marginTop: 12, fontFamily: fonts.semibold },
  emptyText: { fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  info: { flex: 1 },
  name: { fontSize: 15, color: colors.text, fontFamily: fonts.semibold },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
