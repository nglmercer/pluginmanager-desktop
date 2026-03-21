import { css, CSSResult, unsafeCSS } from "lit";
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

/**
 * Base styles that use CSS variables (theme-agnostic)
 */
export const baseStyles = css`
  :host {
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    display: block;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Oxygen, Ubuntu, sans-serif;
  }

  /* Card component */
  .card {
    background: var(--card-bg);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 15px;
    border: 1px solid var(--border-color);
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .card:hover {
    border-color: var(--border-hover);
  }

  .card h3 {
    margin: 0 0 15px 0;
    color: var(--text-color);
    font-size: 1.1rem;
  }

  /* Form elements */
  .form-group {
    margin-bottom: 15px;
  }

  label {
    display: block;
    color: var(--text-color);
    margin-bottom: 5px;
    font-size: 14px;
  }

  input,
  textarea,
  select {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--input-bg);
    color: var(--text-color);
    font-size: 14px;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-muted);
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--text-disabled);
  }

  input:disabled,
  textarea:disabled,
  select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Buttons */
  button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s, background-color 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  button:hover {
    opacity: 0.9;
  }

  button:active {
    transform: scale(0.98);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--primary-color);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-hover);
  }

  .btn-danger {
    background: var(--danger-color);
    color: white;
  }

  .btn-success {
    background: var(--success-color);
    color: #1e1e1e;
  }

  .btn-secondary {
    background: var(--text-muted);
    color: white;
  }

  .btn-ghost {
    background: transparent;
    color: var(--text-color);
  }

  .btn-ghost:hover {
    background: var(--hover-bg);
  }

  /* Message states */
  .message {
    padding: 10px 15px;
    border-radius: 6px;
    margin-bottom: 15px;
    font-size: 14px;
  }

  .error {
    color: var(--danger-color);
    background: var(--danger-muted);
    border: 1px solid var(--danger-color);
  }

  .success {
    color: var(--success-color);
    background: var(--success-muted);
    border: 1px solid var(--success-color);
  }

  .warning {
    color: var(--warning-color);
    background: var(--warning-muted);
    border: 1px solid var(--warning-color);
  }

  .info {
    color: var(--info-color);
    background: var(--info-muted);
    border: 1px solid var(--info-color);
  }

  /* Loading */
  .loading {
    color: var(--primary-color);
    text-align: center;
    padding: 20px;
  }

  /* Empty state */
  .empty-state {
    text-align: center;
    color: var(--text-muted);
    padding: 40px 20px;
  }

  .empty-state svg {
    width: 48px;
    height: 48px;
    margin-bottom: 15px;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 5px 0;
  }

  /* Scrollbar styling */
  .scrollable {
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border-color) transparent;
  }

  .scrollable::-webkit-scrollbar {
    width: 6px;
  }

  .scrollable::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollable::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
  }

  .scrollable::-webkit-scrollbar-thumb:hover {
    background: var(--border-hover);
  }
`;
