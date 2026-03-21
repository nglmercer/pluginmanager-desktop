import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { translate as t } from "lit-i18n";
import type { PluginInfo } from "../types.js";

// Import theme system
import { baseStyles, FOLDER_ICON, TRASH_ICON } from "../styles/index.js";

/**
 * Plugin List Component
 * Displays the list of installed plugins
 */
@customElement("plugin-list")
export class PluginList extends LitElement {
  static styles = [
    baseStyles,
    css`
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

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
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .plugin-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: var(--primary-color);
    }

    .plugin-info {
      flex: 1;
    }

    .plugin-header {
       display: flex;
       align-items: center;
       gap: 10px;
       margin-bottom: 4px;
    }

    .plugin-name {
      color: var(--text-color);
      font-weight: 600;
      font-size: 1.1rem;
    }

    .plugin-version {
      color: var(--text-muted);
      font-size: 12px;
      padding: 2px 6px;
      background: var(--hover-bg);
      border-radius: 4px;
    }

    .plugin-description {
      color: var(--text-muted);
      font-size: 13px;
      margin-top: 4px;
      line-height: 1.4;
    }

    .plugin-actions {
      display: flex;
      align-items: center;
      gap: 12px;
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

    /* Toggle Switch Styles */
    .switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 20px;
      margin-right: 4px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--border-color);
      transition: .4s;
      border-radius: 20px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: var(--success-color);
    }

    input:checked + .slider:before {
      transform: translateX(20px);
    }

    .btn-icon {
      background: transparent;
      border: 1px solid var(--border-color);
      padding: 8px;
      cursor: pointer;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-color);
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: var(--hover-bg);
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .btn-icon.danger:hover {
       background: var(--danger-muted);
       border-color: var(--danger-color);
       color: var(--danger-color);
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

  private async handleOpenRulesFolder(): Promise<void> {
     // Import invokeRpc to call RPC safely with async fallback
     const { invokeRpc } = await import("../rpc.js");
     await invokeRpc("openRulesFolder", {});
  }

  private async handleToggle(pluginName: string, enabled: boolean): Promise<void> {
     const { invokeRpc } = await import("../rpc.js");
     try {
        await invokeRpc("togglePlugin", { pluginName, enabled });
     } catch (e) {
        console.error("Failed to toggle plugin:", e);
     }
  }

  private async handleOpenPluginFolder(pluginName: string): Promise<void> {
     const { invokeRpc } = await import("../rpc.js");
     try {
        await invokeRpc("openPluginFolder", { pluginName });
     } catch (e) {
        console.error("Failed to open plugin folder:", e);
     }
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">${t("app.loading")}</div>`;
    }

    const header = html`
      <div class="card mb-5 border-dashed border-border bg-hover p-5 rounded-lg">
         <div class="flex justify-between items-center gap-[15px]">
            <div class="flex-1">
               <h4 class="m-0 mb-[5px] text-primary">${t("app.manualManagement")}</h4>
               <p class="m-0 text-[0.9em] text-muted">
                 ${t("app.dragDropNotice")}
               </p>
            </div>
            <div class="flex gap-[10px]">
               <button class="btn-primary" @click=${this.handleOpenFolder}>
                  ${t("app.openFolder")}
               </button>
               <button class="btn-primary" @click=${this.handleOpenRulesFolder}>
                  ${t("app.openRules")}
               </button>
            </div>
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
                <div class="plugin-header">
                  <span class="plugin-name">${plugin.name}</span>
                  <span class="plugin-version">v${plugin.version}</span>
                </div>
                ${plugin.description
                  ? html`
                      <div class="plugin-description">
                        ${plugin.description}
                      </div>
                    `
                  : html`<div class="plugin-description">${t("app.noDescription")}</div>`}
              </div>
              <div class="plugin-actions">
                <label class="switch" title="${plugin.enabled ? t("app.disable") : t("app.enable")}">
                   <input 
                      type="checkbox" 
                      ?checked=${plugin.enabled}
                      @change=${(e: Event) => this.handleToggle(plugin.id || plugin.name, (e.target as HTMLInputElement).checked)}
                   >
                   <span class="slider"></span>
                </label>
                
                <button 
                  class="btn-icon" 
                  @click=${() => this.handleOpenPluginFolder(plugin.id || plugin.name)}
                  title="${t("app.openPluginFolder")}"
                >
                  ${FOLDER_ICON}
                </button>
                
                <button
                  class="btn-icon danger"
                  @click=${() => this.handleRemove((plugin).id || plugin.name)}
                  title="${t("app.uninstall")}"
                >
                  ${TRASH_ICON}
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
