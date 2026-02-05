import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';

export default function EditProfile() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [showCity, setShowCity] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.name || '');
      setBio(user.bio || '');
      setCity(user.city || '');
      setShowCity(user.showCity || false);
      setAvatarUrl(user.avatarUrl || null);
    }
  }, [user]);

  // Track changes
  useEffect(() => {
    if (user) {
      const nameChanged = displayName !== (user.displayName || user.name || '');
      const bioChanged = bio !== (user.bio || '');
      const cityChanged = city !== (user.city || '');
      const showCityChanged = showCity !== (user.showCity || false);
      const avatarChanged = avatarUrl !== (user.avatarUrl || null);
      setHasChanges(nameChanged || bioChanged || cityChanged || showCityChanged || avatarChanged);
    }
  }, [displayName, bio, city, showCity, avatarUrl, user]);

  const validateName = (name: string): boolean => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 20) return false;
    // Check if not emoji-only (must have at least one letter or number)
    const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
    return hasAlphanumeric;
  };

  const isNameValid = validateName(displayName);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library to upload a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setIsUploading(true);
    try {
      const response = await api.uploadAvatar(uri);
      setAvatarUrl(response.url);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!isNameValid) {
      Alert.alert('Invalid name', 'Name must be 2-20 characters and contain at least one letter or number.');
      return;
    }

    setIsLoading(true);
    try {
      await api.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        city: city.trim(),
        showCity,
        avatarUrl,
      });
      await refreshUser();
      Alert.alert('Saved', '', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitial = () => {
    return (displayName || user?.name || 'U').charAt(0).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit profile</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.headerButton, !isNameValid && styles.headerButtonDisabled]}
            disabled={!isNameValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.saveText, !isNameValid && styles.saveTextDisabled]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} disabled={isUploading}>
              <View style={styles.avatarContainer}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{getInitial()}</Text>
                  </View>
                )}
                {isUploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color={colors.white} />
                  </View>
                )}
                <View style={styles.cameraIcon}>
                  <Ionicons name="camera" size={16} color={colors.white} />
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage} disabled={isUploading}>
              <Text style={styles.changePhotoText}>
                {avatarUrl ? 'Change photo' : 'Add photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Name Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={[styles.input, !isNameValid && displayName.length > 0 && styles.inputError]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                maxLength={20}
                autoCapitalize="words"
              />
              {!isNameValid && displayName.length > 0 && (
                <Text style={styles.errorText}>2-20 characters, must include letters or numbers</Text>
              )}
              <Text style={styles.charCount}>{displayName.length}/20</Text>
            </View>

            {/* Bio Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Bio (optional)</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell others about yourself"
                placeholderTextColor={colors.textMuted}
                maxLength={80}
                multiline={false}
              />
              <Text style={styles.charCount}>{bio.length}/80</Text>
            </View>

            {/* City Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>City (optional)</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="Your city"
                placeholderTextColor={colors.textMuted}
                maxLength={50}
              />
            </View>

            {/* Show City Toggle */}
            <View style={styles.toggleContainer}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Show my city on my profile</Text>
                <Text style={styles.toggleDescription}>Let others see where you're from</Text>
              </View>
              <Switch
                value={showCity}
                onValueChange={setShowCity}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={showCity ? colors.primary : colors.textMuted}
              />
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
    fontWeight: '600',
    color: colors.text,
  },
  cancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'right',
  },
  saveTextDisabled: {
    color: colors.textMuted,
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.white,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  changePhotoText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  form: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputError: {
    borderColor: colors.error,
  },
  bioInput: {
    height: 48,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  toggleDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
});
