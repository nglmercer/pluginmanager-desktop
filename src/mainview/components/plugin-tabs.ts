import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

// Import theme system
import { darkTheme, generateThemeCSS, baseStyles } from "../styles/index.js";

/**
 * Tab data structure
 */
export interface TabData {
  id: string;
  label: string;
  count?: number;
}

/**
 * Plugin Tabs Component
 * Handles tab navigation for the plugin manager
 */
@customElement("plugin-tabs")
export class PluginTabs extends LitElement {
  static styles = [
    css`:host {${generateThemeCSS(darkTheme)}}`,
    baseStyles,
    css`
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 10px;
    }

    .tab {
      background: transparent;
      border: none;
      color: var(--text-color);
      padding: 10px 20px;
      cursor: pointer;
      font-size: 14px;
      border-radius: 6px;
      transition: background 0.2s, color 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tab:hover {
      background: var(--hover-bg);
    }

    .tab.active {
      background: var(--primary-color);
      color: white;
    }

    .tab-count {
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
    }

    .tab:not(.active) .tab-count {
      background: rgba(255, 255, 255, 0.1);
    }
  `
  ];

  @property({ type: String }) activeTab: string = "installed";
  @property({ type: Array }) tabs: TabData[] = [
    { id: "installed", label: "Installed Plugins" },
    { id: "github", label: "Install from GitHub" },
    { id: "upload", label: "Upload ZIP" },
  ];

  private handleTabClick(tabId: string): void {
    this.dispatchEvent(
      new CustomEvent("tab-change", {
        detail: { tabId },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <div class="tabs">
        ${this.tabs.map(
          (tab) => html`
            <button
              class="tab ${this.activeTab === tab.id ? "active" : ""}"
              @click=${() => this.handleTabClick(tab.id)}
            >
              ${tab.label}
              ${tab.count !== undefined
                ? html`<span class="tab-count">${tab.count}</span>`
                : ""}
            </button>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "plugin-tabs": PluginTabs;
  }
}
