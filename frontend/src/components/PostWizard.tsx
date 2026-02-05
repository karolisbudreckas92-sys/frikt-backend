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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { api } from '../services/api';

interface PostWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

const PLACEHOLDERS = [
  "I waste 20 minutes a day because...",
  "I hate when ___ happens at work...",
  "It's annoying that ____",
  "Every time I try to ___, it fails because...",
  "I spend too much on ___ because...",
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', icon: 'repeat' },
  { value: 'weekly', label: 'Weekly', icon: 'calendar' },
  { value: 'monthly', label: 'Monthly', icon: 'calendar-outline' },
  { value: 'rare', label: 'Rare', icon: 'time-outline' },
];

const PAIN_LEVELS = [1, 2, 3, 4, 5];

const PAY_OPTIONS = ['$0', '$1-10', '$10-50', '$50+'];

export default function PostWizard({ onComplete, onCancel }: PostWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1
  const [title, setTitle] = useState('');
  const [similarProblems, setSimilarProblems] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [placeholder] = useState(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  
  // Step 2
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState('');
  const [painLevel, setPainLevel] = useState(0);
  const [willingToPay, setWillingToPay] = useState('$0');
  
  // Step 3
  const [whenHappens, setWhenHappens] = useState('');
  const [whoAffected, setWhoAffected] = useState('');
  const [whatTried, setWhatTried] = useState('');
  const [isProblemConfirmed, setIsProblemConfirmed] = useState(false);
  const [showExample, setShowExample] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const searchSimilar = useCallback(async (text: string) => {
    if (text.length < 10) {
      setSimilarProblems([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const data = await api.getSimilarProblems(text);
      setSimilarProblems(data);
    } catch (error) {
      console.error('Error searching similar:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (title.length >= 10) {
        searchSimilar(title);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [title, searchSimilar]);

  const validateStep1 = () => {
    if (title.trim().length < 10) {
      Alert.alert('Too Short', 'Title must be at least 10 characters');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!categoryId) {
      Alert.alert('Required', 'Please select a category');
      return false;
    }
    if (!frequency) {
      Alert.alert('Required', 'Please select how often this happens');
      return false;
    }
    if (!painLevel) {
      Alert.alert('Required', 'Please rate the pain level');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (whenHappens.trim().length < 40) {
      Alert.alert('Too Short', '"When does this happen?" needs at least 40 characters');
      return false;
    }
    if (whoAffected.trim().length < 40) {
      Alert.alert('Too Short', '"Who does it affect?" needs at least 40 characters');
      return false;
    }
    if (whatTried.trim().length < 40) {
      Alert.alert('Too Short', '"What have you tried?" needs at least 40 characters');
      return false;
    }
    if (!isProblemConfirmed) {
      Alert.alert('Confirm', 'Please confirm this is a problem, not a solution pitch');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onCancel();
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    
    setIsSubmitting(true);
    try {
      await api.createProblem({
        title: title.trim(),
        category_id: categoryId,
        frequency,
        pain_level: painLevel,
        willing_to_pay: willingToPay,
        when_happens: whenHappens.trim(),
        who_affected: whoAffected.trim(),
        what_tried: whatTried.trim(),
        is_problem_not_solution: isProblemConfirmed,
      });
      Alert.alert('Success', 'Your problem has been posted!', [
        { text: 'OK', onPress: onComplete }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to post problem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <ScrollView style={styles.stepContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.stepTitle}>What's the problem?</Text>
      <Text style={styles.stepHint}>Make it specific. One situation.</Text>
      
      <TextInput
        style={styles.titleInput}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={setTitle}
        multiline
        maxLength={200}
      />
      <Text style={styles.charCount}>{title.length}/200 (min 10)</Text>

      {isSearching && (
        <View style={styles.searchingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.searchingText}>Looking for similar problems...</Text>
        </View>
      )}

      {similarProblems.length > 0 && (
        <View style={styles.similarSection}>
          <Text style={styles.similarTitle}>Similar problems found</Text>
          <Text style={styles.similarHint}>Join an existing thread to concentrate signal</Text>
          
          {similarProblems.map((problem) => (
            <TouchableOpacity 
              key={problem.id} 
              style={styles.similarCard}
              onPress={() => {
                Alert.alert(
                  'Join Existing Thread?',
                  'This helps concentrate feedback on similar problems.',
                  [
                    { text: 'Post Anyway', style: 'cancel' },
                    { text: 'View Thread', onPress: () => {} }, // Could navigate
                  ]
                );
              }}
            >
              <View style={styles.similarHeader}>
                <View style={[styles.similarPill, { backgroundColor: problem.category_color + '25' }]}>
                  <Text style={[styles.similarPillText, { color: problem.category_color }]}>
                    {problem.category_name}
                  </Text>
                </View>
              </View>
              <Text style={styles.similarCardTitle} numberOfLines={2}>{problem.title}</Text>
              <View style={styles.similarStats}>
                <Ionicons name="heart" size={14} color={colors.relateActive} />
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

  const renderStep2 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tell us more</Text>
      
      <Text style={styles.fieldLabel}>Category *</Text>
      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              categoryId === cat.id && { backgroundColor: cat.color, borderColor: cat.color }
            ]}
            onPress={() => setCategoryId(cat.id)}
          >
            <Ionicons 
              name={cat.icon} 
              size={16} 
              color={categoryId === cat.id ? colors.white : cat.color} 
            />
            <Text style={[
              styles.categoryChipText,
              categoryId === cat.id && { color: colors.white }
            ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>How often does this happen? *</Text>
      <View style={styles.optionRow}>
        {FREQUENCY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionChip,
              frequency === opt.value && styles.optionChipActive
            ]}
            onPress={() => setFrequency(opt.value)}
          >
            <Ionicons 
              name={opt.icon as any} 
              size={16} 
              color={frequency === opt.value ? colors.white : colors.textSecondary} 
            />
            <Text style={[
              styles.optionChipText,
              frequency === opt.value && styles.optionChipTextActive
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>How bad is it? (1-5) *</Text>
      <View style={styles.painRow}>
        {PAIN_LEVELS.map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.painChip,
              painLevel === level && styles.painChipActive
            ]}
            onPress={() => setPainLevel(level)}
          >
            <Text style={[
              styles.painChipText,
              painLevel === level && styles.painChipTextActive
            ]}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.painLabels}>
        <Text style={styles.painLabel}>Mild</Text>
        <Text style={styles.painLabel}>Severe</Text>
      </View>

      <Text style={styles.fieldLabel}>Would you pay to remove it? (optional)</Text>
      <View style={styles.optionRow}>
        {PAY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[
              styles.payChip,
              willingToPay === opt && styles.payChipActive
            ]}
            onPress={() => setWillingToPay(opt)}
          >
            <Text style={[
              styles.payChipText,
              willingToPay === opt && styles.payChipTextActive
            ]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView style={styles.stepContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.stepTitle}>Add context</Text>
      <Text style={styles.stepHint}>Help others understand your friction</Text>

      <TouchableOpacity 
        style={styles.exampleToggle}
        onPress={() => setShowExample(!showExample)}
      >
        <Ionicons name="bulb-outline" size={18} color={colors.primary} />
        <Text style={styles.exampleToggleText}>
          {showExample ? 'Hide example' : 'Good post looks like this'}
        </Text>
        <Ionicons 
          name={showExample ? 'chevron-up' : 'chevron-down'} 
          size={18} 
          color={colors.primary} 
        />
      </TouchableOpacity>

      {showExample && (
        <View style={styles.exampleBox}>
          <Text style={styles.exampleLabel}>Example:</Text>
          <Text style={styles.exampleText}>
            <Text style={styles.exampleBold}>When: </Text>
            "Every morning when I check my email, I spend 15+ minutes sorting through newsletters and promotions before finding important messages."
          </Text>
          <Text style={styles.exampleText}>
            <Text style={styles.exampleBold}>Who: </Text>
            "Anyone with a busy inbox who gets 50+ emails daily. Especially professionals who can't risk missing urgent emails."
          </Text>
          <Text style={styles.exampleText}>
            <Text style={styles.exampleBold}>Tried: </Text>
            "I've tried Gmail filters but they're tedious to set up. Unsubscribe takes too long. Still drowning."
          </Text>
        </View>
      )}

      <Text style={styles.fieldLabel}>When does this happen? *</Text>
      <TextInput
        style={styles.contextInput}
        placeholder="Describe the specific situation when this friction occurs..."
        placeholderTextColor={colors.textMuted}
        value={whenHappens}
        onChangeText={setWhenHappens}
        multiline
        maxLength={500}
      />
      <Text style={styles.charCount}>{whenHappens.length}/500 (min 40)</Text>

      <Text style={styles.fieldLabel}>Who does it affect? *</Text>
      <TextInput
        style={styles.contextInput}
        placeholder="Who else experiences this? Be specific about the type of people..."
        placeholderTextColor={colors.textMuted}
        value={whoAffected}
        onChangeText={setWhoAffected}
        multiline
        maxLength={500}
      />
      <Text style={styles.charCount}>{whoAffected.length}/500 (min 40)</Text>

      <Text style={styles.fieldLabel}>What have you tried? *</Text>
      <TextInput
        style={styles.contextInput}
        placeholder="What solutions have you attempted? Why didn't they work?"
        placeholderTextColor={colors.textMuted}
        value={whatTried}
        onChangeText={setWhatTried}
        multiline
        maxLength={500}
      />
      <Text style={styles.charCount}>{whatTried.length}/500 (min 40)</Text>

      <TouchableOpacity 
        style={styles.confirmCheckbox}
        onPress={() => setIsProblemConfirmed(!isProblemConfirmed)}
      >
        <View style={[styles.checkbox, isProblemConfirmed && styles.checkboxActive]}>
          {isProblemConfirmed && <Ionicons name="checkmark" size={16} color={colors.white} />}
        </View>
        <Text style={styles.confirmText}>This is a problem, not a solution pitch.</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post a Problem</Text>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepIndicatorText}>{step}/3</Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <View style={styles.footer}>
          {step < 3 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={20} color={colors.white} />
                  <Text style={styles.submitButtonText}>Post Problem</Text>
                </>
              )}
            </TouchableOpacity>
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
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stepIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  stepHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  titleInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  charCount: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 6,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  searchingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  similarSection: {
    marginTop: 20,
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
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  similarHeader: {
    marginBottom: 8,
  },
  similarPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  similarPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  similarCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
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
    marginBottom: 10,
    marginTop: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  optionChipTextActive: {
    color: colors.white,
  },
  painRow: {
    flexDirection: 'row',
    gap: 8,
  },
  painChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  painChipActive: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  painChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  painChipTextActive: {
    color: colors.white,
  },
  painLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  painLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  payChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  payChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  payChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  payChipTextActive: {
    color: colors.white,
  },
  exampleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  exampleToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    flex: 1,
  },
  exampleBox: {
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  exampleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 8,
  },
  exampleBold: {
    fontWeight: '600',
    color: colors.text,
  },
  contextInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  confirmText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
