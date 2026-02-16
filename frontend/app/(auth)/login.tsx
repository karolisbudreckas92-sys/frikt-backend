import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/theme/colors';

// Custom Logo Mark Component - exact brand specs
// Icon height: 30px, matches wordmark height
const LogoMark = () => {
  const iconHeight = 30;
  const barThickness = 5; // Calculated to fit 3 bars + 2 gaps (7px each) in 30px
  const barGap = 7;
  const barRadius = 2.5;
  const barColor = '#2B2F36';
  const dotColor = '#E4572E';
  const dotSize = barThickness * 1.3;
  const iconWidth = 28; // Width of bars area
  const dotSpacing = 8; // Space between bars and dot
  
  return (
    <View style={{ 
      height: iconHeight, 
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      {/* Bars container */}
      <View style={{ 
        width: iconWidth, 
        height: iconHeight,
        justifyContent: 'space-between',
      }}>
        {/* Top bar - 100% */}
        <View style={{ 
          width: iconWidth, 
          height: barThickness, 
          backgroundColor: barColor, 
          borderRadius: barRadius,
        }} />
        {/* Middle bar - 85% */}
        <View style={{ 
          width: iconWidth * 0.85, 
          height: barThickness, 
          backgroundColor: barColor, 
          borderRadius: barRadius,
        }} />
        {/* Bottom bar - 60% */}
        <View style={{ 
          width: iconWidth * 0.60, 
          height: barThickness, 
          backgroundColor: barColor, 
          borderRadius: barRadius,
        }} />
      </View>
      {/* Red dot - vertically centered to middle bar, 8px from bars */}
      <View style={{ 
        width: dotSize, 
        height: dotSize, 
        backgroundColor: dotColor, 
        borderRadius: dotSize / 2,
        marginLeft: dotSpacing,
      }} />
    </View>
  );
};

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.log('Login error:', JSON.stringify(error, null, 2));
      const errorMessage = error.response?.data?.detail || 
                          error.message || 
                          'Network error - please check your connection';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LogoMark size={52} />
              <Text style={styles.logoText}>frikt</Text>
            </View>
            <Text style={styles.tagline}>Share frictions. Find patterns.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue sharing problems</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -1,
    marginLeft: 8,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: {
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
  },
  eyeButton: {
    padding: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
