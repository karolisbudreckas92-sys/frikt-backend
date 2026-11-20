import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import Toast from 'react-native-root-toast';

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

export default function CommunityCreate() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<{ checking: boolean; available: boolean | null; reason?: string }>({ checking: false, available: null });
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [accessCode, setAccessCode] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-derive slug from name until user edits slug
  useEffect(() => {
    if (!slugTouched) setSlug(normalizeSlug(name));
  }, [name, slugTouched]);

  // Debounced slug availability check
  useEffect(() => {
    const s = normalizeSlug(slug);
    if (!s || s.length < 3) {
      setSlugStatus({ checking: false, available: null });
      return;
    }
    setSlugStatus((cur) => ({ ...cur, checking: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await api.checkCommunitySlugAvailable(s);
        setSlugStatus({ checking: false, available: !!res.available, reason: res.reason });
      } catch (e) {
        setSlugStatus({ checking: false, available: null });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug]);

  const canSubmit =
    name.trim().length >= 3 &&
    name.trim().length <= 60 &&
    slug.length >= 3 &&
    slugStatus.available === true &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        slug: normalizeSlug(slug),
        visibility,
      };
      if (visibility === 'private' && accessCode.trim()) {
        payload.access_code = accessCode.trim();
      }
      if (ownerEmail.trim()) payload.owner_email = ownerEmail.trim();

      const result = await api.createCommunityV2(payload);
      showToast('Community created ✓');
      router.replace(`/community-edit/${result.id}`);
    } catch (err: any) {
      Alert.alert('Error', errorText(err, 'Failed to create community'));
    } finally {
      setIsSubmitting(false);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create community</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Migrants Australia"
            placeholderTextColor={colors.textMuted}
            maxLength={60}
            data-testid="name-input"
          />
          <Text style={styles.hint}>{name.length}/60 · 3–60 characters</Text>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this community about? (optional)"
            placeholderTextColor={colors.textMuted}
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
              onChangeText={(t) => { setSlug(normalizeSlug(t)); setSlugTouched(true); }}
              placeholder="your-handle"
              placeholderTextColor={colors.textMuted}
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
          ) : (
            <Text style={styles.hint}>3–40 characters · letters, numbers, hyphens</Text>
          )}

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
                placeholder="Leave empty to generate one automatically"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={32}
                data-testid="access-code-input"
              />
              <Text style={styles.hint}>4–32 characters · A–Z, 0–9, _</Text>
            </>
          )}

          <Text style={styles.label}>Contact email (optional)</Text>
          <TextInput
            style={styles.input}
            value={ownerEmail}
            onChangeText={setOwnerEmail}
            placeholder="Defaults to your account email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            data-testid="owner-email-input"
          />

          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            data-testid="create-submit-btn"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Create</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: { padding: 16, paddingBottom: 120 },
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
