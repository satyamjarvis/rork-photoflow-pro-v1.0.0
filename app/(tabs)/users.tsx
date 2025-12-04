import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/colors';
import { UserCard } from '@/components/UserCard';
import { useAuth, UserProfile } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import {
  Search,
  Trash2,
  X,
  ShieldAlert,
  ShieldCheck,
  UserX,
  UserCheck,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

type FilterOptions = {
  role?: 'admin' | 'viewer';
  status?: 'active' | 'suspended';
  sortBy?: 'created_at' | 'last_login' | 'name' | 'email';
  sortOrder?: 'asc' | 'desc';
};

export default function UserManagementScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [searchQuery] = useState('');
  const [filters] = useState<FilterOptions>({
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  const {
    data: usersData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.users.list.useQuery({
    search: searchQuery || undefined,
    ...filters,
    limit: 50,
  });

  const filteredUsers = useMemo(() => {
    if (!usersData?.users) return [];
    if (!localSearchQuery.trim()) return usersData.users;
    
    const query = localSearchQuery.toLowerCase();
    return usersData.users.filter((user: any) => {
      const searchableText = [
        user.name,
        user.email,
        user.phone,
        user.role,
        user.status,
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchableText.includes(query);
    });
  }, [usersData?.users, localSearchQuery]);

  const toggleCardExpansion = (userId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedUser(null);
      Alert.alert('Success', 'User role updated successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const updateStatusMutation = trpc.users.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedUser(null);
      Alert.alert('Success', 'User status updated successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedUser(null);
      Alert.alert('Success', 'User deleted successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const bulkDeleteMutation = trpc.users.bulkDelete.useMutation({
    onSuccess: (result) => {
      refetch();
      setSelectedUsers([]);
      Alert.alert('Success', `${result.deleted} users deleted successfully`);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleUserPress = (user: UserProfile) => {
    setSelectedUser(user);
  };

  const handleToggleRole = () => {
    if (!selectedUser) return;
    
    const newRole = selectedUser.role === 'admin' ? 'viewer' : 'admin';
    Alert.alert(
      'Confirm Role Change',
      `Change ${selectedUser.name || selectedUser.email}'s role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            updateRoleMutation.mutate({
              userId: selectedUser.id,
              role: newRole,
            });
          },
        },
      ]
    );
  };

  const handleToggleStatus = () => {
    if (!selectedUser) return;
    
    const newStatus = selectedUser.status === 'active' ? 'suspended' : 'active';
    Alert.alert(
      'Confirm Status Change',
      `${newStatus === 'suspended' ? 'Suspend' : 'Activate'} ${selectedUser.name || selectedUser.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus === 'suspended' ? 'destructive' : 'default',
          onPress: () => {
            updateStatusMutation.mutate({
              userId: selectedUser.id,
              status: newStatus,
            });
          },
        },
      ]
    );
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${selectedUser.name || selectedUser.email}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate({ userId: selectedUser.id });
          },
        },
      ]
    );
  };

  const handleBulkDelete = () => {
    Alert.alert(
      'Bulk Delete',
      `Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            bulkDeleteMutation.mutate({ userIds: selectedUsers });
          },
        },
      ]
    );
  };

  const handleToggleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === usersData?.users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(usersData?.users.map((u: any) => u.id) || []);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.safeHeader, { paddingTop: insets.top }]}>
          <Text style={styles.pageTitle}>User Management</Text>
        </View>
        <View style={styles.centerContainer}>
          <ShieldAlert color={Colors.error} size={64} />
          <Text style={styles.errorText}>Admin access required</Text>
          <Text style={styles.errorSubText}>You need administrator privileges to access this section</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.safeHeader, { paddingTop: insets.top }]}>
        <Text style={styles.pageTitle}>{t('users.title')}</Text>
      </View>

      <View style={styles.header}>
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Search color="#666" size={22} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, phone, or role..."
              value={localSearchQuery}
              onChangeText={setLocalSearchQuery}
              placeholderTextColor="#999"
            />
            {localSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setLocalSearchQuery('')}>
                <X color="#666" size={20} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.actionRow}>
          {selectedUsers.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={handleSelectAll}
              >
                <Text style={styles.bulkActionText}>
                  {selectedUsers.length === usersData?.users.length
                    ? 'Deselect All'
                    : 'Select All'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkActionButton, styles.deleteButton]}
                onPress={handleBulkDelete}
              >
                <Trash2 color={Colors.white} size={18} />
                <Text style={styles.deleteButtonText}>
                  Delete ({selectedUsers.length})
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredUsers.length} {filteredUsers.length === 1 ? 'User' : 'Users'}
          {localSearchQuery && ` (filtered from ${usersData?.total || 0})`}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#000"
            />
          }
        >
          {filteredUsers.map((user: any) => (
            <View key={user.id} style={styles.userCardWrapper}>
              {selectedUsers.length > 0 && (
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => handleToggleSelectUser(user.id)}
                >
                  <View
                    style={[
                      styles.checkboxInner,
                      selectedUsers.includes(user.id) && styles.checkboxChecked,
                    ]}
                  />
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }}>
                <UserCard
                  user={user}
                  isExpanded={expandedCards.has(user.id)}
                  onPress={() => toggleCardExpansion(user.id)}
                  onLongPress={() => handleUserPress(user)}
                  testID={`user-card-${user.id}`}
                />
              </View>
            </View>
          ))}

          {filteredUsers.length === 0 && (
            <View style={styles.emptyState}>
              <UserX color="#999" size={64} />
              <Text style={styles.emptyText}>
                {localSearchQuery ? 'No users match your search' : 'No users found'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={!!selectedUser}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Actions</Text>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <X color={Colors.text} size={24} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <>
                <View style={styles.modalUserInfo}>
                  <Text style={styles.modalUserName}>
                    {selectedUser.name || 'No Name'}
                  </Text>
                  <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
                </View>

                <TouchableOpacity
                  style={styles.modalAction}
                  onPress={handleToggleRole}
                  disabled={updateRoleMutation.isPending}
                >
                  {selectedUser.role === 'admin' ? (
                    <ShieldAlert color={Colors.warning} size={20} />
                  ) : (
                    <ShieldCheck color={Colors.primary} size={20} />
                  )}
                  <Text style={styles.modalActionText}>
                    {selectedUser.role === 'admin'
                      ? 'Change to Viewer'
                      : 'Change to Admin'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalAction}
                  onPress={handleToggleStatus}
                  disabled={updateStatusMutation.isPending}
                >
                  {selectedUser.status === 'active' ? (
                    <UserX color={Colors.warning} size={20} />
                  ) : (
                    <UserCheck color={Colors.success} size={20} />
                  )}
                  <Text style={styles.modalActionText}>
                    {selectedUser.status === 'active' ? 'Suspend User' : 'Activate User'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalAction, styles.modalActionDanger]}
                  onPress={handleDeleteUser}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 color={Colors.error} size={20} />
                  <Text style={[styles.modalActionText, styles.modalActionTextDanger]}>
                    Delete User
                  </Text>
                </TouchableOpacity>

                {(updateRoleMutation.isPending ||
                  updateStatusMutation.isPending ||
                  deleteMutation.isPending) && (
                  <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.md }} />
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  safeHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#000',
    marginTop: Spacing.sm,
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchWrapper: {
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#000',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filterButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight + '20',
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  bulkActionText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  deleteButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  filtersContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  filterRow: {
    marginBottom: Spacing.md,
  },
  filterLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  filterChipTextActive: {
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },
  statsBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#000',
  },
  list: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 80,
  },
  userCardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  errorSubText: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: Typography.sizes.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  modalUserInfo: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.md,
  },
  modalUserName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  modalUserEmail: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  modalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  modalActionDanger: {
    backgroundColor: Colors.error + '10',
  },
  modalActionText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  modalActionTextDanger: {
    color: Colors.error,
  },
});
