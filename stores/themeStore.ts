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
            mode: 'system' as ThemeMode,
            isDark: getSystemTheme(),

            setMode: (mode: ThemeMode) => {
                const isDark = mode === 'system' ? getSystemTheme() : mode === 'dark';
                set({ mode, isDark });
            },

            toggleTheme: () => {
                const { mode, isDark } = get();
                const newIsDark = !isDark;
                set({ mode: newIsDark ? 'dark' : 'light', isDark: newIsDark });
            },

            initializeTheme: () => {
                const { mode } = get();
                const isDark = mode === 'system' ? getSystemTheme() : mode === 'dark';
                set({ isDark });

                // Listen for system theme changes
                Appearance.addChangeListener(({ colorScheme }) => {
                    if (get().mode === 'system') {
                        set({ isDark: colorScheme === 'dark' });
                    }
                });
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
    primary: '#0a7ea4',
    secondary: '#EC4899',
    accent: '#F59E0B',
    card: '#F9FAFB',
    highlight: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    border: '#E5E7EB',
    divider: '#F3F4F6',
    gradients: [
        ['#0a7ea4', '#EC4899'],
        ['#EC4899', '#F59E0B'],
        ['#10B981', '#0a7ea4'],
        ['#F59E0B', '#EC4899'],
        ['#0a7ea4', '#10B981'],
    ],
};

export const darkColors = {
    background: '#F9FAFB', // Light background even in "dark" mode as requested
    text: '#1A1A1A',       // Dark text for contrast
    textSecondary: '#6B7280',
    primary: '#0a7ea4',
    secondary: '#F472B6',
    accent: '#FBBF24',
    card: '#FFFFFF',       // White cards
    highlight: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
    border: '#E5E7EB',
    divider: '#F3F4F6',
    gradients: [
        ['#1A1A1A', '#F472B6'], // Adjusted gradients for light background
        ['#F472B6', '#FBBF24'],
        ['#34D399', '#1A1A1A'],
        ['#FBBF24', '#F472B6'],
        ['#1A1A1A', '#34D399'],
    ],
};

// Hook to get current theme colors
export const getColors = (isDark: boolean) => isDark ? darkColors : lightColors;
