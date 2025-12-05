import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MapPin, Briefcase, ImageIcon } from 'lucide-react-native';
import { Spacing } from '@/constants/colors';

export default function PublicHomeScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        headerShown: true,
        title: 'David Hogan Photography',
        headerStyle: {
          backgroundColor: '#2C3E7E',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600' as const,
        },
      }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <View style={styles.eyeIcon}>
              <View style={styles.eyeShape}>
                <View style={styles.pupil} />
              </View>
              <View style={styles.redTriangleTop} />
              <View style={styles.blueTriangleBottom} />
            </View>
          </View>
          <Text style={styles.logoText}>
            <Text style={styles.logoTextDark}>david</Text>
            <Text style={styles.logoTextRed}>hogan</Text>
          </Text>
          <Text style={styles.logoSubtext}>Photography</Text>
          <Text style={styles.welcomeText}>Welcome to my photography portfolio</Text>
        </View>

        <View style={styles.navigationGrid}>
          <TouchableOpacity style={styles.navCard}>
            <View style={styles.navIcon}>
              <MapPin color="#2C3E7E" size={32} />
            </View>
            <Text style={styles.navTitle}>{t('tabs.locations')}</Text>
            <Text style={styles.navDescription}>Explore photo locations</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navCard}>
            <View style={styles.navIcon}>
              <ImageIcon color="#2C3E7E" size={32} />
            </View>
            <Text style={styles.navTitle}>{t('tabs.portfolio')}</Text>
            <Text style={styles.navDescription}>View my work</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navCard}>
            <View style={styles.navIcon}>
              <Briefcase color="#2C3E7E" size={32} />
            </View>
            <Text style={styles.navTitle}>{t('tabs.workshops')}</Text>
            <Text style={styles.navDescription}>Join a workshop</Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 24,
  },
  logoWrapper: {
    marginBottom: 20,
  },
  eyeIcon: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  eyeShape: {
    width: 100,
    height: 60,
    backgroundColor: '#2C3E7E',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pupil: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  redTriangleTop: {
    position: 'absolute',
    top: 10,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid' as const,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#E74C3C',
  },
  blueTriangleBottom: {
    position: 'absolute',
    bottom: 10,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid' as const,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#2C3E7E',
  },
  logoText: {
    fontSize: 42,
    fontWeight: '300' as const,
    letterSpacing: -1,
  },
  logoTextDark: {
    color: '#2C3E7E',
  },
  logoTextRed: {
    color: '#E74C3C',
  },
  logoSubtext: {
    fontSize: 18,
    color: '#2C3E7E',
    marginTop: 4,
    fontWeight: '300' as const,
  },
  welcomeText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  navigationGrid: {
    gap: 16,
  },
  navCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  navIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#2C3E7E',
    marginBottom: 8,
  },
  navDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
});
