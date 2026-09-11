import {MD3LightTheme as DefaultTheme} from 'react-native-paper';

export const appTheme = {
  ...DefaultTheme,
  roundness: 14,
  colors: {
    ...DefaultTheme.colors,
    primary:            '#047857',   // Deep rich emerald green
    primaryContainer:   '#D1FAE5',   // Soft pale emerald green
    secondary:          '#065F46',   // Deep forest green
    secondaryContainer: '#ECFDF5',   // Very light mint cream
    tertiary:           '#0D9488',   // Teal green
    background:         '#FBF9F5',   // Warm ivory linen background
    surface:            '#FFFFFF',   // Crisp white card surface
    surfaceVariant:     '#FAF7F0',   // Warm soft ivory input surface
    outline:            '#E5DDD0',   // Warm sand border
    outlineVariant:     '#EAE2D5',   // Soft divider border
    onPrimary:          '#FFFFFF',   // White text on green
    onPrimaryContainer: '#064E3B',   // Deep dark green text on mint
    onBackground:       '#1C1917',   // Rich onyx charcoal text
    onSurface:          '#1C1917',   // Rich onyx charcoal text
    onSurfaceVariant:   '#78716C',   // Warm stone grey for secondary text
    error:              '#DC2626',   // Clear Red
    errorContainer:     '#FEE2E2',   // Soft pale red
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#FFFFFF',
      level3: '#FFFFFF',
      level4: '#FFFFFF',
      level5: '#FFFFFF',
    },
  },
};

export const statusColors = {
  Early:      '#D97706',   // Warm Amber
  OnTime:     '#16A34A',   // Fresh Green
  Late:       '#DC2626',   // Crimson Red
  NotYet:     '#78716C',   // Stone Grey
  Present:    '#16A34A',   // Fresh Green
  Incomplete: '#047857',   // Dark Green
  Absent:     '#DC2626',   // Crimson Red
};

export const getStatusColor = status => statusColors[status] ?? '#78716C';
