export const colors = {
  bg: '#0D0F0E',
  bgElevated: '#121512',
  surface: '#171A18',
  surfaceAlt: '#202420',
  surfaceMuted: '#292E29',
  surfaceSunken: '#101310',
  border: '#303630',
  borderStrong: '#454D45',
  text: '#F5F7F2',
  textDim: '#A4ADA3',
  textMuted: '#737C73',
  primary: '#D8FF72',
  primaryHover: '#C8F25A',
  primaryDim: '#3D4C1E',
  primarySoft: '#253018',
  success: '#59D499',
  successDim: '#173226',
  warning: '#FFC45C',
  warningDim: '#352A17',
  danger: '#FF786E',
  accent: '#7DB8FF',
  accentDim: '#182A3B',
  peach: '#FF9A73',
  peachDim: '#39231D',
  white: '#FFFFFF',
  black: '#090A09',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Larger, more premium corner radii. `md` drives most cards/buttons/inputs.
export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
};

export const font = {
  display: 40,
  h1: 30,
  h2: 22,
  h3: 17,
  body: 15,
  small: 13,
  tiny: 11,
};

// Multi-stop gradients consumed by the SVG-based <Gradient> primitive.
// Defined as color-stop arrays so they render identically on iOS/Android/Web.
export const gradients = {
  primary: ['#EAFFA8', '#D8FF72', '#AEE84A'],
  primaryDeep: ['#D8FF72', '#95D63F'],
  lime: ['#D8FF72', '#7FBF3A'],
  accent: ['#A6CEFF', '#7DB8FF', '#4E90E8'],
  peach: ['#FFC2A3', '#FF9A73', '#EF7048'],
  success: ['#7CE3B4', '#59D499', '#2FA875'],
  // Card / glass surface sheen (top-lit).
  surface: ['#1E221D', '#141712'],
  surfaceGlass: ['rgba(38,44,37,0.85)', 'rgba(18,21,18,0.78)'],
  // Aurora blobs for the app backdrop.
  auroraLime: ['rgba(216,255,114,0.30)', 'rgba(216,255,114,0)'],
  auroraBlue: ['rgba(125,184,255,0.24)', 'rgba(125,184,255,0)'],
  auroraPeach: ['rgba(255,154,115,0.18)', 'rgba(255,154,115,0)'],
  // Dark scrim used over hero photography.
  heroScrim: ['rgba(8,10,8,0)', 'rgba(8,10,8,0.55)', 'rgba(8,10,8,0.9)'],
};

// Translucent "glass" surface tokens (semi-transparent panels with a lit edge).
export const glass = {
  fill: 'rgba(23,26,24,0.66)',
  fillStrong: 'rgba(20,23,20,0.82)',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.16)',
  highlight: 'rgba(255,255,255,0.14)',
};

// Web-only: overrides the browser's forced light autofill styling on inputs
// (Chrome/Safari otherwise ignore inline/RN styles here — only a real CSS
// rule targeting :-webkit-autofill can win). Injected by app/+html.tsx for
// static/production builds and re-asserted at runtime in app/_layout.tsx,
// since Metro's web dev-client clears the +html.tsx <style> shortly after
// first paint.
export const webAutofillFixCSS = `
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active {
    -webkit-text-fill-color: ${colors.text} !important;
    caret-color: ${colors.text} !important;
    box-shadow: 0 0 0 1000px ${colors.surfaceAlt} inset !important;
    -webkit-box-shadow: 0 0 0 1000px ${colors.surfaceAlt} inset !important;
    transition: background-color 600000s ease-in-out 0s, color 600000s ease-in-out 0s;
  }
`;

export const shadow = {
  // Soft ambient card lift.
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 4,
  },
  // Low elevation for chips / small tiles.
  low: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 2,
  },
  // Pronounced float for hero / tilt cards.
  high: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 26 },
    shadowOpacity: 0.34,
    shadowRadius: 48,
    elevation: 12,
  },
  // Lime glow (primary CTA / highlights).
  glow: {
    shadowColor: '#D8FF72',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
  },
  glowStrong: {
    shadowColor: '#D8FF72',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.42,
    shadowRadius: 30,
    elevation: 10,
  },
  glowAccent: {
    shadowColor: '#7DB8FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 26,
    elevation: 8,
  },
};
