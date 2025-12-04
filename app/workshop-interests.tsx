import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Spacing } from '@/constants/colors';
import { CalendarCheck } from 'lucide-react-native';

export default function WorkshopInterestsScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Workshop Interests',
          headerBackTitle: 'Back',
        }} 
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.placeholderContainer}>
          <View style={styles.iconContainer}>
            <CalendarCheck color="#6B7280" size={48} />
          </View>
          <Text style={styles.placeholderTitle}>Workshop Registrations</Text>
          <Text style={styles.placeholderText}>
            View and manage workshop registrations and confirmations.
          </Text>
          <Text style={styles.placeholderSubtext}>
            This feature will allow you to see who&apos;s registered for workshops, send confirmations, and manage attendee lists.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 32,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
