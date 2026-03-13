import type { ThemeMode, ThemeName, ThemeColors } from "./types.js";
import { darkTheme, lightTheme, registerTheme, getThemeByName } from "./colors.js";

/**
 * Theme Manager class for runtime theme switching
 */
export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: ThemeColors = darkTheme;
  private currentMode: ThemeMode = "dark";
  private listeners: Set<() => void> = new Set();

  private constructor() {
    // Initialize from localStorage if available
    this.loadFromStorage();
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * Get current theme colors
   */
  getTheme(): ThemeColors {
    return this.currentTheme;
  }

  /**
   * Get current theme mode
   */
  getMode(): ThemeMode {
    return this.currentMode;
  }

  /**
   * Set theme by name
   */
  setTheme(name: ThemeName): void {
    if (name === "light") {
      this.currentTheme = lightTheme;
      this.currentMode = "light";
    } else if (name === "dark") {
      this.currentTheme = darkTheme;
      this.currentMode = "dark";
    } else {
      const theme = getThemeByName(name);
      this.currentTheme = theme;
      this.currentMode = theme === lightTheme ? "light" : "dark";
    }
    this.notifyListeners();
    this.saveToStorage();
  }

  /**
   * Set custom theme colors
   */
  setCustomTheme(colors: ThemeColors): void {
    this.currentTheme = colors;
    registerTheme("custom", colors);
    this.currentMode = this.detectMode(colors);
    this.notifyListeners();
    this.saveToStorage();
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    if (this.currentMode === "dark") {
      this.setTheme("light");
    } else {
      this.setTheme("dark");
    }
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Apply theme to document root
   */
  applyToDocument(): void {
    const root = document.documentElement;
    const theme = this.currentTheme;

    // Apply CSS variables to root
    root.style.setProperty("--primary-color", theme.primaryColor);
    root.style.setProperty("--primary-hover", theme.primaryHover);
    root.style.setProperty("--primary-muted", theme.primaryMuted);

    root.style.setProperty("--danger-color", theme.dangerColor);
    root.style.setProperty("--danger-muted", theme.dangerMuted);
    root.style.setProperty("--success-color", theme.successColor);
    root.style.setProperty("--success-muted", theme.successMuted);
    root.style.setProperty("--warning-color", theme.warningColor);
    root.style.setProperty("--warning-muted", theme.warningMuted);
    root.style.setProperty("--info-color", theme.infoColor);
    root.style.setProperty("--info-muted", theme.infoMuted);

    root.style.setProperty("--bg-color", theme.bgColor);
    root.style.setProperty("--card-bg", theme.cardBg);
    root.style.setProperty("--input-bg", theme.inputBg);
    root.style.setProperty("--hover-bg", theme.hoverBg);
    root.style.setProperty("--active-bg", theme.activeBg);

    root.style.setProperty("--text-color", theme.textColor);
    root.style.setProperty("--text-muted", theme.textMuted);
    root.style.setProperty("--text-disabled", theme.textDisabled);

    root.style.setProperty("--border-color", theme.borderColor);
    root.style.setProperty("--border-hover", theme.borderHover);
    root.style.setProperty("--border-active", theme.borderActive);

    root.style.setProperty("--shadow-color", theme.shadowColor);
    root.style.setProperty("--shadow-color-strong", theme.shadowColorStrong);

    root.style.setProperty("--overlay-bg", theme.overlayBg);

    // Set theme mode class
    root.classList.remove("light-theme", "dark-theme");
    root.classList.add(`${this.currentMode}-theme`);
  }

  /**
   * Detect theme mode from colors
   */
  private detectMode(colors: ThemeColors): ThemeMode {
    // Simple heuristic: dark backgrounds indicate dark mode
    const bgColor = colors.bgColor;
    if (bgColor.startsWith("#")) {
      const hex = bgColor.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? "light" : "dark";
    }
    return "dark";
  }

  private notifyListeners(): void {
    this.applyToDocument();
    this.listeners.forEach((callback) => callback());
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(
        "plugin-manager-theme",
        JSON.stringify({ mode: this.currentMode })
      );
    } catch {
      // localStorage not available
    }
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem("plugin-manager-theme");
      if (saved) {
        const { mode } = JSON.parse(saved);
        if (mode === "light") {
          this.currentTheme = lightTheme;
          this.currentMode = "light";
        } else {
          this.currentTheme = darkTheme;
          this.currentMode = "dark";
        }
      }
    } catch {
      // localStorage not available or invalid data
    }
  }
}

/**
 * Get the theme manager singleton
 */
export function getThemeManager(): ThemeManager {
  return ThemeManager.getInstance();
}
