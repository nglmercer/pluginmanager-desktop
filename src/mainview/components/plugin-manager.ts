import { LitElement, html } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { translate as t } from "lit-i18n";
import { i18next } from "../defaults/i18n.js";
import { invokeRpc } from "../defaults/rpc.js";
import type { PluginInfo, RemoveResult } from "../types.js";

// Import modular components
import { SettingsModal } from "./settings-modal.js";

// Import theme system
import { getThemeManager, APP_ICON, SETTINGS_ICON } from "../styles/index.js";

// Register the child components
import "./plugin-list.js";
import "./settings-modal.js";

/**
 * Main Plugin Manager Component
 * Container component that orchestrates the plugin management UI
 */
@customElement("plugin-manager")
export class PluginManager extends LitElement {
  protected createRenderRoot() {
    return this;
  }

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
      <div class="p-5 max-w-[800px] mx-auto">
        <h2 class="text-primary mb-5 text-[1.5rem] flex items-center gap-[10px]">
          ${APP_ICON}
          ${t("app.title")}
          <button
            class="ml-auto bg-transparent border border-border p-2 cursor-pointer rounded-md transition-colors flex items-center justify-center text-primary hover:bg-hover"
            @click=${this.openSettings}
            title="${t("app.settings")}"
          >
            ${SETTINGS_ICON}
          </button>
        </h2>

        ${this.error ? html`<div class="p-[10px] rounded-md mb-[15px] text-danger bg-danger-muted">${this.error}</div>` : ""}
        ${this.success
          ? html`<div class="p-[10px] rounded-md mb-[15px] text-success bg-success-muted">${this.success}</div>`
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
