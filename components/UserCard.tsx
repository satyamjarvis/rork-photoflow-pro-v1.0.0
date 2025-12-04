import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Spacing } from '@/constants/colors';
import { User as UserIcon, Mail, Phone, Calendar, Circle } from 'lucide-react-native';
import { UserProfile } from '@/contexts/AuthContext';

interface UserCardProps {
  user: UserProfile;
  isExpanded?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  testID?: string;
}

export function UserCard({ user, isExpanded = false, onPress, onLongPress, testID }: UserCardProps) {
  const expandAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  }, [isExpanded, expandAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };
  const isActive = user.status === 'active';
  const isOnline = user.last_login &&
    new Date(user.last_login).getTime() > Date.now() - 5 * 60 * 1000;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const cardHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [90, 180],
  });

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.card, !isActive && styles.cardSuspended]}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        testID={testID}
      >
        <Animated.View style={{ minHeight: cardHeight }}>
          <View style={styles.cardHeader}>
            <View style={styles.avatarContainer}>
              {user.profile_image_url ? (
                <Image
                  source={{ uri: user.profile_image_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <UserIcon color="#000" size={32} />
                </View>
              )}
              {isOnline && <View style={styles.onlineBadge} />}
            </View>

            <View style={styles.cardContent}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {user.name || 'No Name'}
                </Text>
                <View style={[styles.roleBadge, user.role === 'admin' && styles.roleBadgeAdmin]}>
                  <Text style={[styles.roleBadgeText, user.role === 'admin' && styles.roleBadgeTextAdmin]}>
                    {user.role === 'admin' ? 'ADMIN' : 'VIEWER'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Mail color="#666" size={14} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>

              {!isExpanded && (
                <View style={[styles.statusBadge, !isActive && styles.statusBadgeSuspended]}>
                  <Circle
                    color={isActive ? '#22c55e' : '#ef4444'}
                    size={8}
                    fill={isActive ? '#22c55e' : '#ef4444'}
                  />
                  <Text style={[styles.statusText, !isActive && styles.statusTextSuspended]}>
                    {isActive ? 'Active' : 'Suspended'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {isExpanded && (
            <Animated.View
              style={[
                styles.expandedContent,
                {
                  opacity: expandAnim,
                },
              ]}
            >
              {user.phone && (
                <View style={styles.expandedRow}>
                  <Phone color="#666" size={16} />
                  <Text style={styles.expandedText}>{user.phone}</Text>
                </View>
              )}

              <View style={styles.expandedRow}>
                <Calendar color="#666" size={16} />
                <Text style={styles.expandedText}>
                  Joined {formatDate(user.created_at)}
                </Text>
              </View>

              {user.last_login && (
                <View style={styles.expandedRow}>
                  <Text style={styles.expandedLabel}>Last Login:</Text>
                  <Text style={styles.expandedValue}>
                    {formatDate(user.last_login)}
                  </Text>
                </View>
              )}

              <View style={styles.expandedFooter}>
                <View style={[styles.statusBadgeLarge, !isActive && styles.statusBadgeSuspended]}>
                  <Circle
                    color={isActive ? '#22c55e' : '#ef4444'}
                    size={10}
                    fill={isActive ? '#22c55e' : '#ef4444'}
                  />
                  <Text style={[styles.statusTextLarge, !isActive && styles.statusTextSuspended]}>
                    {isActive ? 'Active' : 'Suspended'}
                  </Text>
                </View>
                <Text style={styles.tapHint}>Long press for actions</Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  cardSuspended: {
    backgroundColor: '#fafafa',
    borderColor: '#d0d0d0',
  },
  cardHeader: {
    flexDirection: 'row',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    borderWidth: 3,
    borderColor: '#fff',
  },
  cardContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  roleBadgeAdmin: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#666',
    letterSpacing: 0.5,
  },
  roleBadgeTextAdmin: {
    color: '#fff',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusBadgeSuspended: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#16a34a',
    marginLeft: 4,
  },
  statusTextSuspended: {
    color: '#dc2626',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  expandedText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    fontWeight: '500' as const,
  },
  expandedLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 6,
  },
  expandedValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600' as const,
  },
  expandedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#16a34a',
    marginLeft: 6,
  },
  tapHint: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic' as const,
  },
});
