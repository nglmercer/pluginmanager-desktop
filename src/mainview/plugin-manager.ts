import { LitElement, html, css } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { translate as t } from "lit-i18n";
import { i18next } from "./i18n.js";
import { invokeRpc } from "./rpc.js";
import type { PluginInfo, RemoveResult } from "./types.js";

// Import modular components
import { SettingsModal } from "./components/settings-modal.js";

// Import theme system
import { getThemeManager, baseStyles } from "./styles/index.js";

// Register the child components
import "./components/plugin-list.js";
import "./components/settings-modal.js";

/**
 * Main Plugin Manager Component
 * Container component that orchestrates the plugin management UI
 */
@customElement("plugin-manager")
export class PluginManager extends LitElement {
  static styles = [
    baseStyles,
    css`
    .plugin-manager {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    h2 {
      color: var(--text-color);
      margin-bottom: 20px;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .message {
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 15px;
    }

    .error {
      color: var(--danger-color);
      background: var(--danger-muted);
    }

    .success {
      color: var(--success-color);
      background: var(--success-muted);
    }

    .settings-btn {
      margin-left: auto;
      background: transparent;
      border: 1px solid var(--border-color);
      padding: 8px;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-color);
    }

    .settings-btn:hover {
      background: var(--hover-bg);
    }
  `
  ];

  @state() private plugins: PluginInfo[] = [];
  @state() private loading: boolean = false;
  @state() private error: string = "";
  @state() private success: string = "";

  @query("settings-modal") private _settingsModal!: SettingsModal;

  private themeManager = getThemeManager();
  private _themeUnsubscribe?: () => void;
  private _pollInterval?: any;

  connectedCallback() {
    super.connectedCallback();
    this.loadPlugins();
    this._themeUnsubscribe = this.themeManager.subscribe(() => this.requestUpdate());
    
    // Poll for changes in plugins list as we now rely on manual management
    this._pollInterval = setInterval(() => this.loadPlugins(), 2000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._themeUnsubscribe) {
      this._themeUnsubscribe();
    }
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
    }
  }

  private async loadPlugins(): Promise<void> {
    try {
      const result = await invokeRpc("getPlugins", {}) as PluginInfo[];
      this.plugins = result || [];
    } catch (e: unknown) {
      this.error = i18next.t("messages.loadFailed", { error: (e as Error).message });
    }
  }

  private async removePlugin(pluginName: string): Promise<void> {
    if (!confirm(i18next.t("messages.removeConfirm", { name: pluginName }))) {
      return;
    }

    this.loading = true;
    this.error = "";
    this.success = "";

    try {
      const result = await invokeRpc("removePlugin", {
        pluginName,
      }) as RemoveResult;

      if (result?.success) {
        this.success = i18next.t("messages.removeSuccess", { name: pluginName });
        await this.loadPlugins();
      } else {
        this.error = i18next.t("messages.removeFailed", { error: result?.error || "Removal failed" });
      }
    } catch (e: unknown) {
      this.error = i18next.t("messages.removeFailed", { error: (e as Error).message || "Removal failed" });
    } finally {
      this.loading = false;
    }
  }

  private handlePluginRemove(e: CustomEvent<{ pluginName: string }>): void {
    this.removePlugin(e.detail.pluginName);
  }

  private openSettings(): void {
    this._settingsModal.open();
  }

  private handleSettingsChanged(): void {
    this.requestUpdate();
  }

  render() {
    return html`
      <div class="plugin-manager">
        <h2>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M20 7h-9M14 17H5M17 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM7 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            />
          </svg>
          ${t("app.title")}
          <button
            class="settings-btn"
            @click=${this.openSettings}
            title="${t("app.settings")}"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </h2>

        ${this.error ? html`<div class="message error">${this.error}</div>` : ""}
        ${this.success
          ? html`<div class="message success">${this.success}</div>`
          : ""}

        <plugin-list
          .plugins=${this.plugins}
          .loading=${this.loading}
          @plugin-remove=${this.handlePluginRemove}
        ></plugin-list>

        <settings-modal @settings-changed=${this.handleSettingsChanged}></settings-modal>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "plugin-manager": PluginManager;
  }
}
