// Re-export the PluginManager component and types
export { PluginManager } from "./plugin-manager.js";
export type {
  PluginInfo,
  GitHubAsset,
  GitHubRelease,
  InstallResult,
  RemoveResult,
} from "./types.js";

// Re-export theme system
export {
  darkTheme,
  lightTheme,
  generateThemeCSS,
  baseStyles,
  getThemeManager,
  ThemeManager,
  type ThemeMode,
  type ThemeName,
  type ThemeColors,
} from "./styles/index.js";
