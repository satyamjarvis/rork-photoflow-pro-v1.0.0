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
import { Fingerprint } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      await auth.signIn(email, password, true);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      const currentProfile = await auth.refreshProfile();
      
      console.log('[Login] User role:', currentProfile?.role);
      
      if (currentProfile?.role === 'admin') {
        console.log('[Login] Redirecting admin to dashboard');
        router.replace('/(tabs)');
      } else {
        console.log('[Login] Redirecting viewer to public');
        router.replace('/public');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      await auth.signInWithBiometric();
      
      await new Promise(resolve => setTimeout(resolve, 800));
      const currentProfile = await auth.refreshProfile();
      
      console.log('[Biometric Login] User role:', currentProfile?.role);
      
      if (currentProfile?.role === 'admin') {
        console.log('[Biometric Login] Redirecting admin to dashboard');
        router.replace('/(tabs)');
      } else {
        console.log('[Biometric Login] Redirecting viewer to public');
        router.replace('/public');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Biometric authentication failed');
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
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <View style={styles.eyeIcon}>
              <View style={styles.eyeShape}>
                <View style={styles.pupil} />
              </View>
              <View style={styles.redTriangleTop} />
              <View style={styles.blueTriangleBottom} />
            </View>
          </View>
          <Text style={styles.logoText}>
            <Text style={styles.logoTextDark}>david</Text>
            <Text style={styles.logoTextRed}>hogan</Text>
          </Text>
          <Text style={styles.logoSubtext}>Photography</Text>
        </View>

        <View style={styles.formContainer}>
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
            placeholder="••••••••"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            editable={!isLoading}
          />

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/forgot-password')}
            disabled={isLoading}
          >
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => router.push('/create-account')}
            disabled={isLoading}
          >
            <Text style={styles.createAccountText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricLogin}
            disabled={isLoading}
          >
            <Fingerprint size={24} color="#007AFF" />
            <Text style={styles.biometricText}>Use Face ID / Touch ID</Text>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoWrapper: {
    marginBottom: 20,
  },
  eyeIcon: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  eyeShape: {
    width: 100,
    height: 60,
    backgroundColor: '#2C3E7E',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pupil: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  redTriangleTop: {
    position: 'absolute',
    top: 10,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#E74C3C',
  },
  blueTriangleBottom: {
    position: 'absolute',
    bottom: 10,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#2C3E7E',
  },
  logoText: {
    fontSize: 42,
    fontWeight: '300',
    letterSpacing: -1,
  },
  logoTextDark: {
    color: '#2C3E7E',
  },
  logoTextRed: {
    color: '#E74C3C',
  },
  logoSubtext: {
    fontSize: 18,
    color: '#2C3E7E',
    marginTop: 4,
    fontWeight: '300',
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
    marginBottom: 20,
    color: '#000',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPassword: {
    color: '#007AFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  createAccountButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  createAccountText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    gap: 8,
  },
  biometricText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
