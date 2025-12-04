import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Image, StatusBar } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Colors } from '@/constants/colors';
import { ImageIcon, Upload, X, ArrowLeft, FolderOpen, Smartphone } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { readFileForUpload } from '@/lib/readFileForUpload';

const PRIMARY_PORTFOLIO_BUCKET = process.env.EXPO_PUBLIC_PORTFOLIO_BUCKET ?? 'portfolio-images';
const MEDIA_LIBRARY_BUCKET = process.env.EXPO_PUBLIC_MEDIA_BUCKET ?? 'media-images';

interface MediaItem {
  id: string;
  title: string;
  file_path: string;
  storage_bucket: string;
}

export default function PortfolioUploadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadMethod, setShowUploadMethod] = useState(true);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  const utils = trpc.useUtils();
  const { data: mediaItems } = trpc.media.list.useQuery({ type: 'image' });
  const createPortfolioMutation = trpc.portfolio.create.useMutation({
    onSuccess: async () => {
      console.log('Portfolio item created successfully');
      await utils.portfolio.list.invalidate();
      await utils.portfolio.stats.invalidate();
    },
  });

  const pickImageFromDevice = async () => {
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
        setShowUploadMethod(false);
        setShowMediaLibrary(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const selectFromMediaLibrary = () => {
    setShowMediaLibrary(true);
    setShowUploadMethod(false);
  };

  const handleMediaItemSelect = (item: MediaItem) => {
    const { data } = supabase.storage.from(item.storage_bucket).getPublicUrl(item.file_path);
    setSelectedImage(data.publicUrl);
    setUploadTitle(item.title);
    setShowMediaLibrary(false);
  };

  const getImageUrl = (item: MediaItem) => {
    const { data } = supabase.storage
      .from(item.storage_bucket)
      .getPublicUrl(item.file_path);
    return data.publicUrl;
  };

  const uploadPortfolioItem = async () => {
    if (!selectedImage || !uploadTitle.trim() || !profile) {
      Alert.alert('Error', 'Please fill in title and select an image');
      return;
    }
    setIsUploading(true);
    try {
      let imageUrl = selectedImage;
      
      if (!selectedImage.startsWith('http')) {
        const fileExt = selectedImage.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${profile.id}/${fileName}`;
        console.log('Preparing image for upload from uri:', selectedImage);
        const { buffer, size } = await readFileForUpload(selectedImage);
        const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
        console.log('Uploading image to storage candidates:', [PRIMARY_PORTFOLIO_BUCKET, MEDIA_LIBRARY_BUCKET], filePath, 'Size:', size, 'Type:', contentType);

        const attemptUpload = async (bucketId: string) => {
          const { error: uploadError } = await supabase.storage
            .from(bucketId)
            .upload(filePath, buffer, {
              contentType,
              upsert: false,
            });
          if (uploadError) {
            console.error(`[PortfolioUpload] Upload error to ${bucketId}:`, uploadError);
            const message = uploadError.message?.toLowerCase() ?? '';
            if (message.includes('bucket not found')) {
              return { success: false, missingBucket: true as const };
            }
            throw uploadError;
          }
          const { data } = supabase.storage.from(bucketId).getPublicUrl(filePath);
          return { success: true as const, missingBucket: false, publicUrl: data.publicUrl, bucketId };
        };

        const bucketCandidates = [PRIMARY_PORTFOLIO_BUCKET, MEDIA_LIBRARY_BUCKET].filter((bucket, index, arr) => bucket && arr.indexOf(bucket) === index);
        let uploadResult: Awaited<ReturnType<typeof attemptUpload>> | null = null;

        for (const bucketId of bucketCandidates) {
          uploadResult = await attemptUpload(bucketId);
          if (uploadResult.success) {
            break;
          }
        }

        if (!uploadResult || !uploadResult.success) {
          throw new Error(`No available storage bucket for portfolio uploads. Please run supabase/portfolio-storage.sql to provision "${PRIMARY_PORTFOLIO_BUCKET}".`);
        }

        if (uploadResult.bucketId !== PRIMARY_PORTFOLIO_BUCKET) {
          console.warn(`[PortfolioUpload] Using fallback bucket ${uploadResult.bucketId} instead of ${PRIMARY_PORTFOLIO_BUCKET}`);
          Alert.alert(
            'Storage Warning',
            `Primary portfolio bucket "${PRIMARY_PORTFOLIO_BUCKET}" is missing. The image was stored in "${uploadResult.bucketId}" instead. Run supabase/portfolio-storage.sql to restore the dedicated bucket.`,
          );
        }

        const resolvedPublicUrl = uploadResult.publicUrl;
        if (!resolvedPublicUrl) {
          throw new Error('Uploaded image is missing a public URL. Please try again.');
        }
        imageUrl = resolvedPublicUrl;
      }
      
      console.log('Creating portfolio item record');
      await createPortfolioMutation.mutateAsync({
        title: uploadTitle.trim(),
        description: uploadDescription.trim() || undefined,
        image_url: imageUrl,
        order_index: 0,
        visible: true,
      });
      Alert.alert('Success', 'Portfolio item created successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error creating portfolio item:', error);
      Alert.alert('Error', error.message || 'Failed to create portfolio item');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedImage(null);
    setUploadTitle('');
    setUploadDescription('');
    setShowUploadMethod(true);
    setShowMediaLibrary(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Portfolio</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {showUploadMethod ? (
          <View style={styles.methodContainer}>
            <Text style={styles.methodTitle}>Choose Upload Method</Text>
            <Text style={styles.methodSubtitle}>Select where to upload your portfolio image from</Text>
            
            <TouchableOpacity
              style={styles.methodCard}
              onPress={pickImageFromDevice}
              testID="upload-from-device"
            >
              <View style={styles.methodIcon}>
                <Smartphone color="#0F172A" size={32} />
              </View>
              <View style={styles.methodContent}>
                <Text style={styles.methodCardTitle}>Upload from Device</Text>
                <Text style={styles.methodCardDescription}>
                  Pick an image from your device gallery
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.methodCard}
              onPress={selectFromMediaLibrary}
              testID="upload-from-media-library"
            >
              <View style={styles.methodIcon}>
                <FolderOpen color="#0F172A" size={32} />
              </View>
              <View style={styles.methodContent}>
                <Text style={styles.methodCardTitle}>Choose from Media Library</Text>
                <Text style={styles.methodCardDescription}>
                  Select an image from your uploaded media
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : showMediaLibrary ? (
          <View style={styles.libraryContainer}>
            <View style={styles.libraryHeader}>
              <Text style={styles.libraryTitle}>Select from Media Library</Text>
              <TouchableOpacity onPress={resetUpload}>
                <Text style={styles.backLink}>Back</Text>
              </TouchableOpacity>
            </View>
            {!mediaItems || mediaItems.length === 0 ? (
              <View style={styles.emptyLibrary}>
                <ImageIcon color="#9CA3AF" size={48} />
                <Text style={styles.emptyLibraryText}>No images in media library</Text>
                <TouchableOpacity
                  style={styles.emptyLibraryButton}
                  onPress={() => router.push('/media-images' as any)}
                >
                  <Text style={styles.emptyLibraryButtonText}>Go to Media Library</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.mediaGrid}>
                {mediaItems.map((item: MediaItem) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.mediaItem}
                    onPress={() => handleMediaItemSelect(item)}
                    testID={`media-item-${item.id}`}
                  >
                    <Image
                      source={{ uri: getImageUrl(item) }}
                      style={styles.mediaItemImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.mediaItemTitle} numberOfLines={1}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={resetUpload}
              testID="image-picker"
            >
              {selectedImage ? (
                <>
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                  <TouchableOpacity style={styles.changeImageButton} onPress={resetUpload}>
                    <X color="#fff" size={16} />
                    <Text style={styles.changeImageText}>Change Image</Text>
                  </TouchableOpacity>
                </>
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
                placeholder="Enter title"
                placeholderTextColor="#9CA3AF"
                testID="portfolio-upload-title"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={uploadDescription}
                onChangeText={setUploadDescription}
                placeholder="Enter description"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                testID="portfolio-upload-description"
              />
            </View>

            <TouchableOpacity
              style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
              onPress={uploadPortfolioItem}
              disabled={isUploading}
              testID="portfolio-upload-submit"
            >
              {isUploading ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <>
                  <Upload color="#0F172A" size={20} />
                  <Text style={styles.uploadButtonText}>Create Portfolio Item</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    backgroundColor: '#0F172A',
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
    fontWeight: '700' as const,
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  methodContainer: {
    flex: 1,
    paddingTop: 40,
  },
  methodTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  methodSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 40,
    textAlign: 'center',
  },
  methodCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  methodIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodContent: {
    flex: 1,
  },
  methodCardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  methodCardDescription: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  libraryContainer: {
    flex: 1,
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  libraryTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  backLink: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  emptyLibrary: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyLibraryText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyLibraryButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyLibraryButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaItem: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mediaItemImage: {
    width: '100%',
    height: 140,
  },
  mediaItemTitle: {
    padding: 12,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  imagePicker: {
    width: '100%',
    height: 280,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  changeImageButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  changeImageText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  imagePickerText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
