export const Colors = {
  primary: '#2563EB',
  primaryDark: '#1E40AF',
  primaryLight: '#60A5FA',
  
  secondary: '#F97316',
  secondaryDark: '#C2410C',
  secondaryLight: '#FB923C',
  
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  backgroundTertiary: '#F3F4F6',
  
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  success: '#10B981',
  successLight: '#D1FAE5',
  
  error: '#EF4444',
  errorLight: '#FEE2E2',
  
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  
  white: '#FFFFFF',
  black: '#000000',
  
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  
  card: '#FFFFFF',
  cardShadow: 'rgba(0, 0, 0, 0.1)',
  
  adminBlack: '#000000',
  adminWhite: '#FFFFFF',
  adminGray: '#F5F5F5',
  adminBorder: '#E5E5E5',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    heading: 28,
    title: 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const Shadows = {
  sm: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
};

export default Colors;
