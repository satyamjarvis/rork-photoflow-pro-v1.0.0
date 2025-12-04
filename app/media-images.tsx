import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Image, Animated, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Colors } from '@/constants/colors';
import { ImageIcon, Upload, X, Trash2, ArrowLeft, Clock, HardDrive, Search, Plus, PenSquare } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { readFileForUpload } from '@/lib/readFileForUpload';

interface MediaItem {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  media_type: 'image' | 'video';
  storage_bucket: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export default function MediaImagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const utils = trpc.useUtils();
  const { data: images, isLoading, refetch } = trpc.media.list.useQuery({ type: 'image' });
  const createMediaMutation = trpc.media.create.useMutation({
    onSuccess: async () => {
      console.log('Image created successfully, invalidating cache');
      await utils.media.list.invalidate();
      await refetch();
    },
  });
  const updateMediaMutation = trpc.media.update.useMutation({
    onSuccess: async () => {
      console.log('Image updated, refreshing cache');
      await utils.media.list.invalidate();
      await refetch();
    },
  });
  const deleteMediaMutation = trpc.media.delete.useMutation({
    onSuccess: () => {
      utils.media.list.invalidate();
    },
  });

  React.useEffect(() => {
    if (!isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, fadeAnim]);

  const mediaCardWidth = React.useMemo(() => {
    const horizontalPadding = Spacing.lg * 2;
    const gap = 16;
    const rawWidth = (width - horizontalPadding - gap) / 2;
    return Math.max(160, rawWidth);
  }, [width]);

  const filteredImages = React.useMemo(() => {
    if (!images) {
      return [];
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return images;
    }
    return images.filter((item: MediaItem) => {
      const titleMatch = item.title.toLowerCase().includes(query);
      const descriptionMatch = item.description?.toLowerCase().includes(query) ?? false;
      return titleMatch || descriptionMatch;
    });
  }, [images, searchQuery]);

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access media library is required');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async () => {
    if (!selectedImage || !uploadTitle.trim() || !profile) {
      Alert.alert('Error', 'Please fill in title and select an image');
      return;
    }
    setIsUploading(true);
    try {
      const fileExt = selectedImage.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;
      console.log('Preparing image for upload from uri:', selectedImage);
      const { buffer, size } = await readFileForUpload(selectedImage);
      const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
      console.log('Uploading image to storage:', filePath, 'Size:', size, 'Type:', contentType);
      const { error: uploadError } = await supabase.storage
        .from('media-images')
        .upload(filePath, buffer, {
          contentType,
          upsert: false,
        });
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      console.log('Creating media item record');
      await createMediaMutation.mutateAsync({
        title: uploadTitle.trim(),
        description: uploadDescription.trim() || undefined,
        fileName,
        filePath,
        mimeType: contentType,
        mediaType: 'image',
        storageBucket: 'media-images',
        uploadedBy: profile.id,
        fileSize: size,
      });
      Alert.alert('Success', 'Image uploaded successfully');
      closeUploadModal();
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteImage = async (item: MediaItem) => {
    Alert.alert(
      'Delete Image',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMediaMutation.mutateAsync({ id: item.id });
              Alert.alert('Success', 'Image deleted successfully');
            } catch (error: any) {
              console.error('Error deleting image:', error);
              Alert.alert('Error', error.message || 'Failed to delete image');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (item: MediaItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description ?? '');
    setShowEditModal(true);
  };

  const handleUpdateImage = async () => {
    if (!editingItem) {
      return;
    }
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    try {
      await updateMediaMutation.mutateAsync({
        id: editingItem.id,
        title: editTitle.trim(),
        description: editDescription,
      });
      Alert.alert('Success', 'Image updated');
      closeEditModal();
    } catch (error: any) {
      console.error('Error updating image:', error);
      Alert.alert('Error', error.message || 'Failed to update image');
    }
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadTitle('');
    setUploadDescription('');
    setSelectedImage(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditTitle('');
    setEditDescription('');
    setEditingItem(null);
  };

  const getImageUrl = (item: MediaItem) => {
    const { data } = supabase.storage
      .from(item.storage_bucket)
      .getPublicUrl(item.file_path);
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top }]}> 
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Image Library</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Image Library</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setShowUploadModal(true)}
            style={styles.addButton}
            testID="image-add-button"
          >
            <Plus color="#0B1220" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search color="#6B7280" size={20} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search images..."
          placeholderTextColor="#9CA3AF"
          testID="image-search-input"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X color="#6B7280" size={20} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {!filteredImages || filteredImages.length === 0 ? (
          <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
            <View style={styles.emptyIcon}>
              <ImageIcon color="#9CA3AF" size={64} />
            </View>
            <Text style={styles.emptyTitle}>No Images Yet</Text>
            <Text style={styles.emptyText}>Upload your first image to get started</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowUploadModal(true)}
              testID="image-empty-upload"
            >
              <Upload color="#fff" size={20} />
              <Text style={styles.emptyButtonText}>Upload Image</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.grid, { opacity: fadeAnim }]}>
            {filteredImages.map((item: MediaItem) => (
              <View key={item.id} style={[styles.mediaCard, { width: mediaCardWidth }]}>
                <View style={styles.mediaVisual}>
                  <Image
                    source={{ uri: getImageUrl(item) }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.65)"]}
                    style={styles.visualGradient}
                  />
                  <View style={styles.visualBadges}>
                    <View style={styles.badgePrimary}>
                      <Text style={styles.badgePrimaryText}>IMAGE</Text>
                    </View>
                    <View style={styles.badgeSecondary}>
                      <Clock color="#E5E7EB" size={12} />
                      <Text style={styles.badgeSecondaryText}>{formatDate(item.created_at)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.editFab}
                    onPress={() => openEditModal(item)}
                    testID={`image-edit-${item.id}`}
                  >
                    <PenSquare color="#0F172A" size={18} />
                  </TouchableOpacity>
                </View>
                <View style={styles.imageInfo}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.titleBlock}>
                      <Text style={styles.imageTitle} numberOfLines={1}>{item.title}</Text>
                      {item.description && (
                        <Text style={styles.imageDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <HardDrive color="#6B7280" size={14} />
                      <Text style={styles.metaText}>{formatFileSize(item.file_size)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock color="#6B7280" size={14} />
                      <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
                    </View>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteImage(item)}
                      testID={`image-delete-${item.id}`}
                    >
                      <Trash2 color={Colors.error} size={18} />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {showUploadModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Image</Text>
              <TouchableOpacity onPress={closeUploadModal}>
                <X color="#000" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={pickImage}
                testID="image-picker"
              >
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                ) : (
                  <>
                    <ImageIcon color="#9CA3AF" size={48} />
                    <Text style={styles.imagePickerText}>Tap to select image</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={uploadTitle}
                  onChangeText={setUploadTitle}
                  placeholder="Enter image title"
                  placeholderTextColor="#9CA3AF"
                  testID="image-upload-title"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={uploadDescription}
                  onChangeText={setUploadDescription}
                  placeholder="Enter image description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  testID="image-upload-description"
                />
              </View>

              <TouchableOpacity
                style={[styles.uploadSubmitButton, isUploading && styles.uploadSubmitButtonDisabled]}
                onPress={uploadImage}
                disabled={isUploading}
                testID="image-upload-submit"
              >
                {isUploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Upload color="#fff" size={20} />
                    <Text style={styles.uploadSubmitButtonText}>Upload Image</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {showEditModal && editingItem && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Image</Text>
              <TouchableOpacity onPress={closeEditModal}>
                <X color="#000" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Enter image title"
                  placeholderTextColor="#9CA3AF"
                  testID="image-edit-title"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Enter image description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  testID="image-edit-description"
                />
              </View>

              <TouchableOpacity
                style={[styles.uploadSubmitButton, updateMediaMutation.isPending && styles.uploadSubmitButtonDisabled]}
                onPress={handleUpdateImage}
                disabled={updateMediaMutation.isPending}
                testID="image-update-submit"
              >
                {updateMediaMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <PenSquare color="#fff" size={20} />
                    <Text style={styles.uploadSubmitButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  header: {
    backgroundColor: '#0B1220',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.white,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyButtonText: {
    color: '#0B1220',
    fontSize: 16,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  mediaCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mediaVisual: {
    position: 'relative',
    width: '100%',
    height: 180,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  visualGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  visualBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgePrimary: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgePrimaryText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 1,
  },
  badgeSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  badgeSecondaryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
  },
  editFab: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageInfo: {
    padding: 16,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleBlock: {
    flex: 1,
  },
  imageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  imageDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.error,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0B1220',
  },
  modalScroll: {
    flex: 1,
    padding: Spacing.lg,
  },
  imagePicker: {
    width: '100%',
    height: 220,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  imagePickerText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: '#1A1A1A',
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  uploadSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0B1220',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  uploadSubmitButtonDisabled: {
    opacity: 0.6,
  },
  uploadSubmitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
