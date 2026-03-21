import { LitElement, html, css } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { translate as t } from "lit-i18n";
import { i18next } from "./i18n.js";
import { invokeRpc } from "./rpc.js";
import type { PluginInfo, RemoveResult } from "./types.js";

// Import modular components
import { SettingsModal } from "./components/settings-modal.js";

// Import theme system
import { getThemeManager, baseStyles, APP_ICON, SETTINGS_ICON } from "./styles/index.js";

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
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

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
  private _pollInterval?: ReturnType<typeof setInterval>;

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
    if (!(await confirm(i18next.t("messages.removeConfirm", { name: pluginName })))) {
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
          ${APP_ICON}
          ${t("app.title")}
          <button
            class="settings-btn"
            @click=${this.openSettings}
            title="${t("app.settings")}"
          >
            ${SETTINGS_ICON}
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
