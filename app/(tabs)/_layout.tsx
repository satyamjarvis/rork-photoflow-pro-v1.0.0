import { Tabs, useRouter, useSegments } from "expo-router";
import { Home, Users as UsersIcon, FileImage } from "lucide-react-native";
import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

import { Colors } from "@/constants/colors";

export default function AdminTabLayout() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && profile?.role !== 'admin' && inAuthGroup) {
      router.replace('/public');
    }
  }, [isAuthenticated, isLoading, segments, router, profile]);

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
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => <UsersIcon color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <FileImage color={color} size={24} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="locations"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="workshops"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}


