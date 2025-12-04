import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Spacing, Colors } from '@/constants/colors';
import { Video as VideoIcon, ArrowLeft, Search, X, Upload, Trash2, Clock, HardDrive, PenSquare, Play, Pause } from 'lucide-react-native';
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

export default function MediaVideosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const utils = trpc.useUtils();
  const { data: videos, isLoading, refetch } = trpc.media.list.useQuery({ type: 'video' });
  const createMediaMutation = trpc.media.create.useMutation({
    onSuccess: async () => {
      console.log('Video created successfully, refetching list');
      await utils.media.list.invalidate();
      await refetch();
    },
  });
  const updateMediaMutation = trpc.media.update.useMutation({
    onSuccess: async () => {
      console.log('Video updated successfully');
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

  const filteredVideos = React.useMemo(() => {
    if (!videos) {
      return [];
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return videos;
    }
    return videos.filter((item: MediaItem) => {
      const titleMatch = item.title.toLowerCase().includes(query);
      const descriptionMatch = item.description?.toLowerCase().includes(query) ?? false;
      return titleMatch || descriptionMatch;
    });
  }, [videos, searchQuery]);

  const pickVideo = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access media library is required');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.High,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedVideo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const uploadVideo = async () => {
    if (!selectedVideo || !uploadTitle.trim() || !profile) {
      Alert.alert('Error', 'Please fill in title and select a video');
      return;
    }
    setIsUploading(true);
    try {
      const fileExt = selectedVideo.split('.').pop()?.toLowerCase() || 'mp4';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;
      console.log('Preparing video for upload from uri:', selectedVideo);
      const { buffer, size } = await readFileForUpload(selectedVideo);
      const contentType = `video/${fileExt}`;
      console.log('Uploading video to storage:', filePath, 'Size:', size, 'Type:', contentType);
      const { error: uploadError } = await supabase.storage
        .from('media-videos')
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
        mediaType: 'video',
        storageBucket: 'media-videos',
        uploadedBy: profile.id,
        fileSize: size,
      });
      Alert.alert('Success', 'Video uploaded successfully');
      closeUploadModal();
    } catch (error: any) {
      console.error('Error uploading video:', error);
      Alert.alert('Error', error.message || 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteVideo = async (item: MediaItem) => {
    Alert.alert(
      'Delete Video',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMediaMutation.mutateAsync({ id: item.id });
              Alert.alert('Success', 'Video deleted successfully');
            } catch (error: any) {
              console.error('Error deleting video:', error);
              Alert.alert('Error', error.message || 'Failed to delete video');
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

  const handleUpdateVideo = async () => {
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
      Alert.alert('Success', 'Video updated');
      closeEditModal();
    } catch (error: any) {
      console.error('Error updating video:', error);
      Alert.alert('Error', error.message || 'Failed to update video');
    }
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadTitle('');
    setUploadDescription('');
    setSelectedVideo(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditTitle('');
    setEditDescription('');
    setEditingItem(null);
  };

  const getVideoUrl = (item: MediaItem) => {
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
          <Text style={styles.headerTitle}>Video Library</Text>
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
      <StatusBar style="light" backgroundColor="#050914" />
      <View style={[styles.header, { paddingTop: insets.top }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Library</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setShowUploadModal(true)}
            style={styles.addButton}
            testID="video-add-button"
          >
            <Upload color="#0F172A" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search color="#6B7280" size={20} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search videos..."
          placeholderTextColor="#9CA3AF"
          testID="video-search-input"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X color="#6B7280" size={20} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {!filteredVideos || filteredVideos.length === 0 ? (
          <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
            <View style={styles.emptyIcon}>
              <VideoIcon color="#9CA3AF" size={64} />
            </View>
            <Text style={styles.emptyTitle}>No Videos Yet</Text>
            <Text style={styles.emptyText}>Upload your first video to get started</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowUploadModal(true)}
              testID="video-empty-upload"
            >
              <Upload color="#fff" size={20} />
              <Text style={styles.emptyButtonText}>Upload Video</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.grid, { opacity: fadeAnim }]}>
            {filteredVideos.map((item: MediaItem) => (
              <View key={item.id} style={styles.videoCard}>
                <View style={styles.videoVisualWrapper}>
                  <VideoCardPlayer uri={getVideoUrl(item)} testID={`video-player-${item.id}`} />
                  <LinearGradient
                    pointerEvents="none"
                    colors={["rgba(15,23,42,0.05)", "rgba(15,23,42,0.6)"]}
                    style={styles.videoGradient}
                  />
                  <View style={styles.visualBadges}>
                    <View style={styles.badgePrimary}>
                      <Text style={styles.badgePrimaryText}>VIDEO</Text>
                    </View>
                    <View style={styles.badgeSecondary}>
                      <Clock color="#E5E7EB" size={12} />
                      <Text style={styles.badgeSecondaryText}>{formatDate(item.created_at)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.editFab}
                    onPress={() => openEditModal(item)}
                    testID={`video-edit-${item.id}`}
                  >
                    <PenSquare color="#0F172A" size={18} />
                  </TouchableOpacity>
                </View>
                <View style={styles.videoInfo}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.titleBlock}>
                      <Text style={styles.videoTitle} numberOfLines={1}>{item.title}</Text>
                      {item.description && (
                        <Text style={styles.videoDescription} numberOfLines={2}>
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
                      onPress={() => deleteVideo(item)}
                      testID={`video-delete-${item.id}`}
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
              <Text style={styles.modalTitle}>Upload Video</Text>
              <TouchableOpacity onPress={closeUploadModal}>
                <X color="#000" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={styles.videoPicker}
                onPress={pickVideo}
                testID="video-picker"
              >
                {selectedVideo ? (
                  <View style={styles.selectedVideoContainer}>
                    <VideoIcon color="#000" size={48} />
                    <Text style={styles.selectedVideoText}>Video selected</Text>
                  </View>
                ) : (
                  <>
                    <VideoIcon color="#9CA3AF" size={48} />
                    <Text style={styles.videoPickerText}>Tap to select video</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={uploadTitle}
                  onChangeText={setUploadTitle}
                  placeholder="Enter video title"
                  placeholderTextColor="#9CA3AF"
                  testID="video-upload-title"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={uploadDescription}
                  onChangeText={setUploadDescription}
                  placeholder="Enter video description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  testID="video-upload-description"
                />
              </View>

              <TouchableOpacity
                style={[styles.uploadSubmitButton, isUploading && styles.uploadSubmitButtonDisabled]}
                onPress={uploadVideo}
                disabled={isUploading}
                testID="video-upload-submit"
              >
                {isUploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Upload color="#fff" size={20} />
                    <Text style={styles.uploadSubmitButtonText}>Upload Video</Text>
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
              <Text style={styles.modalTitle}>Edit Video</Text>
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
                  placeholder="Enter video title"
                  placeholderTextColor="#9CA3AF"
                  testID="video-edit-title"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Enter video description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  testID="video-edit-description"
                />
              </View>

              <TouchableOpacity
                style={[styles.uploadSubmitButton, updateMediaMutation.isPending && styles.uploadSubmitButtonDisabled]}
                onPress={handleUpdateVideo}
                disabled={updateMediaMutation.isPending}
                testID="video-update-submit"
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

function formatPlaybackTime(value: number) {
  const seconds = Math.floor(value / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const minsString = mins < 10 ? `0${mins}` : `${mins}`;
  const secsString = secs < 10 ? `0${secs}` : `${secs}`;
  return `${minsString}:${secsString}`;
}

const VideoCardPlayer = React.memo(({ uri, testID }: { uri: string; testID: string }) => {
  const videoRef = React.useRef<Video | null>(null);
  const [status, setStatus] = useState({ position: 0, duration: 0, isPlaying: false });
  const overlayOpacity = React.useRef(new Animated.Value(1)).current;

  const handleStatusUpdate = React.useCallback((playbackStatus: AVPlaybackStatus) => {
    if (!playbackStatus.isLoaded) {
      return;
    }
    setStatus({
      position: playbackStatus.positionMillis ?? 0,
      duration: playbackStatus.durationMillis ?? 0,
      isPlaying: playbackStatus.isPlaying ?? false,
    });
  }, []);

  React.useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: status.isPlaying ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [overlayOpacity, status.isPlaying]);

  const togglePlayback = React.useCallback(async () => {
    if (!videoRef.current) {
      return;
    }
    try {
      const currentStatus = await videoRef.current.getStatusAsync();
      if (!currentStatus.isLoaded) {
        return;
      }
      if (currentStatus.isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      Alert.alert('Playback Error', 'Failed to control video');
    }
  }, []);

  React.useEffect(() => {
    return () => {
      videoRef.current?.pauseAsync().catch(() => null);
    };
  }, []);

  const progress = status.duration ? status.position / status.duration : 0;

  return (
    <View style={styles.playerContainer}>
      <Video
        ref={(ref) => {
          videoRef.current = ref;
        }}
        source={{ uri }}
        style={styles.videoPlayer}
        resizeMode={ResizeMode.COVER}
        useNativeControls={false}
        isLooping
        shouldPlay={false}
        onPlaybackStatusUpdate={handleStatusUpdate}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(15,23,42,0.7)", "rgba(15,23,42,0)"]}
        style={styles.playerGradient}
      />
      <TouchableOpacity 
        style={styles.playOverlayTouchable} 
        activeOpacity={1}
        onPress={togglePlayback}
      >
        <Animated.View style={[styles.playOverlay, { opacity: overlayOpacity }]}>
          <View style={styles.playButton} testID={testID}>
            {status.isPlaying ? <Pause color="#0F172A" size={20} /> : <Play color="#0F172A" size={20} />}
          </View>
        </Animated.View>
      </TouchableOpacity>
      <View style={styles.playerBottomRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(progress, 1) * 100}%` }]} />
        </View>
        <Text style={styles.timeLabel}>{`${formatPlaybackTime(status.position)} / ${status.duration ? formatPlaybackTime(status.duration) : '00:00'}`}</Text>
      </View>
    </View>
  );
});

VideoCardPlayer.displayName = 'VideoCardPlayer';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050914',
  },
  header: {
    backgroundColor: '#050914',
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
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    backgroundColor: '#E5E7EB',
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
    color: '#050914',
    fontSize: 16,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  videoCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: Spacing.lg,
  },
  videoVisualWrapper: {
    position: 'relative',
    width: '100%',
    height: 220,
    overflow: 'hidden',
  },
  videoGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoInfo: {
    padding: 18,
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
  videoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  videoDescription: {
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
    color: '#050914',
  },
  modalScroll: {
    flex: 1,
    padding: Spacing.lg,
  },
  videoPicker: {
    width: '100%',
    height: 220,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  selectedVideoContainer: {
    alignItems: 'center',
  },
  selectedVideoText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    marginTop: 8,
  },
  videoPickerText: {
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
    backgroundColor: '#050914',
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
  playerContainer: {
    flex: 1,
    height: '100%',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  playerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  playOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerBottomRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.white,
  },
  timeLabel: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
});
