import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLayout() {
  const { isAuthenticated, profile, isLoading, adminModeEnabled } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAdminGroup = segments[0]?.includes('admin');

    if (!isAuthenticated && inAdminGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inAdminGroup) {
      if (profile?.role !== 'admin' || !adminModeEnabled) {
        router.replace('/(tabs)/portfolio');
      }
    }
  }, [isAuthenticated, profile, adminModeEnabled, isLoading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
