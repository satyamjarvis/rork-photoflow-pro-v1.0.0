import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Check, X } from 'lucide-react-native';

type PasswordStrength = {
  hasLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
};

export default function CreateAccountScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordTips, setShowPasswordTips] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const checkPasswordStrength = (pwd: string): PasswordStrength => ({
    hasLength: pwd.length >= 10,
    hasUppercase: /[A-Z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[^A-Za-z0-9]/.test(pwd),
  });

  const strength = checkPasswordStrength(password);
  const isPasswordValid = Object.values(strength).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const getStrengthColor = () => {
    const validCount = Object.values(strength).filter(Boolean).length;
    if (validCount === 0) return '#E0E0E0';
    if (validCount <= 2) return '#E74C3C';
    if (validCount === 3) return '#F39C12';
    return '#27AE60';
  };

  const getStrengthLabel = () => {
    const validCount = Object.values(strength).filter(Boolean).length;
    if (validCount === 0) return '';
    if (validCount <= 2) return 'Weak';
    if (validCount === 3) return 'Medium';
    return 'Strong';
  };

  const handleCreateAccount = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!isPasswordValid) {
      Alert.alert('Error', 'Please meet all password requirements');
      return;
    }

    if (!passwordsMatch) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await signUp(email, password, name);
      Alert.alert('Success', 'Account created successfully!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/portfolio'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the PhotoFlow community</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="name"
            editable={!isLoading}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            editable={!isLoading}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Create a strong password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            editable={!isLoading}
            onFocus={() => setShowPasswordTips(true)}
          />

          {showPasswordTips && password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${(Object.values(strength).filter(Boolean).length / 4) * 100}%`,
                      backgroundColor: getStrengthColor(),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.strengthLabel, { color: getStrengthColor() }]}>
                {getStrengthLabel()}
              </Text>

              <View style={styles.requirementsContainer}>
                <View style={styles.requirement}>
                  {strength.hasLength ? (
                    <Check size={16} color="#27AE60" />
                  ) : (
                    <X size={16} color="#E74C3C" />
                  )}
                  <Text
                    style={[
                      styles.requirementText,
                      strength.hasLength && styles.requirementMet,
                    ]}
                  >
                    At least 10 characters
                  </Text>
                </View>

                <View style={styles.requirement}>
                  {strength.hasUppercase ? (
                    <Check size={16} color="#27AE60" />
                  ) : (
                    <X size={16} color="#E74C3C" />
                  )}
                  <Text
                    style={[
                      styles.requirementText,
                      strength.hasUppercase && styles.requirementMet,
                    ]}
                  >
                    One uppercase letter
                  </Text>
                </View>

                <View style={styles.requirement}>
                  {strength.hasNumber ? (
                    <Check size={16} color="#27AE60" />
                  ) : (
                    <X size={16} color="#E74C3C" />
                  )}
                  <Text
                    style={[
                      styles.requirementText,
                      strength.hasNumber && styles.requirementMet,
                    ]}
                  >
                    One number
                  </Text>
                </View>

                <View style={styles.requirement}>
                  {strength.hasSpecial ? (
                    <Check size={16} color="#27AE60" />
                  ) : (
                    <X size={16} color="#E74C3C" />
                  )}
                  <Text
                    style={[
                      styles.requirementText,
                      strength.hasSpecial && styles.requirementMet,
                    ]}
                  >
                    One special character
                  </Text>
                </View>
              </View>
            </View>
          )}

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={[
              styles.input,
              confirmPassword.length > 0 &&
                (passwordsMatch ? styles.inputSuccess : styles.inputError),
            ]}
            placeholder="Re-enter your password"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            editable={!isLoading}
          />

          {confirmPassword.length > 0 && (
            <View style={styles.matchContainer}>
              {passwordsMatch ? (
                <>
                  <Check size={16} color="#27AE60" />
                  <Text style={styles.matchText}>Passwords match</Text>
                </>
              ) : (
                <>
                  <X size={16} color="#E74C3C" />
                  <Text style={styles.mismatchText}>Passwords do not match</Text>
                </>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.createButton,
              (!isPasswordValid || !passwordsMatch || isLoading) && styles.createButtonDisabled,
            ]}
            onPress={handleCreateAccount}
            disabled={!isPasswordValid || !passwordsMatch || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            disabled={isLoading}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Already have an account? Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2C3E7E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#000',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputSuccess: {
    borderColor: '#27AE60',
  },
  inputError: {
    borderColor: '#E74C3C',
  },
  strengthContainer: {
    marginBottom: 20,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  requirementsContainer: {
    gap: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
  },
  requirementMet: {
    color: '#27AE60',
    textDecorationLine: 'line-through',
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  matchText: {
    fontSize: 14,
    color: '#27AE60',
    fontWeight: '500',
  },
  mismatchText: {
    fontSize: 14,
    color: '#E74C3C',
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});
