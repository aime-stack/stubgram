import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
    mode: ThemeMode;
    isDark: boolean;
    setMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
    initializeTheme: () => void;
}

const getSystemTheme = (): boolean => {
    return Appearance.getColorScheme() === 'dark';
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            mode: 'dark' as ThemeMode, // Default to dark
            isDark: true, // Default to dark

            setMode: (mode: ThemeMode) => {
                // Force dark mode regardless of input
                set({ mode: 'dark', isDark: true });
            },

            toggleTheme: () => {
                // Disable toggling
                set({ mode: 'dark', isDark: true });
            },

            initializeTheme: () => {
                set({ isDark: true });
                // Remove system theme listener since we're locking to dark
            },
        }),
        {
            name: 'theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ mode: state.mode, isDark: state.isDark }),
        }
    )
);

// Theme colors
export const lightColors = {
    background: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    primary: '#8B5CF6',
    secondary: '#EC4899',
    accent: '#F59E0B',
    card: '#F9FAFB',
    highlight: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    border: '#E5E7EB',
    divider: '#F3F4F6',
    gradients: [
        ['#8B5CF6', '#EC4899'],
        ['#EC4899', '#F59E0B'],
        ['#10B981', '#8B5CF6'],
        ['#F59E0B', '#EC4899'],
        ['#8B5CF6', '#10B981'],
    ],
};

export const darkColors = {
    background: '#0F0F0F',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    primary: '#A78BFA',
    secondary: '#F472B6',
    accent: '#FBBF24',
    card: '#1F1F1F',
    highlight: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
    border: '#374151',
    divider: '#2D2D2D',
    gradients: [
        ['#A78BFA', '#F472B6'],
        ['#F472B6', '#FBBF24'],
        ['#34D399', '#A78BFA'],
        ['#FBBF24', '#F472B6'],
        ['#A78BFA', '#34D399'],
    ],
};

// Hook to get current theme colors
export const getColors = (isDark: boolean) => isDark ? darkColors : lightColors;
