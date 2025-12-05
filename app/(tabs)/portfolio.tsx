import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  X,
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  created_at: string;
  order_index: number;
}

const STORAGE_BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';

const resolvePortfolioImageUrl = (value: string) => {
  if (!value) {
    return '';
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  const normalized = value.replace(/^storage\/v1\/object\/public\//i, '').replace(/^\//, '');
  if (!STORAGE_BASE_URL) {
    return normalized;
  }
  return `${STORAGE_BASE_URL}/storage/v1/object/public/${normalized}`;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_GAP = 12;
const HORIZONTAL_PADDING = 32;
const COLUMN_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING - COLUMN_GAP) / 2;

interface MasonryItem extends PortfolioItem {
  height: number;
  column: number;
}

const PortfolioCard = React.memo(
  ({
    item,
    onPress,
  }: {
    item: MasonryItem;
    onPress: (item: PortfolioItem) => void;
  }) => (
    <TouchableOpacity
      activeOpacity={0.95}
      style={[styles.masonryCard, { height: item.height }]}
      onPress={() => onPress(item)}
      testID={`portfolio-card-${item.id}`}
    >
      <Image
        source={{ uri: resolvePortfolioImageUrl(item.image_url) }}
        style={styles.masonryImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
  )
);

PortfolioCard.displayName = 'PortfolioCard';

const LightboxViewer = React.memo(
  ({
    visible,
    items,
    currentIndex,
    onClose,
    onNext,
    onPrevious,
    imageDimensions,
  }: {
    visible: boolean;
    items: PortfolioItem[];
    currentIndex: number;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
    imageDimensions: Record<string, { width: number; height: number }>;
  }) => {
    const currentItem = items[currentIndex];
    const canGoNext = currentIndex < items.length - 1;
    const canGoPrevious = currentIndex > 0;
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const baseWidth = Math.min(screenWidth - 24, 900);
    const fallbackHeight = screenHeight * 0.65;
    const dims = currentItem ? imageDimensions[currentItem.id] : undefined;
    const aspectRatio = dims ? dims.width / dims.height : 1.6;
    const targetSizes = React.useMemo(() => {
      const widthFirstHeight = baseWidth / aspectRatio;
      if (widthFirstHeight <= fallbackHeight) {
        return { width: baseWidth, height: widthFirstHeight };
      }
      const adjustedHeight = fallbackHeight;
      const adjustedWidth = adjustedHeight * aspectRatio;
      return { width: adjustedWidth, height: adjustedHeight };
    }, [aspectRatio, baseWidth, fallbackHeight]);
    const widthAnim = React.useRef(new Animated.Value(targetSizes.width)).current;
    const heightAnim = React.useRef(new Animated.Value(targetSizes.height)).current;
    const imageScale = React.useRef(new Animated.Value(0.94)).current;
    const imageOpacity = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      Animated.parallel([
        Animated.spring(widthAnim, {
          toValue: targetSizes.width,
          useNativeDriver: false,
          damping: 25,
          stiffness: 220,
        }),
        Animated.spring(heightAnim, {
          toValue: targetSizes.height,
          useNativeDriver: false,
          damping: 25,
          stiffness: 220,
        }),
      ]).start();
    }, [targetSizes.height, targetSizes.width, heightAnim, widthAnim]);

    React.useEffect(() => {
      imageScale.setValue(0.94);
      imageOpacity.setValue(0);
    }, [currentItem?.id, imageOpacity, imageScale]);

    const handleImageLoaded = React.useCallback(() => {
      Animated.parallel([
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.spring(imageScale, {
          toValue: 1,
          damping: 16,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }, [imageOpacity, imageScale]);

    if (!currentItem) return null;

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={styles.lightboxContainer}>
          <View style={styles.lightboxBackground} />

          <View style={styles.lightboxTopBar}>
            <Text style={styles.lightboxTopTitle}>Portfolio</Text>
            <TouchableOpacity
              style={styles.lightboxCloseButton}
              onPress={onClose}
              activeOpacity={0.8}
              testID="lightbox-close"
            >
              <X color="#0B111A" size={20} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <View style={styles.lightboxBody}>
            <Animated.View
              style={[
                styles.lightboxImageShell,
                { width: widthAnim, height: heightAnim },
              ]}
            >
              <Animated.View
                style={[
                  styles.lightboxImageInner,
                  {
                    opacity: imageOpacity,
                    transform: [{ scale: imageScale }],
                  },
                ]}
              >
                <Image
                  source={{ uri: resolvePortfolioImageUrl(currentItem.image_url) }}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                  onLoad={handleImageLoaded}
                />
              </Animated.View>
            </Animated.View>

            <View style={styles.lightboxMetaCard}>
              <Text style={styles.lightboxCounter}>{`${currentIndex + 1} / ${items.length}`}</Text>
              <Text style={styles.lightboxTitle}>{currentItem.title}</Text>
              {currentItem.description ? (
                <Text style={styles.lightboxDescription}>{currentItem.description}</Text>
              ) : null}
            </View>
          </View>

          {canGoPrevious && (
            <TouchableOpacity
              style={[styles.lightboxArrow, styles.lightboxArrowLeft]}
              onPress={onPrevious}
              activeOpacity={0.8}
              testID="lightbox-previous"
            >
              <ChevronLeft color="#FFFFFF" size={28} strokeWidth={2.4} />
            </TouchableOpacity>
          )}

          {canGoNext && (
            <TouchableOpacity
              style={[styles.lightboxArrow, styles.lightboxArrowRight]}
              onPress={onNext}
              activeOpacity={0.8}
              testID="lightbox-next"
            >
              <ChevronRight color="#FFFFFF" size={28} strokeWidth={2.4} />
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    );
  }
);

LightboxViewer.displayName = 'LightboxViewer';

export default function PortfolioScreen() {
  const router = useRouter();
  const { profile, setAdminMode } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [lightboxVisible, setLightboxVisible] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);
  const [imageDimensions, setImageDimensions] = React.useState<Record<string, { width: number; height: number }>>({});

  const {
    data: portfolioItems,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = trpc.portfolio.list.useQuery(
    { includeHidden: false },
    {
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    }
  );

  React.useEffect(() => {
    console.log('[PortfolioTab] Fetch state changed', { isLoading, isRefetching, hasError: Boolean(error) });
  }, [isLoading, isRefetching, error]);

  React.useEffect(() => {
    console.log('[PortfolioTab] Received items', portfolioItems?.length ?? 0, portfolioItems);
    if (!isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }).start();
    }
  }, [portfolioItems, isLoading, fadeAnim]);

  React.useEffect(() => {
    console.log('[PortfolioTab] Search query updated', searchQuery);
  }, [searchQuery]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('[PortfolioTab] Screen focused, refetching...');
      refetch();
    }, [refetch])
  );

  const handleRefresh = React.useCallback(async () => {
    console.log('[PortfolioTab] Manual refresh triggered');
    await refetch();
  }, [refetch]);

  const filteredItems = React.useMemo<PortfolioItem[]>(() => {
    const hydratedItems: PortfolioItem[] = (portfolioItems ?? []) as PortfolioItem[];
    if (hydratedItems.length === 0) {
      return [];
    }
    const normalized = searchQuery.trim().toLowerCase();
    const base = [...hydratedItems].sort((a, b) => a.order_index - b.order_index);
    if (!normalized) {
      return base;
    }
    return base.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(normalized);
      const descriptionMatch = item.description?.toLowerCase().includes(normalized) ?? false;
      return titleMatch || descriptionMatch;
    });
  }, [portfolioItems, searchQuery]);

  const handleCardPress = React.useCallback((item: PortfolioItem) => {
    console.log('[PortfolioTab] Card pressed', item.id);
    const index = filteredItems.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      setLightboxIndex(index);
      setLightboxVisible(true);
    }
  }, [filteredItems]);

  const handleLightboxClose = React.useCallback(() => {
    setLightboxVisible(false);
  }, []);

  const handleLightboxNext = React.useCallback(() => {
    setLightboxIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
  }, [filteredItems.length]);

  const handleLightboxPrevious = React.useCallback(() => {
    setLightboxIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  React.useEffect(() => {
    filteredItems.forEach((item) => {
      if (!imageDimensions[item.id]) {
        Image.getSize(
          resolvePortfolioImageUrl(item.image_url),
          (width, height) => {
            setImageDimensions((prev) => ({
              ...prev,
              [item.id]: { width, height },
            }));
          },
          (error) => {
            console.error('[Portfolio] Failed to get image size:', error);
            setImageDimensions((prev) => ({
              ...prev,
              [item.id]: { width: 1, height: 1 },
            }));
          }
        );
      }
    });
  }, [filteredItems, imageDimensions]);

  const masonryItems = React.useMemo<MasonryItem[]>(() => {
    if (filteredItems.length === 0) return [];

    const items: MasonryItem[] = [];
    const columnHeights = [0, 0];

    filteredItems.forEach((item) => {
      const dims = imageDimensions[item.id];
      if (!dims) return;

      const aspectRatio = dims.width / dims.height;
      const itemHeight = COLUMN_WIDTH / aspectRatio;

      const shortestColumn = columnHeights[0] <= columnHeights[1] ? 0 : 1;

      items.push({
        ...item,
        height: itemHeight,
        column: shortestColumn,
      });

      columnHeights[shortestColumn] += itemHeight + COLUMN_GAP;
    });

    return items;
  }, [filteredItems, imageDimensions]);

  const leftColumnItems = React.useMemo(
    () => masonryItems.filter((item) => item.column === 0),
    [masonryItems]
  );

  const rightColumnItems = React.useMemo(
    () => masonryItems.filter((item) => item.column === 1),
    [masonryItems]
  );


  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading portfolio...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Unable to load portfolio.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh} testID="portfolio-retry-button">
          <RefreshCw color="#0F172A" size={18} />
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.staticSearchSection}>
          {profile?.role === 'admin' && (
            <TouchableOpacity 
              style={styles.adminToggle}
              onPress={async () => {
                await setAdminMode(true);
                router.replace('/(admin)');
              }}
            >
              <Shield size={18} color="#6B7280" />
              <Text style={styles.adminToggleText}>Admin View</Text>
            </TouchableOpacity>
          )}
          <View style={styles.searchContainer}>
            <Search color="#9CA3AF" size={20} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by title or mood"
              placeholderTextColor="#9CA3AF"
              testID="portfolio-search-input"
            />
          </View>
        </View>
        <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#0F172A" />}
            testID="portfolio-scroll"
          >
            {filteredItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptySubtitle}>Uploads land here as soon as they are published.</Text>
                <TouchableOpacity
                  style={styles.emptyCta}
                  onPress={() => router.push('/portfolio-upload' as any)}
                  testID="portfolio-empty-cta"
                >
                  <Sparkles color="#0F172A" size={18} />
                  <Text style={styles.emptyCtaText}>Create your first story</Text>
                </TouchableOpacity>
              </View>
            ) : masonryItems.length === 0 ? (
              <View style={styles.loadingImagesContainer}>
                <ActivityIndicator size="small" color="#0F172A" />
                <Text style={styles.loadingImagesText}>Preparing gallery...</Text>
              </View>
            ) : (
              <View style={styles.masonryGrid}>
                <View style={styles.masonryColumn}>
                  {leftColumnItems.map((item) => (
                    <PortfolioCard
                      key={item.id}
                      item={item}
                      onPress={handleCardPress}
                    />
                  ))}
                </View>
                <View style={styles.masonryColumn}>
                  {rightColumnItems.map((item) => (
                    <PortfolioCard
                      key={item.id}
                      item={item}
                      onPress={handleCardPress}
                    />
                  ))}
                </View>
              </View>
            )}
            <View style={{ height: Spacing.xl }} />
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
      <LightboxViewer
        visible={lightboxVisible}
        items={filteredItems}
        currentIndex={lightboxIndex}
        onClose={handleLightboxClose}
        onNext={handleLightboxNext}
        onPrevious={handleLightboxPrevious}
        imageDimensions={imageDimensions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  staticSearchSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: '#FFFFFF',
  },
  adminToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-end',
    marginBottom: Spacing.sm,
  },
  adminToggleText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  titleBlock: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  pageEyebrow: {
    color: '#6B7280',
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: '#0F172A',
  },
  pageSubtitle: {
    color: '#475569',
    fontSize: 15,
    marginTop: 6,
    lineHeight: 20,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroCard: {
    borderRadius: 28,
    overflow: 'hidden',
    height: 280,
    marginBottom: Spacing.lg,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    gap: 8,
  },
  heroEyebrow: {
    color: '#E0E7FF',
    letterSpacing: 1,
    fontSize: 13,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  heroDescription: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 22,
  },
  heroFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  heroMeta: {
    color: '#A5B4FC',
    fontSize: 13,
  },
  emptyState: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyCta: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  emptyCtaText: {
    color: '#0F172A',
    fontWeight: '600' as const,
  },
  controlsRow: {
    gap: 12,
    marginBottom: Spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 16,
  },
  sortChipsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sortChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  sortChipLabel: {
    color: '#6B7280',
    fontWeight: '600' as const,
  },
  sortChipLabelActive: {
    color: '#FFFFFF',
  },
  masonryGrid: {
    flexDirection: 'row',
    gap: COLUMN_GAP,
  },
  masonryColumn: {
    flex: 1,
    gap: COLUMN_GAP,
  },
  masonryCard: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  masonryImage: {
    width: '100%',
    height: '100%',
  },
  loadingImagesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingImagesText: {
    color: '#64748B',
    fontSize: 14,
  },
  lightboxContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  lightboxBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  lightboxTopBar: {
    position: 'absolute',
    top: 52,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lightboxTopTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 1,
    color: '#94A3B8',
  },
  lightboxCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  lightboxBody: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    paddingTop: 40,
  },
  lightboxImageShell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImageInner: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#EEF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxMetaCard: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingHorizontal: 28,
    paddingVertical: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 10,
  },
  lightboxCounter: {
    fontSize: 13,
    letterSpacing: 2,
    color: '#94A3B8',
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  lightboxTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 6,
  },
  lightboxDescription: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
  },
  lightboxArrow: {
    position: 'absolute',
    top: '50%',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -26,
  },
  lightboxArrowLeft: {
    left: 32,
  },
  lightboxArrowRight: {
    right: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: Spacing.lg,
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 15,
  },
  errorText: {
    color: '#0F172A',
    fontSize: 16,
    marginBottom: 12,
  },
  retryButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  retryButtonText: {
    color: '#0F172A',
    fontWeight: '600' as const,
  },
});
