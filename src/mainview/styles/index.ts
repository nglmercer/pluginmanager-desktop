// Types
export type { ThemeMode, ThemeName, ThemeColors, ThemeDefinition, CSSVariableMap } from "./types.js";

// Colors
export { darkTheme, lightTheme, getThemeByName, registerTheme, getRegisteredThemes } from "./colors.js";

// CSS  
export { generateCSSVariables, generateThemeCSS, getCSSVariableName, getAllCSSVariableNames, baseStyles } from "./css.js";

// Manager
export { ThemeManager, getThemeManager } from "./manager.js";

// Icons
export {
  APP_ICON,
  SETTINGS_ICON,
  FOLDER_ICON,
  TRASH_ICON,
  CLOSE_ICON,
  CHECK_ICON,
  PLUS_ICON,
  REFRESH_ICON,
  SEARCH_ICON,
  CHEVRON_DOWN_ICON,
  INFO_ICON,
  WARNING_ICON,
  NO_PLUGINS_ICON,
  EDIT_ICON
} from "./icons.js";

// Re-export for convenience
export { darkTheme as defaultDarkTheme, lightTheme as defaultLightTheme } from "./colors.js";
