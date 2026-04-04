import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows, radius } from '../theme/colors';
import { api } from '../services/api';
import Toast from 'react-native-root-toast';

interface PostWizardProps {
  onComplete: (problemId?: string, newlyAwardedBadges?: any[]) => void;
  onCancel: () => void;
}

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

interface PostWizardProps {
  onComplete: (problemId?: string, newlyAwardedBadges?: any[]) => void;
  onCancel: () => void;
}

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

export default function PostWizard({ onComplete, onCancel }: PostWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1 - Quick post
  const [problemText, setProblemText] = useState('');
  const [similarProblems, setSimilarProblems] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Step 2 - Optional tags
  const [categoryId, setCategoryId] = useState('other');
  const [frequency, setFrequency] = useState<string | null>(null);
  const [severity, setSeverity] = useState<number | null>(null);
  
  // Step 2 - Optional detail fields (collapsible)
  const [showDetails, setShowDetails] = useState(false);
  const [whenHappens, setWhenHappens] = useState('');
  const [whoAffected, setWhoAffected] = useState('');
  const [whatTried, setWhatTried] = useState('');
  
  // Local community toggle
  const [isLocal, setIsLocal] = useState(false);
  const [myCommunity, setMyCommunity] = useState<any>(null);
  
  useEffect(() => {
    api.getMyCommunity().then(setMyCommunity).catch(() => setMyCommunity(null));
  }, []);

  // Duplicate detection
  const searchSimilar = useCallback(async (text: string) => {
    if (text.length < 10) {
      setSimilarProblems([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const data = await api.getSimilarProblems(text);
      setSimilarProblems(data.slice(0, 2)); // Show max 2
    } catch (error) {
      console.error('Error searching similar:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (problemText.length >= 10) {
        searchSimilar(problemText);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [problemText, searchSimilar]);

  const isStep1Valid = problemText.trim().length >= 10;

  const handleContinue = () => {
    if (isStep1Valid) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    try {
      const result = await api.createProblem({
        title: problemText.trim(),
        category_id: isLocal ? 'local' : categoryId,
        frequency: frequency || null,
        pain_level: severity || null,
        is_local: isLocal,
        when_happens: whenHappens.trim() || null,
        who_affected: whoAffected.trim() || null,
        what_tried: whatTried.trim() || null,
      });
      
      // Reset state before calling onComplete
      setIsSubmitting(false);
      setProblemText('');
      setCategoryId('other');
      setFrequency(null);
      setSeverity(null);
      setShowDetails(false);
      setWhenHappens('');
      setWhoAffected('');
      setWhatTried('');
      setStep(1);
      setSimilarProblems([]);
      
      // Show success toast
      showToast('Posted ✓');
      
      onComplete(result.id, result.newly_awarded_badges);
    } catch (error: any) {
      console.error('Post error:', error);
      setIsSubmitting(false);
      
      const message = error.response?.data?.detail || 'Something went wrong. Try again.';
      if (error.response?.status === 429) {
        showToast('Too many Frikts today. Try again tomorrow!', true);
      } else {
        showToast(message, true);
      }
    }
  };

  const handleSkip = () => {
    handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onCancel();
    }
  };

  // Step 1: Quick Post
  const renderStep1 = () => (
    <ScrollView 
      style={styles.stepContent} 
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.stepContentContainer}
    >
      <Text style={styles.stepTitle}>What's bothering you today?</Text>
      <Text style={styles.stepHint}>Write it messy. Just get it out. You can add details later.</Text>
      
      <TextInput
        style={styles.problemInput}
        placeholder="What happened? Why is it annoying?"
        placeholderTextColor={colors.textMuted}
        value={problemText}
        onChangeText={setProblemText}
        multiline
        maxLength={500}
        autoFocus
      />
      
      <Text style={styles.charCount}>
        {problemText.length < 10 
          ? `${10 - problemText.length} more characters needed` 
          : `${problemText.length}/500`
        }
      </Text>
      <Text style={styles.anonymousHint} data-testid="anonymous-hint-text">
        This is anonymous. Focus on the problem, not the person.
      </Text>

      {/* Local toggle */}
      {myCommunity && (
        <View
          style={[styles.localToggle, isLocal && styles.localToggleActive]}
          data-testid="local-toggle-post"
        >
          <Ionicons name="location" size={18} color={isLocal ? '#fff' : '#E85D3A'} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.localToggleText, isLocal && styles.localToggleTextActive]}>
              Post to {myCommunity.name}
            </Text>
            <Text style={[styles.localToggleHint, isLocal && { color: 'rgba(255,255,255,0.7)' }]}>
              This frikt will appear in your local community feed.
            </Text>
          </View>
          <Switch
            value={isLocal}
            onValueChange={setIsLocal}
            trackColor={{ false: '#E8E1D6', true: 'rgba(255,255,255,0.4)' }}
            thumbColor={isLocal ? '#FFFFFF' : '#E85D3A'}
          />
        </View>
      )}

      {isSearching && (
        <View style={styles.searchingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.searchingText}>Looking for similar Frikts...</Text>
        </View>
      )}

      {similarProblems.length > 0 && (
        <View style={styles.similarSection}>
          <Text style={styles.similarTitle}>Similar Frikts found</Text>
          <Text style={styles.similarHint}>Join an existing thread to concentrate signal</Text>
          
          {similarProblems.map((problem) => (
            <TouchableOpacity 
              key={problem.id} 
              style={styles.similarCard}
            >
              <Text style={styles.similarCardTitle} numberOfLines={2}>{problem.title}</Text>
              <View style={styles.similarStats}>
                <Ionicons name="heart" size={14} color={colors.primary} />
                <Text style={styles.similarStatText}>{problem.relates_count} relates</Text>
                <Ionicons name="chatbubble" size={14} color={colors.textMuted} style={{ marginLeft: 12 }} />
                <Text style={styles.similarStatText}>{problem.comments_count} comments</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );

  // Step 2: Quick Tags (Optional)
  const renderStep2 = () => (
    <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentContainer}>
      <Text style={styles.stepTitle}>Add quick details</Text>
      <Text style={styles.stepHint}>Help others find your problem</Text>

      {/* Category */}
      <Text style={styles.fieldLabel}>Category</Text>
      <View style={styles.chipGrid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.chip,
              categoryId === cat.id && styles.chipActive
            ]}
            onPress={() => setCategoryId(cat.id)}
          >
            <Text style={[
              styles.chipText,
              categoryId === cat.id && styles.chipTextActive
            ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Frequency */}
      <Text style={styles.fieldLabel}>Frequency</Text>
      <View style={styles.chipRow}>
        {FREQUENCY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.chip,
              frequency === opt.value && styles.chipActive
            ]}
            onPress={() => setFrequency(frequency === opt.value ? null : opt.value)}
          >
            <Text style={[
              styles.chipText,
              frequency === opt.value && styles.chipTextActive
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Severity */}
      <Text style={styles.fieldLabel}>Severity (1-5)</Text>
      <View style={styles.chipRow}>
        {SEVERITY_LEVELS.map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.chip,
              severity === level && styles.chipActive
            ]}
            onPress={() => setSeverity(severity === level ? null : level)}
          >
            <Text style={[
              styles.chipText,
              severity === level && styles.chipTextActive
            ]}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.severityLabels}>
        <Text style={styles.severityLabel}>Mild</Text>
        <Text style={styles.severityLabel}>Severe</Text>
      </View>

      {/* Collapsible Details Section */}
      <TouchableOpacity 
        style={styles.detailsToggle}
        onPress={() => setShowDetails(!showDetails)}
        data-testid="details-toggle"
      >
        <View style={styles.detailsToggleLeft}>
          <Ionicons 
            name={showDetails ? "chevron-down" : "chevron-forward"} 
            size={20} 
            color={colors.textSecondary} 
          />
          <View>
            <Text style={styles.detailsToggleTitle}>Add details (optional)</Text>
            <Text style={styles.detailsToggleSubtitle}>Helps others relate faster</Text>
          </View>
        </View>
      </TouchableOpacity>

      {showDetails && (
        <View style={styles.detailsSection}>
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
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Drop a Frikt</Text>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepIndicatorText}>{step}/2</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 2) * 100}%` }]} />
        </View>

        {/* Content */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}

        {/* Footer */}
        <View style={styles.footer}>
          {step === 1 ? (
            <TouchableOpacity 
              style={[styles.primaryButton, !isStep1Valid && styles.buttonDisabled]} 
              onPress={handleContinue}
              disabled={!isStep1Valid}
            >
              <Text style={[styles.primaryButtonText, !isStep1Valid && styles.buttonDisabledText]}>Continue</Text>
              {isStep1Valid && <Ionicons name="arrow-forward" size={20} color={colors.white} />}
            </TouchableOpacity>
          ) : (
            <View style={styles.footerRow}>
              <TouchableOpacity 
                style={styles.skipButton} 
                onPress={handleSkip}
                disabled={isSubmitting}
              >
                <Text style={styles.skipButtonText}>Skip details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.doneButton, isSubmitting && styles.buttonDisabled]} 
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color={colors.white} />
                    <Text style={styles.doneButtonText}>Post Frikt</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  stepIndicator: {
    backgroundColor: colors.softRed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  stepIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.divider,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  stepContent: {
    flex: 1,
  },
  stepContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  stepHint: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  problemInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    fontSize: 17,
    color: colors.text,
    minHeight: 140,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    lineHeight: 24,
  },
  charCount: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 8,
  },
  anonymousHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  searchingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  similarSection: {
    marginTop: 24,
  },
  similarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  similarHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  similarCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  similarCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  similarStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  similarStatText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    marginTop: 20,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    height: 36,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
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
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  severityChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  severityText: {
    fontSize: 18,
    fontWeight: '600',
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
  footer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  skipButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  doneButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    gap: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  buttonDisabled: {
    backgroundColor: '#E7E3DC',
  },
  buttonDisabledText: {
    color: '#A19A90',
  },
  localToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#E85D3A40',
    backgroundColor: colors.surface,
  },
  localToggleActive: {
    backgroundColor: '#E85D3A',
    borderColor: '#E85D3A',
  },
  localToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  localToggleTextActive: {
    color: '#fff',
  },
  localToggleHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  localCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E85D3A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localCheckboxActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: '#fff',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
  },
  detailsToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsToggleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  detailsToggleSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  detailsSection: {
    paddingTop: 8,
  },
  detailField: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
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
});
