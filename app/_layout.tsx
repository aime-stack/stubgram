
import { SystemBars } from 'react-native-edge-to-edge';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { WidgetProvider } from '@/contexts/WidgetContext';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import React, { useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { socketService } from '@/services/socket';
import { ThemeProvider } from '@/components/ThemeProvider';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const { loadUser, isAuthenticated, isLoading: isAuthLoading } = useAuthStore(); // Renamed isLoading to isAuthLoading for clarity if needed, but assuming check is fine
  const { isDark, initializeTheme } = useThemeStore();
  const segments = useSegments();
  const router = useRouter();

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    initializeTheme();
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      await loadUser();
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }, [loadUser]);

  useEffect(() => {
    // Load user on app start
    initializeAuth();
  }, [initializeAuth]);

  // Route protection logic
  useEffect(() => {
    if (!loaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      // If user is signed in and on login/register page, redirect to home
      router.replace('/(drawer)/(tabs)/(home)');
    } else if (!isAuthenticated && !inAuthGroup) {
      // If user is not signed in and trying to access protected route, redirect to login
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, segments, loaded]);

  useEffect(() => {
    // Connect to WebSocket when authenticated
    if (isAuthenticated) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
          <ThemeProvider>
            <WidgetProvider>
              <SystemBars style={isDark ? 'light' : 'dark'} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(drawer)" />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="formsheet" options={{ presentation: 'formSheet' }} />
                <Stack.Screen
                  name="transparent-modal"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                  }}
                />
              </Stack>
              <StatusBar style={isDark ? 'light' : 'dark'} />
            </WidgetProvider>
          </ThemeProvider>
        </NavigationThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
