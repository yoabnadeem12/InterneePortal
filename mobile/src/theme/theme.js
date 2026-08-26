import {MD3DarkTheme} from 'react-native-paper';

// Deep navy/indigo dark theme with gold accents
export const appTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary:          '#6C63FF',   // Vivid indigo
    primaryContainer: '#3D3A8C',
    secondary:        '#FFD700',   // Gold accent
    secondaryContainer: '#4A3800',
    background:       '#0D0E1A',   // Deep navy
    surface:          '#13152A',   // Slightly lighter navy
    surfaceVariant:   '#1E2035',
    onPrimary:        '#FFFFFF',
    onSecondary:      '#000000',
    onBackground:     '#E8EAF6',
    onSurface:        '#E8EAF6',
    error:            '#FF5252',
    outline:          '#3D3F5C',
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: 'rgba(0, 0, 0, 0)',
      level1: '#1A1C33',
      level2: '#1E2040',
      level3: '#22244D',
      level4: '#26285A',
      level5: '#2A2C66',
    },
  },
};

// Status badge colors
export const statusColors = {
  Early:      '#FFC107',   // Amber
  OnTime:     '#4CAF50',   // Green
  Late:       '#FF5252',   // Red
  NotYet:     '#9E9E9E',   // Grey
  Present:    '#4CAF50',
  Incomplete: '#FF9800',   // Orange
  Absent:     '#FF5252',
};

export const getStatusColor = status => statusColors[status] ?? '#9E9E9E';
