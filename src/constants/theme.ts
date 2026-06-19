export const COLORS = {
  background: '#1e1e2e', // Dark gray background
  card: '#2a2a3a', // Gray cards
  cardLight: '#333344', // Lighter gray for cards
  cardDark: '#252535', // Darker gray
  cardBorder: 'rgba(120, 100, 180, 0.2)', // Purple accent border
  primary: '#7864b4', // Darker metallic purple for accents
  accent: '#8b7fb8', // Purple accent
  text: '#ffffff',
  textSecondary: '#b0b0b8',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  button: '#7864b4', // Darker metallic purple for important buttons/blocks
  buttonPressed: '#6a5a9a', // Pressed state
  highlight: '#7864b4', // Solid purple for highlighted blocks only
};

/** Typography scale – use these for consistent font sizes across the app */
export const FONTS = {
  /** Large display numbers (e.g. stats, goals) */
  display: 28,
  h1: 26,
  h2: 22,
  h3: 18,
  body: 16,
  bodySmall: 14,
  caption: 12,
  overline: 11,
  /** Font weights */
  bold: '700' as const,
  semibold: '600' as const,
  medium: '500' as const,
  regular: '400' as const,
};

export const SIZES = {
  padding: 20,
  borderRadius: 12,
  cardPadding: 18,
  /** Spacing scale for margins and gaps */
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  /** Icon sizes */
  iconSm: 20,
  iconMd: 24,
  iconLg: 28,
};

