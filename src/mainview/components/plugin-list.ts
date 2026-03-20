import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { translate as t } from "lit-i18n";
import type { PluginInfo } from "../types.js";

// Import theme system
import { baseStyles } from "../styles/index.js";

/**
 * Plugin List Component
 * Displays the list of installed plugins
 */
@customElement("plugin-list")
export class PluginList extends LitElement {
  static styles = [
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

  private async handleOpenFolder(): Promise<void> {
     // Import invokeRpc to call RPC safely with async fallback
     const { invokeRpc } = await import("../rpc.js");
     await invokeRpc("openPluginsFolder", {});
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">${t("app.loading")}</div>`;
    }

    const header = html`
      <div class="card" style="margin-bottom: 20px; border: 1px dashed var(--border-color); background: var(--hover-bg);">
         <div style="display: flex; justify-content: space-between; align-items: center; gap: 15px;">
            <div style="flex: 1;">
               <h4 style="margin: 0 0 5px 0;">${t("app.manualManagement")}</h4>
               <p style="margin: 0; font-size: 0.9em; color: var(--text-muted);">
                 ${t("app.dragDropNotice")}
               </p>
            </div>
            <button class="btn-primary" @click=${this.handleOpenFolder}>
               ${t("app.openFolder")}
            </button>
         </div>
      </div>
    `;

    if (this.plugins.length === 0) {
      return html`
        ${header}
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
          <p>${t("app.noPlugins")}</p>
          <p>${t("app.clickToAdd")}</p>
        </div>
      `;
    }

    return html`
      ${header}
      <div class="plugin-list">
        ${this.plugins.map(
          (plugin) => html`
            <div class="plugin-item">
              <div class="plugin-info">
                <div class="plugin-name">
                  ${plugin.name}
                </div>
                <div class="plugin-version">
                  ${plugin.version}
                </div>
                ${plugin.description
                  ? html`
                      <div class="plugin-description">
                        ${plugin.description}
                      </div>
                    `
                  : ""}
              </div>
              <div class="plugin-actions">
                <button
                  class="btn-danger"
                  @click=${() => this.handleRemove((plugin).id || plugin.name)}
                >
                  ${t("app.uninstall")}
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
