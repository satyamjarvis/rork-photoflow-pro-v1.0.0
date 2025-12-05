import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing } from '@/constants/colors';
import { Users, MapPin, Calendar, ImageIcon, Video, Tag, MessageSquare, UserCog, CalendarCheck, FileImage, ChevronRight, ArrowLeftRight } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';

export default function AdminDashboard() {
  const { isLoading: authLoading, profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();

  const isLoading = authLoading || statsLoading;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.safeHeader, { paddingTop: insets.top }]}>
          <Text style={styles.pageTitle}>Admin Dashboard</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.safeHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Admin Dashboard</Text>
            <Text style={styles.pageSubtitle}>Manage your photography platform</Text>
          </View>
          {profile?.role === 'admin' && (
            <TouchableOpacity 
              style={styles.switchButton}
              onPress={() => router.push('/public')}
            >
              <ArrowLeftRight color={Colors.primary} size={20} />
              <Text style={styles.switchButtonText}>Public</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OVERVIEW</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Users color="#1A1A1A" size={28} />
              </View>
              <Text style={styles.statNumber}>{stats?.users || 0}</Text>
              <Text style={styles.statLabel}>Users</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <MapPin color="#1A1A1A" size={28} />
              </View>
              <Text style={styles.statNumber}>{stats?.locations || 0}</Text>
              <Text style={styles.statLabel}>Locations</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Calendar color="#1A1A1A" size={28} />
              </View>
              <Text style={styles.statNumber}>{stats?.workshops || 0}</Text>
              <Text style={styles.statLabel}>Workshops</Text>
            </View>

            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => router.push('/portfolio-stats' as any)}
            >
              <View style={styles.statIcon}>
                <ImageIcon color="#1A1A1A" size={28} />
              </View>
              <Text style={styles.statNumber}>{stats?.portfolioPublic || stats?.portfolio || 0}</Text>
              <Text style={styles.statLabel}>Portfolio</Text>
              <Text style={styles.statSubLabel}>Public Display</Text>
            </TouchableOpacity>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Video color="#1A1A1A" size={28} />
              </View>
              <Text style={styles.statNumber}>{stats?.videos || 0}</Text>
              <Text style={styles.statLabel}>BTS Videos</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Tag color="#1A1A1A" size={28} />
              </View>
              <Text style={styles.statNumber}>{stats?.coupons || 0}</Text>
              <Text style={styles.statLabel}>Coupons</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIONS</Text>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/locations')}
          >
            <View style={styles.actionIcon}>
              <MapPin color="#1A1A1A" size={24} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Manage Locations</Text>
              <Text style={styles.actionDescription}>Add, edit, and delete photo locations</Text>
            </View>
            <ChevronRight color="#9CA3AF" size={20} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/moderate-comments')}
          >
            <View style={styles.actionIcon}>
              <MessageSquare color="#1A1A1A" size={24} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Moderate Comments</Text>
              <Text style={styles.actionDescription}>Review and manage user feedback</Text>
            </View>
            <ChevronRight color="#9CA3AF" size={20} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/users')}
          >
            <View style={styles.actionIcon}>
              <UserCog color="#1A1A1A" size={24} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>User Management</Text>
              <Text style={styles.actionDescription}>Manage user roles and permissions</Text>
            </View>
            <ChevronRight color="#9CA3AF" size={20} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/workshops')}
          >
            <View style={styles.actionIcon}>
              <Calendar color="#1A1A1A" size={24} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Manage Workshops</Text>
              <Text style={styles.actionDescription}>Create and edit photography workshops</Text>
            </View>
            <ChevronRight color="#9CA3AF" size={20} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/workshop-interests')}
          >
            <View style={styles.actionIcon}>
              <CalendarCheck color="#1A1A1A" size={24} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Workshop Interests</Text>
              <Text style={styles.actionDescription}>Manage registrations and confirmations</Text>
            </View>
            <ChevronRight color="#9CA3AF" size={20} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/portfolio-management' as any)}
          >
            <View style={styles.actionIcon}>
              <ImageIcon color="#1A1A1A" size={24} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Portfolio Management</Text>
              <Text style={styles.actionDescription}>Manage your portfolio gallery</Text>
            </View>
            <ChevronRight color="#9CA3AF" size={20} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/media-library')}
          >
            <View style={styles.actionIcon}>
              <FileImage color="#1A1A1A" size={24} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Media Library</Text>
              <Text style={styles.actionDescription}>Manage images and videos</Text>
            </View>
            <ChevronRight color="#9CA3AF" size={20} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  safeHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#000',
    marginTop: Spacing.sm,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  switchButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6B7280',
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  statSubLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
});
