import type { ThemeColors, ThemeName } from "./types.js";

/**
 * Predefined dark theme colors (default)
 */
export const darkTheme: ThemeColors = {
  primaryColor: "#4a9eff",
  primaryHover: "#6db3ff",
  primaryMuted: "rgba(74, 158, 255, 0.15)",

  dangerColor: "#ff4a4a",
  dangerMuted: "rgba(255, 74, 74, 0.15)",
  successColor: "#4aff4a",
  successMuted: "rgba(74, 255, 74, 0.15)",
  warningColor: "#ffb84a",
  warningMuted: "rgba(255, 184, 74, 0.15)",
  infoColor: "#4ae0ff",
  infoMuted: "rgba(74, 224, 255, 0.15)",

  bgColor: "#1e1e1e",
  cardBg: "#2d2d2d",
  inputBg: "#252525",
  hoverBg: "#363636",
  activeBg: "#404040",

  textColor: "#e0e0e0",
  textMuted: "#a0a0a0",
  textDisabled: "#666666",

  borderColor: "#404040",
  borderHover: "#505050",
  borderActive: "#606060",

  shadowColor: "rgba(0, 0, 0, 0.3)",
  shadowColorStrong: "rgba(0, 0, 0, 0.5)",

  overlayBg: "rgba(0, 0, 0, 0.6)",
};

/**
 * Predefined light theme colors
 */
export const lightTheme: ThemeColors = {
  primaryColor: "#0066cc",
  primaryHover: "#0077e6",
  primaryMuted: "rgba(0, 102, 204, 0.1)",

  dangerColor: "#dc3545",
  dangerMuted: "rgba(220, 53, 69, 0.1)",
  successColor: "#28a745",
  successMuted: "rgba(40, 167, 69, 0.1)",
  warningColor: "#ffc107",
  warningMuted: "rgba(255, 193, 7, 0.1)",
  infoColor: "#17a2b8",
  infoMuted: "rgba(23, 162, 184, 0.1)",

  bgColor: "#f5f5f5",
  cardBg: "#ffffff",
  inputBg: "#ffffff",
  hoverBg: "#e9ecef",
  activeBg: "#dee2e6",

  textColor: "#212529",
  textMuted: "#6c757d",
  textDisabled: "#adb5bd",

  borderColor: "#dee2e6",
  borderHover: "#adb5bd",
  borderActive: "#6c757d",

  shadowColor: "rgba(0, 0, 0, 0.1)",
  shadowColorStrong: "rgba(0, 0, 0, 0.2)",

  overlayBg: "rgba(255, 255, 255, 0.8)",
};

/**
 * Theme registry
 */
const themeRegistry: Map<ThemeName, ThemeColors> = new Map([
  ["default", darkTheme],
  ["custom", darkTheme],
  ["light", lightTheme],
  ["dark", darkTheme],
]);

/**
 * Get theme by name
 */
export function getThemeByName(name: ThemeName): ThemeColors {
  return themeRegistry.get(name) ?? darkTheme;
}

/**
 * Register a custom theme
 */
export function registerTheme(name: ThemeName, colors: ThemeColors): void {
  themeRegistry.set(name, colors);
}

/**
 * Get all registered theme names
 */
export function getRegisteredThemes(): ThemeName[] {
  return Array.from(themeRegistry.keys());
}
