import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logAdminAction } from '@/lib/logAdminAction';
import { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: 'admin' | 'viewer';
  profile_image_url: string | null;
  is_subscriber: boolean;
  subscription_expires_at: string | null;
  status: 'active' | 'suspended';
  last_login: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  adminModeEnabled: boolean;
};

type AuthActions = {
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  enableBiometricAuth: () => Promise<void>;
  signInWithBiometric: () => Promise<void>;
  setAdminMode: (enabled: boolean) => Promise<void>;
};

const BIOMETRIC_KEY = 'photoflow_biometric_credentials';
const ADMIN_MODE_KEY = 'photoFlow_admin_mode';

const clearAuthStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(key => key.includes('supabase') || key.includes('sb-'));
    if (authKeys.length > 0) {
      console.log('[AuthContext] Clearing auth keys:', authKeys);
      await AsyncStorage.multiRemove(authKeys);
    }
  } catch (error) {
    console.error('[AuthContext] Failed to clear auth storage:', error);
  }
};

export const [AuthContext, useAuth] = createContextHook<AuthState & AuthActions>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminModeEnabled, setAdminModeEnabled] = useState(true);

  const loadAdminMode = async () => {
    try {
      const stored = await AsyncStorage.getItem(ADMIN_MODE_KEY);
      if (stored !== null) {
        setAdminModeEnabled(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load admin mode:', error);
    }
  };

  const setAdminMode = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(ADMIN_MODE_KEY, JSON.stringify(enabled));
      setAdminModeEnabled(enabled);
      
      if (profile?.role === 'admin') {
        const { error: auditError } = await logAdminAction({
          tableName: 'profiles',
          action: enabled ? 'admin_mode_enabled' : 'admin_mode_disabled',
          rowId: profile.id,
          payload: { admin_mode: enabled },
        });
        if (auditError) console.error('Failed to log audit:', JSON.stringify(auditError, null, 2));
      }
    } catch (error) {
      console.error('Failed to set admin mode:', error);
      throw error;
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      console.log('[AuthContext] Loading profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AuthContext] Profile load error:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      if (!data) {
        console.error('[AuthContext] No profile data returned for user:', userId);
        throw new Error('Profile not found');
      }
      
      const typedData = data as UserProfile;
      console.log('[AuthContext] Profile loaded successfully:', typedData.email);
      setProfile(typedData);
    } catch (error: any) {
      console.error('[AuthContext] Failed to load profile:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      setProfile(null);
    }
  };

  useEffect(() => {
    console.log('[AuthContext] Initializing...');
    loadAdminMode();

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('[AuthContext] Failed to get session:', error.message);
        if (error.message.includes('Refresh Token') || error.message.includes('Invalid')) {
          console.log('[AuthContext] Clearing corrupted session...');
          await clearAuthStorage();
        }
      }
      console.log('[AuthContext] Session:', session ? 'Active' : 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
      setIsLoading(false);
    }).catch(async (err) => {
      console.error('[AuthContext] Session initialization error:', err);
      if (err?.message?.includes('Refresh Token') || err?.message?.includes('Invalid')) {
        console.log('[AuthContext] Clearing corrupted session...');
        await clearAuthStorage();
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth state changed:', event);
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] Token refreshed successfully');
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] User signed out, clearing session');
        clearAuthStorage();
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const validatePassword = (password: string): boolean => {
    if (password.length < 10) {
      Alert.alert('Weak Password', 'Password must be at least 10 characters long');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      Alert.alert('Weak Password', 'Password must contain at least one uppercase letter');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      Alert.alert('Weak Password', 'Password must contain at least one number');
      return false;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      Alert.alert('Weak Password', 'Password must contain at least one special character');
      return false;
    }
    return true;
  };

  const signIn = async (email: string, password: string, rememberMe = false) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (rememberMe) {
        await SecureStore.setItemAsync(
          BIOMETRIC_KEY,
          JSON.stringify({ email, password })
        );
      }

      if (data.user) {
        await loadProfile(data.user.id);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    if (!validatePassword(password)) {
      throw new Error('Password does not meet requirements');
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user && name) {
        const { error: updateError } = await (supabase
          .from('profiles') as any)
          .update({ name })
          .eq('id', data.user.id);
        if (updateError) console.error('Failed to update name:', updateError);
      }

      if (data.user) {
        await loadProfile(data.user.id);
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    try {
      const { error } = await (supabase
        .from('profiles') as any)
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const changePassword = async (newPassword: string) => {
    if (!validatePassword(newPassword)) {
      throw new Error('Password does not meet requirements');
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      if (profile && !profile.onboarding_completed) {
        await updateProfile({ onboarding_completed: true });
      }
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    if (!user) throw new Error('No user logged in');

    try {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;

      await signOut();
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    if (!validatePassword(newPassword)) {
      throw new Error('Password does not meet requirements');
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const enableBiometricAuth = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware) {
        Alert.alert('Not Available', 'Biometric authentication is not available on this device');
        return;
      }

      if (!isEnrolled) {
        Alert.alert('Not Set Up', 'Please set up biometric authentication in your device settings');
        return;
      }

      Alert.alert('Success', 'Biometric authentication enabled');
    } catch (error) {
      console.error('Enable biometric error:', error);
      throw error;
    }
  };

  const signInWithBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Not Available', 'Biometric authentication is not available');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to sign in',
        fallbackLabel: 'Use passcode',
      });

      if (result.success) {
        const credentials = await SecureStore.getItemAsync(BIOMETRIC_KEY);
        if (credentials) {
          const { email, password } = JSON.parse(credentials);
          await signIn(email, password);
        } else {
          Alert.alert('Error', 'No saved credentials found');
        }
      }
    } catch (error) {
      console.error('Biometric sign in error:', error);
      throw error;
    }
  };

  return {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    adminModeEnabled: profile?.role === 'admin' ? adminModeEnabled : false,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    updateProfile,
    changePassword,
    deleteAccount,
    requestPasswordReset,
    resetPassword,
    enableBiometricAuth,
    signInWithBiometric,
    setAdminMode,
  };
});
