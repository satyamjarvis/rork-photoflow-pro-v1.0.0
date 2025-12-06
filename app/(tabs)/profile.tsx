import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Modal, Image, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Typography } from '@/constants/colors';
import { User as UserIcon, Users, ChevronRight, Eye, EyeOff, Camera, LogOut, Bell, Globe, Edit, LayoutDashboard } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { profile, isLoading, signOut, adminModeEnabled, setAdminMode, refreshProfile } = useAuth();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingMode, setPendingMode] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const insets = useSafeAreaInsets();

  const handleAdminModeToggle = (value: boolean) => {
    setPendingMode(value);
    setShowConfirmModal(true);
  };

  const confirmModeChange = async () => {
    try {
      await setAdminMode(pendingMode);
      setShowConfirmModal(false);
      Alert.alert(
        pendingMode ? 'Admin Mode Enabled' : 'Viewer Mode Enabled',
        pendingMode
          ? 'You now have access to all admin controls and features.'
          : 'Admin controls are hidden. You are viewing the app as a regular viewer. Your account role has not changed.'
      );
    } catch {
      Alert.alert('Error', 'Failed to toggle admin mode');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!profile) return;
    
    setIsUploadingAvatar(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
      
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
      const mimeType = fileExt === 'jpg' ? 'image/jpeg' : `image/${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await (supabase
        .from('profiles') as any)
        .update({ profile_image_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await refreshProfile();
      Alert.alert('Success', 'Avatar updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={[styles.text, { fontSize: 18, textAlign: 'center', marginBottom: 20 }]}>
          Profile Not Found
        </Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 }}>
          Your profile could not be loaded. This may be due to a database configuration issue.
        </Text>
        <TouchableOpacity
          style={[styles.signOutButton, { width: '100%', maxWidth: 300 }]}
          onPress={signOut}
        >
          <LogOut color="#fff" size={20} />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerBackground, { paddingTop: insets.top }]}>
        <Text style={styles.screenTitle}>Profile</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              {profile.profile_image_url ? (
                <Image 
                  source={{ uri: profile.profile_image_url }} 
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <UserIcon color="#fff" size={56} strokeWidth={1.5} />
                </View>
              )}
              <TouchableOpacity 
                style={styles.cameraButton} 
                onPress={pickImage}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Camera color="#fff" size={20} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name || 'Add your name'}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {profile.role === 'admin' ? 'Admin' : 'Viewer'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Settings</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Edit color="#2196F3" size={20} />
                </View>
                <Text style={styles.settingItemText}>{t('profile.editProfile')}</Text>
              </View>
              <ChevronRight color="#999" size={20} />
            </TouchableOpacity>
            
            <View style={styles.settingDivider} />
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#F3E5F5' }]}>
                  <Globe color="#9C27B0" size={20} />
                </View>
                <Text style={styles.settingItemText}>{t('profile.language')}</Text>
              </View>
              <ChevronRight color="#999" size={20} />
            </TouchableOpacity>
            
            <View style={styles.settingDivider} />
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Bell color="#FF9800" size={20} />
                </View>
                <Text style={styles.settingItemText}>{t('profile.notifications')}</Text>
              </View>
              <ChevronRight color="#999" size={20} />
            </TouchableOpacity>
          </View>
        </View>
        
        {profile.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Admin Controls</Text>
            <View style={styles.adminCard}>
              <View style={styles.adminModeRow}>
                <View style={styles.adminModeInfo}>
                  <View style={styles.adminModeIconWrapper}>
                    {adminModeEnabled ? (
                      <Eye color="#2196F3" size={22} />
                    ) : (
                      <EyeOff color="#999" size={22} />
                    )}
                  </View>
                  <View style={styles.adminModeText}>
                    <Text style={styles.adminModeLabel}>Admin Mode</Text>
                    <Text style={styles.adminModeStatus}>
                      {adminModeEnabled ? 'All admin features visible' : 'Viewing as regular user'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={adminModeEnabled}
                  onValueChange={handleAdminModeToggle}
                  trackColor={{ false: '#E0E0E0', true: '#2196F3' }}
                  thumbColor="#fff"
                />
              </View>
              
              {adminModeEnabled && (
                <View style={styles.adminActiveIndicator}>
                  <Text style={styles.adminActiveText}>⚡ Admin Mode Active</Text>
                </View>
              )}
            </View>
            
            {adminModeEnabled && (
              <View style={styles.adminActionsCard}>
                <TouchableOpacity
                  style={styles.adminActionItem}
                  onPress={() => router.push('/(admin)')}
                >
                  <View style={styles.adminActionLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: '#E3F2FD' }]}>
                      <LayoutDashboard color="#2196F3" size={20} />
                    </View>
                    <Text style={styles.adminActionText}>Dashboard</Text>
                  </View>
                  <ChevronRight color="#999" size={20} />
                </TouchableOpacity>
                
                <View style={styles.settingDivider} />
                
                <TouchableOpacity
                  style={styles.adminActionItem}
                  onPress={() => router.push('/(tabs)/users')}
                >
                  <View style={styles.adminActionLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: '#E8F5E9' }]}>
                      <Users color="#4CAF50" size={20} />
                    </View>
                    <Text style={styles.adminActionText}>{t('users.userManagement')}</Text>
                  </View>
                  <ChevronRight color="#999" size={20} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <LogOut color="#fff" size={20} />
          <Text style={styles.signOutButtonText}>{t('auth.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
      
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {pendingMode ? 'Enable Admin Mode?' : 'Switch to Viewer Mode?'}
            </Text>
            <Text style={styles.modalDescription}>
              {pendingMode
                ? 'This will show all admin controls and features. Your account role will not change.'
                : 'This will hide all admin controls. You\'ll see the app as a regular viewer. Your account role will not change and you can switch back anytime.'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={confirmModeChange}
              >
                <Text style={styles.modalButtonConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerBackground: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#000',
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#000',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#2196F3',
    borderRadius: 16,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#000',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingItemText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#000',
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 68,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  text: {
    fontSize: Typography.sizes.lg,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  adminCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  adminModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminModeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  adminModeIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminModeText: {
    flex: 1,
  },
  adminModeLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000',
    marginBottom: 2,
  },
  adminModeStatus: {
    fontSize: 13,
    color: '#666',
  },
  adminActiveIndicator: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
  },
  adminActiveText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#2196F3',
    textAlign: 'center',
  },
  adminActionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  adminActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  adminActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminActionText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600' as const,
  },
  modalButtonConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600' as const,
  },
});
