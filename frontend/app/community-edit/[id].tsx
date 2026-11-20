import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import Toast from 'react-native-root-toast';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const CORAL = '#E85D3A';

type Visibility = 'public' | 'unlisted' | 'private';

const showToast = (msg: string, isError = false) => {
  Toast.show(msg, {
    duration: Toast.durations.SHORT,
    position: Toast.positions.BOTTOM,
    backgroundColor: isError ? colors.error : CORAL,
    textColor: '#fff',
    containerStyle: { borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 80 },
  });
};

// The server returns {detail: "..."} or, for validation errors, {detail: [{msg, ...}]}
const errorText = (err: any, fallback: string): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
};

// Same rules as the server: a-z, 0-9 and single hyphens, max 40 characters
const normalizeSlug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40).replace(/-+$/g, '');

export default function CommunityEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [community, setCommunity] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state (initialized once community is loaded)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<{ checking: boolean; available: boolean | null; reason?: string }>({ checking: false, available: null });
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [accessCode, setAccessCode] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef<any>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getCommunity(id!);
      setCommunity(data);
      setName(data.name || '');
      setDescription(data.description || '');
      setSlug(data.slug || '');
      setOriginalSlug(data.slug || '');
      setVisibility((data.visibility as Visibility) || 'public');
      setAccessCode(data.access_code || '');
      setOwnerEmail(data.owner_email || '');
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load community', [{ text: 'OK', onPress: () => router.back() }]);
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Check slug availability if slug changes
  useEffect(() => {
    const s = normalizeSlug(slug);
    if (!s || s.length < 3) { setSlugStatus({ checking: false, available: null }); return; }
    if (s === originalSlug) { setSlugStatus({ checking: false, available: true }); return; }
    setSlugStatus((cur) => ({ ...cur, checking: true }));
    const t = setTimeout(async () => {
      try {
        const res = await api.checkCommunitySlugAvailable(s);
        setSlugStatus({ checking: false, available: !!res.available, reason: res.reason });
      } catch {
        setSlugStatus({ checking: false, available: null });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [slug, originalSlug]);

  const publicUrl = community?.slug ? `https://frikt.com/${community.slug}` : '';

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    await Clipboard.setStringAsync(publicUrl);
    showToast('Link copied');
  };

  const handleShareLink = async () => {
    if (!publicUrl) return;
    try {
      await Share.share({ message: publicUrl, url: publicUrl });
    } catch {}
  };

  const handleShareQR = async () => {
    if (!qrRef.current || !publicUrl) return;
    qrRef.current.toDataURL(async (base64: string) => {
      try {
        const file = new File(Paths.cache, `frikt-qr-${community?.slug || 'community'}.png`);
        try { file.delete(); } catch {}
        file.create();
        file.write(base64, { encoding: 'base64' });
        const ok = await Sharing.isAvailableAsync();
        if (ok) {
          await Sharing.shareAsync(file.uri, { dialogTitle: 'Share QR', mimeType: 'image/png' });
        } else {
          showToast('Sharing not available', true);
        }
      } catch (e) {
        showToast('Could not share QR', true);
      }
    });
  };

  const handleSave = async () => {
    if (!community) return;
    const payload: any = {};
    if (name.trim() !== community.name) payload.name = name.trim();
    if ((description || '') !== (community.description || '')) payload.description = description.trim();
    const slugNorm = normalizeSlug(slug);
    if (slugNorm !== community.slug) {
      if (slugStatus.available !== true) {
        showToast(slugStatus.reason || 'Link not available', true);
        return;
      }
      payload.slug = slugNorm;
    }
    if (visibility !== community.visibility) payload.visibility = visibility;
    if ((accessCode || '') !== (community.access_code || '') && visibility === 'private' && accessCode.trim()) {
      payload.access_code = accessCode.trim();
    }
    if ((ownerEmail || '') !== (community.owner_email || '')) payload.owner_email = ownerEmail.trim();

    if (Object.keys(payload).length === 0) {
      showToast('Nothing to save');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await api.updateCommunity(community.id, payload);
      setCommunity(updated);
      setOriginalSlug(updated.slug);
      showToast('Saved ✓');
    } catch (err: any) {
      Alert.alert('Error', errorText(err, 'Failed to save'));
    } finally {
      setIsSaving(false);
    }
  };

  const renderVisibilityOption = (v: Visibility, title: string, desc: string) => {
    const active = visibility === v;
    return (
      <TouchableOpacity
        key={v}
        style={[styles.visOption, active && styles.visOptionActive]}
        onPress={() => setVisibility(v)}
        activeOpacity={0.7}
        data-testid={`visibility-${v}`}
      >
        <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
          {active ? <View style={styles.radioInner} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.visTitle, active && styles.visTitleActive]}>{title}</Text>
          <Text style={[styles.visDesc, active && { color: 'rgba(255,255,255,0.85)' }]}>{desc}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={CORAL} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Manage community</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Link + actions */}
          <View style={styles.linkCard}>
            <Text style={styles.linkLabel}>Public link</Text>
            <Text style={styles.linkValue} numberOfLines={1}>{publicUrl}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleCopyLink} data-testid="copy-link-btn">
                <Ionicons name="copy-outline" size={16} color={CORAL} />
                <Text style={styles.actionBtnText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleShareLink} data-testid="share-link-btn">
                <Ionicons name="share-outline" size={16} color={CORAL} />
                <Text style={styles.actionBtnText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setShowQR((s) => !s)} data-testid="toggle-qr-btn">
                <Ionicons name="qr-code-outline" size={16} color={CORAL} />
                <Text style={styles.actionBtnText}>QR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push(`/community-dashboard/${community.id}`)}
                data-testid="dashboard-btn"
              >
                <Ionicons name="stats-chart-outline" size={16} color={CORAL} />
                <Text style={styles.actionBtnText}>Dashboard</Text>
              </TouchableOpacity>
            </View>

            {showQR && (
              <View style={styles.qrWrap}>
                <QRCode value={publicUrl} size={180} backgroundColor="#fff" color="#111" getRef={(c: any) => (qrRef.current = c)} />
                <TouchableOpacity style={styles.qrShareBtn} onPress={handleShareQR} data-testid="share-qr-btn">
                  <Ionicons name="download-outline" size={16} color="#fff" />
                  <Text style={styles.qrShareBtnText}>Download / Share QR</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Edit form */}
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            maxLength={60}
            data-testid="name-input"
          />
          <Text style={styles.hint}>{name.length}/60</Text>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            maxLength={280}
            multiline
            data-testid="description-input"
          />
          <Text style={styles.hint}>{description.length}/280</Text>

          <Text style={styles.label}>Link</Text>
          <View style={styles.slugRow}>
            <Text style={styles.slugPrefix}>frikt.com/</Text>
            <TextInput
              style={styles.slugInput}
              value={slug}
              onChangeText={(t) => setSlug(normalizeSlug(t))}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={40}
              data-testid="slug-input"
            />
            {slugStatus.checking ? (
              <ActivityIndicator size="small" color={CORAL} />
            ) : slugStatus.available === true ? (
              <Ionicons name="checkmark-circle" size={20} color="#2E9F5F" />
            ) : slugStatus.available === false ? (
              <Ionicons name="close-circle" size={20} color={colors.error} />
            ) : null}
          </View>
          {slugStatus.available === false && slugStatus.reason ? (
            <Text style={[styles.hint, { color: colors.error }]}>{slugStatus.reason}</Text>
          ) : null}

          <Text style={styles.label}>Type</Text>
          {renderVisibilityOption('public', 'Public', 'Appears in Explore and search. Anyone can open it and post.')}
          {renderVisibilityOption('unlisted', 'Unlisted', 'Does not appear anywhere. Anyone with the link can open it.')}
          {renderVisibilityOption('private', 'Private', 'Hidden. Needs an access code to open it.')}

          {visibility === 'private' && (
            <>
              <Text style={styles.label}>Access code</Text>
              <TextInput
                style={styles.input}
                value={accessCode}
                onChangeText={(t) => setAccessCode(t.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={32}
                placeholder="A–Z, 0–9, _"
                placeholderTextColor={colors.textMuted}
                data-testid="access-code-input"
              />
              <Text style={styles.hint}>Share this with people you want to let in.</Text>
            </>
          )}

          <Text style={styles.label}>Contact email</Text>
          <TextInput
            style={styles.input}
            value={ownerEmail}
            onChangeText={setOwnerEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            data-testid="owner-email-input"
          />

          <TouchableOpacity
            style={[styles.submitBtn, isSaving && styles.submitBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            data-testid="save-btn"
          >
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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

  linkCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  linkLabel: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.semibold, letterSpacing: 0.4 },
  linkValue: { fontSize: 15, color: colors.text, marginTop: 4, fontFamily: fonts.semibold },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: CORAL, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12,
  },
  actionBtnText: { color: CORAL, fontSize: 13, fontFamily: fonts.semibold },
  qrWrap: { alignItems: 'center', marginTop: 16, gap: 10, padding: 10, backgroundColor: '#FFF', borderRadius: radius.md },
  qrShareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CORAL, paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.md },
  qrShareBtnText: { color: '#fff', fontSize: 13, fontFamily: fonts.semibold },

  label: { fontSize: 13, color: colors.text, fontFamily: fonts.semibold, marginTop: 14, marginBottom: 6 },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text,
  },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  slugRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  slugPrefix: { fontSize: 14, color: colors.textMuted },
  slugInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 2 },
  visOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface,
  },
  visOptionActive: { backgroundColor: CORAL, borderColor: CORAL },
  visTitle: { fontSize: 15, color: colors.text, fontFamily: fonts.semibold },
  visTitleActive: { color: '#fff' },
  visDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderColor: '#fff' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  submitBtn: { marginTop: 22, backgroundColor: CORAL, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: colors.disabledBg },
  submitBtnText: { color: '#fff', fontSize: 15, fontFamily: fonts.bold },
});
