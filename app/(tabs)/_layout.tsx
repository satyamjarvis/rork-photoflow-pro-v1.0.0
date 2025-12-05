import { Tabs, useRouter, useSegments } from "expo-router";
import { MapPin, Briefcase, ImageIcon, User } from "lucide-react-native";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";

import { Colors } from "@/constants/colors";

export default function TabLayout() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, profile, adminModeEnabled } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inTabsGroup = segments[0]?.includes('tabs');

    if (!isAuthenticated && inTabsGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inTabsGroup && profile?.role === 'admin' && adminModeEnabled) {
      router.replace('/(admin)');
    }
  }, [isAuthenticated, isLoading, profile, adminModeEnabled, segments, router]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="portfolio"
        options={{
          title: t('tabs.portfolio'),
          tabBarIcon: ({ color }) => <ImageIcon color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="locations"
        options={{
          title: t('tabs.locations'),
          tabBarIcon: ({ color }) => <MapPin color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="workshops"
        options={{
          title: t('tabs.workshops'),
          tabBarIcon: ({ color }) => <Briefcase color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
