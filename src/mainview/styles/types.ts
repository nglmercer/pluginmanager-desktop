/**
 * Theme type definitions
 */

/**
 * Theme mode - light or dark
 */
export type ThemeMode = "light" | "dark";

/**
 * Theme name for registered themes
 */
export type ThemeName = "default" | "custom" | "light" | "dark";

/**
 * Theme color definitions
 */
export interface ThemeColors {
  // Primary colors
  primaryColor: string;
  primaryHover: string;
  primaryMuted: string;

  // Semantic colors
  dangerColor: string;
  dangerMuted: string;
  successColor: string;
  successMuted: string;
  warningColor: string;
  warningMuted: string;
  infoColor: string;
  infoMuted: string;

  // Background colors
  bgColor: string;
  cardBg: string;
  inputBg: string;
  hoverBg: string;
  activeBg: string;

  // Text colors
  textColor: string;
  textMuted: string;
  textDisabled: string;

  // Border colors
  borderColor: string;
  borderHover: string;
  borderActive: string;

  // Shadow
  shadowColor: string;
  shadowColorStrong: string;

  // Overlay
  overlayBg: string;
}

/**
 * Theme definition with metadata
 */
export interface ThemeDefinition {
  name: ThemeName;
  mode: ThemeMode;
  colors: ThemeColors;
}

/**
 * CSS variable mapping
 */
export interface CSSVariableMap {
  [key: string]: string;
}
