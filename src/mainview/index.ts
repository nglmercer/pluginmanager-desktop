// Initialize custom dialogs
import "./defaults/dialogs.js";

// Initialize i18n
import "./defaults/i18n.js";

// Initialize theme manager
import { getThemeManager } from "./styles/index.js";
getThemeManager().applyToDocument();

// Import all components to register custom elements
import "./components/app-container.js";
import "./components/plugin-manager.js";
import "./components/rule-manager.js";
import "./components/rule-list.js";
import "./components/plugin-list.js";

// Re-export the AppContainer and types
export { AppContainer } from "./components/app-container.js";
export type {
  PluginInfo,
  RuleInfo,
  ActionResult,
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
