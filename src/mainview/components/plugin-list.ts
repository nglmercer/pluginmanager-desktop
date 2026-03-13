import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { PluginInfo } from "../types.js";

// Import theme system
import { darkTheme, generateThemeCSS, baseStyles } from "../styles/index.js";

/**
 * Plugin List Component
 * Displays the list of installed plugins
 */
@customElement("plugin-list")
export class PluginList extends LitElement {
  static styles = [
    css`:host {${generateThemeCSS(darkTheme)}}`,
    baseStyles,
    css`
    .plugin-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .plugin-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background: var(--card-bg);
      border-radius: 6px;
      border: 1px solid var(--border-color);
    }

    .plugin-info {
      flex: 1;
    }

    .plugin-name {
      color: var(--text-color);
      font-weight: 600;
      margin-bottom: 4px;
    }

    .plugin-version {
      color: var(--text-muted);
      font-size: 12px;
    }

    .plugin-description {
      color: var(--text-muted);
      font-size: 13px;
      margin-top: 4px;
    }

    .plugin-actions {
      display: flex;
      gap: 8px;
    }

    .loading {
      color: var(--primary-color);
      text-align: center;
      padding: 20px;
    }

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
  `
  ];

  @property({ type: Array }) plugins: PluginInfo[] = [];
  @property({ type: Boolean }) loading: boolean = false;

  private handleRemove(pluginName: string): void {
    this.dispatchEvent(
      new CustomEvent("plugin-remove", {
        detail: { pluginName },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Loading plugins...</div>`;
    }

    if (this.plugins.length === 0) {
      return html`
        <div class="empty-state">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M20 7h-9M14 17H5M17 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM7 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            />
          </svg>
          <p>No plugins installed yet.</p>
          <p>Use the tabs above to install plugins from GitHub or upload a zip file.</p>
        </div>
      `;
    }

    return html`
      <div class="plugin-list">
        ${this.plugins.map(
          (plugin) => html`
            <div class="plugin-item">
              <div class="plugin-info">
                <div class="plugin-name">
                  ${plugin.packageJson?.name || plugin.name}
                </div>
                <div class="plugin-version">
                  ${plugin.packageJson?.version || "Unknown version"}
                </div>
                ${plugin.packageJson?.description
                  ? html`
                      <div class="plugin-description">
                        ${plugin.packageJson.description}
                      </div>
                    `
                  : ""}
              </div>
              <div class="plugin-actions">
                <button
                  class="btn-danger"
                  @click=${() => this.handleRemove(plugin.name)}
                >
                  Uninstall
                </button>
              </div>
            </div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "plugin-list": PluginList;
  }
}
