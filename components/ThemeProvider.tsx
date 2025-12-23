import React, { useEffect, createContext, useContext } from 'react';
import { StatusBar, View } from 'react-native';
import { useThemeStore, darkColors, lightColors } from '@/stores/themeStore';
import { updateColors } from '@/styles/commonStyles';

interface ThemeContextType {
    isDark: boolean;
    colors: typeof darkColors;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        // Fallback for components outside provider
        const { isDark, toggleTheme } = useThemeStore();
        return {
            isDark,
            colors: isDark ? darkColors : lightColors,
            toggleTheme,
        };
    }
    return context;
};

interface ThemeProviderProps {
    children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const { isDark, toggleTheme, initializeTheme } = useThemeStore();
    const colors = isDark ? darkColors : lightColors;

    useEffect(() => {
        initializeTheme();
    }, []);

    // Update the exported colors whenever theme changes
    useEffect(() => {
        updateColors(isDark);
    }, [isDark]);

    return (
        <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={colors.background}
            />
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                {children}
            </View>
        </ThemeContext.Provider>
    );
}
