import { css, CSSResult, unsafeCSS } from "lit";
export { tailwindStyles } from "./tailwind.css.js";
import type { ThemeColors } from "./types.js";

/**
 * CSS variable name mapping from color keys
 */
const CSS_VARIABLE_MAP: Record<keyof ThemeColors, string> = {
  primaryColor: "--primary-color",
  primaryHover: "--primary-hover",
  primaryMuted: "--primary-muted",

  dangerColor: "--danger-color",
  dangerMuted: "--danger-muted",
  successColor: "--success-color",
  successMuted: "--success-muted",
  warningColor: "--warning-color",
  warningMuted: "--warning-muted",
  infoColor: "--info-color",
  infoMuted: "--info-muted",

  bgColor: "--bg-color",
  cardBg: "--card-bg",
  inputBg: "--input-bg",
  hoverBg: "--hover-bg",
  activeBg: "--active-bg",

  textColor: "--text-color",
  textMuted: "--text-muted",
  textDisabled: "--text-disabled",

  borderColor: "--border-color",
  borderHover: "--border-hover",
  borderActive: "--border-active",

  shadowColor: "--shadow-color",
  shadowColorStrong: "--shadow-color-strong",

  overlayBg: "--overlay-bg",
};

/**
 * Generate CSS custom properties string from theme colors
 */
export function generateCSSVariables(theme: ThemeColors): string {
  const lines: string[] = [];

  for (const [key, cssVar] of Object.entries(CSS_VARIABLE_MAP)) {
    lines.push(`  ${cssVar}: ${theme[key as keyof ThemeColors]};`);
  }

  return lines.join("\n");
}

/**
 * Generate CSS custom properties as a CSSResult
 */
export function generateThemeCSS(theme: ThemeColors): CSSResult {
  const cssString = generateCSSVariables(theme);
  return unsafeCSS(`:host {${cssString}}`);
}

/**
 * Get CSS variable name for a color key
 */
export function getCSSVariableName(key: keyof ThemeColors): string {
  return CSS_VARIABLE_MAP[key];
}

/**
 * Get all CSS variable names
 */
export function getAllCSSVariableNames(): string[] {
  return Object.values(CSS_VARIABLE_MAP);
}
export const baseStyles = css`
  :host {
    display: block;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Oxygen, Ubuntu, sans-serif;
  }
`;
