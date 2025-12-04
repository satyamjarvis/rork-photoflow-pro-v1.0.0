import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Image, Animated, useWindowDimensions } from 'react-native';
import { Stack, useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Colors } from '@/constants/colors';
import { ImageIcon, Upload, X, Trash2, ArrowLeft, Search, Plus, PenSquare, BarChart3, Eye, EyeOff, Clock } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';

interface PortfolioItem {
  id: string;
  title: string;
  image_url: string;
  description: string | null;
  order_index: number;
  created_at: string;
  visible: boolean;
}

const MANAGEMENT_STORAGE_BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';

const resolveManagementImageUrl = (value: string) => {
  if (!value) {
    return '';
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  const normalized = value.replace(/^storage\/v1\/object\/public\//i, '').replace(/^\//, '');
  if (!MANAGEMENT_STORAGE_BASE_URL) {
    return normalized;
  }
  return `${MANAGEMENT_STORAGE_BASE_URL}/storage/v1/object/public/${normalized}`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function PortfolioManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ editId?: string | string[] }>();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const deepLinkEditId = React.useMemo(() => {
    if (!params?.editId) {
      return undefined;
    }
    return Array.isArray(params.editId) ? params.editId[0] : params.editId;
  }, [params?.editId]);
  const hasHandledDeepLinkRef = React.useRef(false);

  const utils = trpc.useUtils();
  const { data: items, isLoading, refetch } = trpc.portfolio.list.useQuery(
    { includeHidden: true },
    {
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    }
  );
  const updatePortfolioMutation = trpc.portfolio.update.useMutation({
    onSuccess: async () => {
      console.log('Portfolio item updated, refreshing cache');
      await utils.portfolio.list.invalidate();
      await utils.portfolio.stats.invalidate();
      await utils.dashboard.stats.invalidate();
      setTimeout(() => {
        refetch();
      }, 300);
    },
  });
  const deletePortfolioMutation = trpc.portfolio.delete.useMutation({
    onSuccess: () => {
      utils.portfolio.list.invalidate();
      utils.portfolio.stats.invalidate();
      utils.dashboard.stats.invalidate();
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

  const portfolioCardWidth = React.useMemo(() => {
    const horizontalPadding = Spacing.lg * 2;
    const gap = 16;
    const rawWidth = (width - horizontalPadding - gap) / 2;
    return Math.max(160, rawWidth);
  }, [width]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('Portfolio management screen focused, refetching data');
      refetch();
    }, [refetch])
  );

  const filteredItems = React.useMemo(() => {
    if (!items) {
      return [];
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return items;
    }
    return items.filter((item: PortfolioItem) => {
      const titleMatch = item.title.toLowerCase().includes(query);
      const descriptionMatch = item.description?.toLowerCase().includes(query) ?? false;
      return titleMatch || descriptionMatch;
    });
  }, [items, searchQuery]);

  const deleteItem = async (item: PortfolioItem) => {
    Alert.alert(
      'Delete Portfolio Item',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePortfolioMutation.mutateAsync({ id: item.id });
              Alert.alert('Success', 'Portfolio item deleted successfully');
            } catch (error: any) {
              console.error('Error deleting portfolio item:', error);
              Alert.alert('Error', error.message || 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const toggleVisibility = async (item: PortfolioItem) => {
    try {
      await updatePortfolioMutation.mutateAsync({
        id: item.id,
        visible: !item.visible,
      });
    } catch (error: any) {
      console.error('Error toggling visibility:', error);
      Alert.alert('Error', error.message || 'Failed to toggle visibility');
    }
  };

  const openEditModal = (item: PortfolioItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description ?? '');
    setShowEditModal(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItem) {
      return;
    }
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    try {
      await updatePortfolioMutation.mutateAsync({
        id: editingItem.id,
        title: editTitle.trim(),
        description: editDescription,
      });
      Alert.alert('Success', 'Portfolio item updated');
      closeEditModal();
    } catch (error: any) {
      console.error('Error updating item:', error);
      Alert.alert('Error', error.message || 'Failed to update item');
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditTitle('');
    setEditDescription('');
    setEditingItem(null);
  };

  React.useEffect(() => {
    hasHandledDeepLinkRef.current = false;
  }, [deepLinkEditId]);

  React.useEffect(() => {
    if (!items || !deepLinkEditId || hasHandledDeepLinkRef.current) {
      return;
    }
    const targetItem = (items as PortfolioItem[]).find((item) => item.id === deepLinkEditId);
    if (!targetItem) {
      console.warn('[PortfolioManagement] editId from params not found', deepLinkEditId);
      return;
    }
    console.log('[PortfolioManagement] Opening edit modal for deep link id', deepLinkEditId);
    setEditingItem(targetItem);
    setEditTitle(targetItem.title);
    setEditDescription(targetItem.description ?? '');
    setShowEditModal(true);
    hasHandledDeepLinkRef.current = true;
  }, [items, deepLinkEditId]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top }]}> 
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Portfolio</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
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
        <Text style={styles.headerTitle}>Portfolio</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => router.push('/portfolio-stats' as any)}
            style={styles.statsButton}
            testID="portfolio-stats-button"
          >
            <BarChart3 color="#0F172A" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/portfolio-upload' as any)}
            style={styles.addButton}
            testID="portfolio-add-button"
          >
            <Plus color="#0F172A" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search color="#9CA3AF" size={20} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search portfolio..."
          placeholderTextColor="#6B7280"
          testID="portfolio-search-input"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X color="#9CA3AF" size={20} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {!filteredItems || filteredItems.length === 0 ? (
          <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
            <View style={styles.emptyIcon}>
              <ImageIcon color="#9CA3AF" size={64} />
            </View>
            <Text style={styles.emptyTitle}>No Portfolio Items</Text>
            <Text style={styles.emptyText}>Upload your first portfolio item to get started</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/portfolio-upload' as any)}
              testID="portfolio-empty-upload"
            >
              <Upload color="#0F172A" size={20} />
              <Text style={styles.emptyButtonText}>Upload Item</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.grid, { opacity: fadeAnim }]}>
            {filteredItems.map((item: PortfolioItem) => (
              <View key={item.id} style={[styles.itemCard, { width: portfolioCardWidth }]}>
                <View style={styles.itemVisual}>
                  <Image
                    source={{ uri: resolveManagementImageUrl(item.image_url) }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.65)"]}
                    style={styles.visualGradient}
                  />
                  <View style={styles.visualBadges}>
                    <View style={styles.badgePrimary}>
                      <Text style={styles.badgePrimaryText}>PORTFOLIO</Text>
                    </View>
                  </View>
                  <View style={styles.visualActions}>
                    <TouchableOpacity
                      style={styles.visibilityButton}
                      onPress={() => toggleVisibility(item)}
                      testID={`portfolio-visibility-${item.id}`}
                    >
                      {item.visible ? (
                        <Eye color="#fff" size={18} />
                      ) : (
                        <EyeOff color="#fff" size={18} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.editFab}
                    onPress={() => openEditModal(item)}
                    testID={`portfolio-edit-${item.id}`}
                  >
                    <PenSquare color="#0F172A" size={18} />
                  </TouchableOpacity>
                </View>
                <View style={styles.itemInfo}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.titleBlock}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                      {item.description && (
                        <Text style={styles.itemDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.statsColumn}>
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        {item.visible ? (
                          <Eye color="#6B7280" size={14} />
                        ) : (
                          <EyeOff color="#6B7280" size={14} />
                        )}
                        <Text style={styles.metaText}>{item.visible ? 'Visible' : 'Hidden'}</Text>
                      </View>
                    </View>
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Clock color="#6B7280" size={14} />
                        <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteItem(item)}
                      testID={`portfolio-delete-${item.id}`}
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

      {showEditModal && editingItem && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Portfolio Item</Text>
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
                  placeholder="Enter title"
                  placeholderTextColor="#9CA3AF"
                  testID="portfolio-edit-title"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Enter description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  testID="portfolio-edit-description"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, updatePortfolioMutation.isPending && styles.submitButtonDisabled]}
                onPress={handleUpdateItem}
                disabled={updatePortfolioMutation.isPending}
                testID="portfolio-update-submit"
              >
                {updatePortfolioMutation.isPending ? (
                  <ActivityIndicator color="#0F172A" />
                ) : (
                  <>
                    <PenSquare color="#0F172A" size={20} />
                    <Text style={styles.submitButtonText}>Save Changes</Text>
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
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  statsButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '700' as const,
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
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  itemCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  itemVisual: {
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
  visualActions: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  visibilityButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
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
  itemInfo: {
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
  itemTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
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
    fontWeight: '600' as const,
    color: Colors.error,
  },
  visualBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
    fontWeight: '700' as const,
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
    fontWeight: '600' as const,
    color: Colors.white,
  },
  statsColumn: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '700' as const,
    color: '#0F172A',
  },
  modalScroll: {
    flex: 1,
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
