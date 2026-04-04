import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts} from '@/src/theme/colors';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import Toast from 'react-native-root-toast';

const CORAL = '#E85D3A';

export default function RequestCommunity() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [communityName, setCommunityName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !communityName.trim()) return;
    setIsSubmitting(true);
    try {
      await api.requestCommunity(email.trim(), communityName.trim(), description.trim() || undefined);
      setSubmitted(true);
    } catch (error: any) {
      Toast.show(error.response?.data?.detail || 'Failed to submit request', {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: colors.error,
        textColor: '#fff',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successContainer} data-testid="request-success">
          <Ionicons name="checkmark-circle" size={64} color={CORAL} />
          <Text style={styles.successTitle}>Request Submitted!</Text>
          <Text style={styles.successText}>
            We'll review your request and get back to you via email within a few days.
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request a Community</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Ionicons name="location" size={40} color={CORAL} style={{ alignSelf: 'center' }} />
          <Text style={styles.title}>Want a local community?</Text>
          <Text style={styles.subtitle}>
            Tell us about the community you'd like and we'll set it up for you.
          </Text>

          <Text style={styles.label}>Your Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            data-testid="request-email-input"
          />

          <Text style={styles.label}>Community Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Melbourne CBD, Sydney Inner West"
            placeholderTextColor={colors.textMuted}
            value={communityName}
            onChangeText={setCommunityName}
            data-testid="request-name-input"
          />

          <Text style={styles.label}>Why this community? (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell us a bit about who would join and why..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            data-testid="request-description-input"
          />

          <TouchableOpacity
            style={[styles.submitButton, (!email.trim() || !communityName.trim()) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!email.trim() || !communityName.trim() || isSubmitting}
            data-testid="submit-request-btn"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.submitButtonText, (!email.trim() || !communityName.trim()) && styles.submitButtonTextDisabled]}>Submit Request</Text>
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
  headerTitle: { flex: 1, fontSize: 18, color: colors.text, textAlign: 'center' },
  content: { padding: 24 },
  title: { fontSize: 22, color: colors.text, textAlign: 'center', marginTop: 16 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 28, lineHeight: 20 },
  label: { fontSize: 14, color: colors.text, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.text,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  submitButton: {
    backgroundColor: CORAL, borderRadius: radius.md, paddingVertical: 16,
    alignItems: 'center', marginTop: 28,
  },
  buttonDisabled: { backgroundColor: colors.disabledBg },
  submitButtonTextDisabled: { color: colors.disabledText },
  submitButtonText: { color: '#fff', fontSize: 16 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  successTitle: { fontSize: 22, color: colors.text, marginTop: 16 },
  successText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  doneButton: {
    backgroundColor: CORAL, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 40, marginTop: 28,
  },
  doneButtonText: { color: '#fff', fontSize: 16 },
});
