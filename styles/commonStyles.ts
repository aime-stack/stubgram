
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useThemeStore, getColors, lightColors, darkColors } from '@/stores/themeStore';

// Default export for static usage (backward compatibility)
// These will be updated dynamically by the theme provider
export let colors = darkColors;

// Function to update the exported colors based on theme
export const updateColors = (isDark: boolean) => {
  colors = isDark ? darkColors : lightColors;
};

// Re-export for components that need both color sets
export { lightColors, darkColors, getColors };

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  branding: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    fontFamily: 'System', // Fallback, will try to use a stylized look in the component
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Dynamic styles hook for components that need theme-aware styles
export const useThemedStyles = <T extends StyleSheet.NamedStyles<T>>(
  styleFactory: (colors: typeof darkColors) => T
): T => {
  const { isDark } = useThemeStore();
  const themeColors = isDark ? darkColors : lightColors;
  return StyleSheet.create(styleFactory(themeColors));
};

// Static styles for backward compatibility
export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
});
