/**
 * Design System - Muzeum Her
 * Barevná paleta a typografie podle brandingu muzeumher.cz
 */

export const colors = {
  // Primární barvy (z webu)
  primary: '#0037FD',      // Modrá - hlavní brand barva
  black: '#000000',        // Černá - texty, pozadí
  white: '#FFFFFF',        // Bílá - pozadí, kontrasty
  
  // Sekundární barvy
  success: '#09B872',      // Zelená - úspěšné akce
  info: '#ECF6FF',         // Světle modrá - info boxy
  border: '#C7D4E1',       // Šedá - ohraničení
  
  // Stavové barvy
  error: '#CF2E2E',        // Červená - chyby
  warning: '#FF6900',      // Oranžová - varování
  
  // Pozadí
  background: '#F5F7FA',   // Světle šedá - pozadí adminu
  cardBg: '#FFFFFF',       // Bílá - pozadí karet
  
  // Texty
  text: '#000000',
  textPrimary: '#000000',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
} as const;

export const breakpoints = {
  // Responzivní breakpointy pro různé velikosti monitorů
  mobile: '480px',
  tablet: '768px',
  laptop: '1024px',
  desktop: '1366px',
  wide: '1920px',
  ultrawide: '2560px',
} as const;

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '6rem',   // 96px
} as const;

export const typography = {
  // Font families
  fontFamily: {
    base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  },
  
  // Font sizes - škálovatelné pro různé obrazovky
  fontSize: {
    xs: 'clamp(0.75rem, 1vw, 0.875rem)',      // 12-14px
    sm: 'clamp(0.875rem, 1.2vw, 1rem)',       // 14-16px
    base: 'clamp(1rem, 1.5vw, 1.125rem)',     // 16-18px
    lg: 'clamp(1.125rem, 2vw, 1.5rem)',       // 18-24px
    xl: 'clamp(1.5rem, 2.5vw, 2rem)',         // 24-32px
    '2xl': 'clamp(2rem, 3vw, 3rem)',          // 32-48px
    '3xl': 'clamp(3rem, 4vw, 4rem)',          // 48-64px
    '4xl': 'clamp(4rem, 5vw, 5rem)',          // 64-80px
    
    // Kiosk specifické (větší pro čitelnost z dálky)
    kioskSmall: 'clamp(1.5rem, 3vw, 2rem)',   // 24-32px
    kioskMedium: 'clamp(2rem, 4vw, 3rem)',    // 32-48px
    kioskLarge: 'clamp(3rem, 6vw, 5rem)',     // 48-80px
    kioskXLarge: 'clamp(4rem, 8vw, 7rem)',    // 64-112px
  },
  
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  card: '0 0 30px -8px rgba(0, 0, 0, 0.24)',
} as const;

export const borderRadius = {
  sm: '0.25rem',   // 4px
  base: '0.375rem', // 6px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  full: '9999px',
} as const;

export const transitions = {
  fast: '150ms ease-in-out',
  base: '300ms ease-in-out',
  slow: '500ms ease-in-out',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// Helper pro media queries
export const media = {
  mobile: `@media (min-width: ${breakpoints.mobile})`,
  tablet: `@media (min-width: ${breakpoints.tablet})`,
  laptop: `@media (min-width: ${breakpoints.laptop})`,
  desktop: `@media (min-width: ${breakpoints.desktop})`,
  wide: `@media (min-width: ${breakpoints.wide})`,
  ultrawide: `@media (min-width: ${breakpoints.ultrawide})`,
} as const;

