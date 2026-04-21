import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts} from '@/src/theme/colors';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import Toast from 'react-native-root-toast';

const CATEGORIES = [
  { id: 'money', name: 'Money' },
  { id: 'work', name: 'Work' },
  { id: 'health', name: 'Health' },
  { id: 'home', name: 'Home' },
  { id: 'tech', name: 'Tech' },
  { id: 'school', name: 'School' },
  { id: 'relationships', name: 'Relationships' },
  { id: 'travel', name: 'Travel' },
  { id: 'services', name: 'Services' },
  { id: 'other', name: 'Other' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'rare', label: 'Rare' },
];

const SEVERITY_LEVELS = [1, 2, 3, 4, 5];

export default function EditProblem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [problem, setProblem] = useState<any>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('other');
  const [frequency, setFrequency] = useState<string | null>(null);
  const [painLevel, setPainLevel] = useState<number | null>(null);
  
  // Optional details (always shown in edit mode)
  const [whenHappens, setWhenHappens] = useState('');
  const [whoAffected, setWhoAffected] = useState('');
  const [whatTried, setWhatTried] = useState('');
  
  // Local toggle
  const [isLocal, setIsLocal] = useState(false);
  const [myCommunity, setMyCommunity] = useState<any>(null);

  useEffect(() => {
    loadProblem();
    loadMyCommunity();
  }, [id]);

  const loadMyCommunity = async () => {
    try {
      const data = await api.getMyCommunity();
      setMyCommunity(data);
    } catch (e) {}
  };

  const loadProblem = async () => {
    if (!id) return;
    
    try {
      const data = await api.getProblem(id);
      setProblem(data);
      setTitle(data.title || '');
      setCategoryId(data.category_id || 'other');
      setFrequency(data.frequency || null);
      setPainLevel(data.pain_level || null);
      setWhenHappens(data.when_happens || '');
      setWhoAffected(data.who_affected || '');
      setWhatTried(data.what_tried || '');
      setIsLocal(data.is_local || false);
      
      // Show details section if any context is filled
      // (no longer needed - always visible in edit mode)
    } catch (error) {
      console.error('Error loading problem:', error);
      showToast('Failed to load problem', true);
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string, isError: boolean = false) => {
    Toast.show(message, {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
      shadow: true,
      animation: true,
      hideOnPress: true,
      backgroundColor: isError ? colors.error : colors.accent,
      textColor: colors.white,
      containerStyle: {
        borderRadius: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginBottom: 80,
      },
    });
  };

  const isValid = title.trim().length >= 10;

  const handleSave = async () => {
    if (!isValid) return;
    
    if (isLocal && !myCommunity && !isAdmin) {
      showToast('Join a community first to post locally', true);
      return;
    }
    
    setIsSaving(true);
    try {
      await api.updateProblem(id!, {
        title: title.trim(),
        category_id: categoryId,
        frequency: frequency,
        pain_level: painLevel,
        when_happens: whenHappens.trim() || null,
        who_affected: whoAffected.trim() || null,
        what_tried: whatTried.trim() || null,
        is_local: isLocal,
        community_id: isLocal && myCommunity ? myCommunity.id : null,
      });
      
      showToast('Updated ✅');
      router.back();
    } catch (error: any) {
      console.error('Error updating:', error);
      showToast('Failed to update. Try again.', true);
    } finally {
      setIsSaving(false);
    }
  };

  // Check if user can delete (owner or admin)
  const canDelete = problem && user && (user.id === problem.user_id || isAdmin);

  const handleDelete = () => {
    Alert.alert(
      'Delete this Frikt?',
      "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await api.deleteProblem(id!);
              showToast('Deleted ✅');
              router.replace('/(tabs)/home');
            } catch (error: any) {
              console.error('Error deleting:', error);
              showToast('Failed to delete. Try again.', true);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Frikt</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.headerButton, (!isValid || isSaving) && styles.headerButtonDisabled]}
            disabled={!isValid || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.saveText, !isValid && styles.saveTextDisabled]}>
                {isSaving ? 'Saving…' : 'Save'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Main Text */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frikt</Text>
            <TextInput
              style={styles.mainInput}
              value={title}
              onChangeText={setTitle}
              placeholder="What's the problem?"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>
              {title.length < 10 
                ? `${10 - title.length} more characters needed` 
                : `${title.length}/500`
              }
            </Text>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.chipGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, categoryId === cat.id && styles.chipActive]}
                  onPress={() => setCategoryId(cat.id)}
                >
                  <Text style={[styles.chipText, categoryId === cat.id && styles.chipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Frequency */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequency (optional)</Text>
            <View style={styles.chipRow}>
              {FREQUENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, frequency === opt.value && styles.chipActive]}
                  onPress={() => setFrequency(frequency === opt.value ? null : opt.value)}
                >
                  <Text style={[styles.chipText, frequency === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Severity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Severity (optional)</Text>
            <View style={styles.severityRow}>
              {SEVERITY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.severityChip, painLevel === level && styles.severityChipActive]}
                  onPress={() => setPainLevel(painLevel === level ? null : level)}
                >
                  <Text style={[styles.severityText, painLevel === level && styles.severityTextActive]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.severityLabels}>
              <Text style={styles.severityLabel}>Mild</Text>
              <Text style={styles.severityLabel}>Severe</Text>
            </View>
          </View>

          {/* Local Toggle */}
          {(myCommunity || isAdmin) && (
            <View style={styles.section} data-testid="local-toggle-section">
              <Text style={styles.sectionTitle}>Visibility</Text>
              <View style={styles.localToggleRow}>
                <View style={styles.localToggleInfo}>
                  <Ionicons name="location" size={20} color={isLocal ? '#E85D3A' : colors.textMuted} />
                  <View style={styles.localToggleText}>
                    <Text style={styles.localToggleLabel}>
                      {isLocal ? 'Local' : 'Global'}
                    </Text>
                    <Text style={styles.localToggleHint}>
                      {isLocal 
                        ? (isAdmin && problem?.user_id !== user?.id
                            ? "Will appear in the creator's community"
                            : `Visible in ${myCommunity?.name || 'your community'}`)
                        : 'Visible to everyone'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isLocal}
                  onValueChange={setIsLocal}
                  trackColor={{ false: colors.border, true: '#E85D3A' }}
                  thumbColor="#fff"
                  data-testid="local-toggle-switch"
                />
              </View>
            </View>
          )}

          {/* Details Section - Always visible in edit mode */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details (optional)</Text>
            <Text style={styles.detailHint}>Helps others relate faster</Text>

            <View style={styles.detailField}>
              <Text style={styles.detailLabel}>When does this happen?</Text>
              <TextInput
                style={styles.detailInput}
                value={whenHappens}
                onChangeText={setWhenHappens}
                placeholder="Describe the situation..."
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={500}
              />
            </View>

            <View style={styles.detailField}>
              <Text style={styles.detailLabel}>Who does it affect?</Text>
              <TextInput
                style={styles.detailInput}
                value={whoAffected}
                onChangeText={setWhoAffected}
                placeholder="Who else experiences this?"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={500}
              />
            </View>

            <View style={styles.detailField}>
              <Text style={styles.detailLabel}>What have you tried?</Text>
              <TextInput
                style={styles.detailInput}
                value={whatTried}
                onChangeText={setWhatTried}
                placeholder="Any solutions you've attempted?"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={500}
              />
            </View>
          </View>

          {/* Delete Button - Only show if owner or admin */}
          {canDelete && (
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={styles.deleteButtonText}>Delete this Frikt</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerButton: {
    minWidth: 60,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  cancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  saveText: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.primary,
    textAlign: 'right',
  },
  saveTextDisabled: {
    color: colors.textMuted,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  mainInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    fontSize: 17,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
    lineHeight: 24,
  },
  charCount: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    height: 36,
    justifyContent: 'center' as const,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
  },
  severityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  severityChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    height: 36,
    justifyContent: 'center' as const,
  },
  severityChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  severityText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  severityTextActive: {
    color: colors.white,
  },
  severityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  severityLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  detailHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
    marginTop: -4,
  },
  localToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  localToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  localToggleText: {
    flex: 1,
  },
  localToggleLabel: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  localToggleHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  detailField: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  detailInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error + '40',
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.error,
  },
  bottomPadding: {
    height: 40,
  },
});
