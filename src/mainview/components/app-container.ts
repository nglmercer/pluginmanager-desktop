import { LitElement, html } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { translate as t } from "lit-i18n";
import { i18next } from "../defaults/i18n.js";
//import { invokeRpc } from "../defaults/rpc.js";

// Import components for side-effect registration
import "./plugin-manager.js";
import "./rule-manager.js";
import type { SettingsModal } from "./settings-modal.js";
import "./settings-modal.js";
import "./action-menu.js";

// Import icons
import { APP_ICON, SETTINGS_ICON, PLUS_ICON } from "../styles/index.js";

/**
 * Main App Container
 * Top-level layout with navigation tabs and global actions
 */
@customElement("app-container")
export class AppContainer extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @state() private activeTab: "plugins" | "rules" = "plugins";

  @query("settings-modal") private _settingsModal!: SettingsModal;

  private switchTab(tab: "plugins" | "rules"): void {
    this.activeTab = tab;
  }

  private openSettings(): void {
    this._settingsModal.open();
  }

  private async addDefaultRule(): Promise<void> {
    const { invokeRpc } = await import("../../shared/rpc.js");
    await invokeRpc("createDefaultRule", {});
  }

  render() {
    return html`
      <div class="p-5 max-w-[800px] mx-auto">
        <div class="flex items-center gap-[10px] mb-5">
          ${APP_ICON}
          <h2 class="text-primary text-[1.5rem]">${t("app.title")}</h2>
        </div>

        <div class="flex border-b border-border mb-5">
          <button
            class="px-4 py-2 font-medium transition-colors ${this.activeTab === 'plugins'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted hover:text-primary'}"
            @click=${() => this.switchTab('plugins')}
          >
            ${t("tab.plugins")}
          </button>
          <button
            class="px-4 py-2 font-medium transition-colors ${this.activeTab === 'rules'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted hover:text-primary'}"
            @click=${() => this.switchTab('rules')}
          >
            ${t("tab.rules")}
          </button>

          <button
            class="ml-auto bg-transparent border-none p-2 cursor-pointer rounded-full transition-colors flex items-center justify-center text-muted hover:bg-hover hover:text-primary"
            @click=${this.addDefaultRule}
            title="${i18next.t("app.addDefaultRule", { defaultValue: "Add Default Rule" })}"
          >
            ${PLUS_ICON}
          </button>
          <button
            class="ml-2 bg-transparent border-none p-2 cursor-pointer rounded-full transition-colors flex items-center justify-center text-muted hover:bg-hover hover:text-primary"
            @click=${this.openSettings}
            title="${t("app.settings")}"
          >
            ${SETTINGS_ICON}
          </button>
        </div>

        ${this.activeTab === 'plugins' ? html`<plugin-manager></plugin-manager>` : ''}
        ${this.activeTab === 'rules' ? html`<rule-manager></rule-manager>` : ''}

        <settings-modal></settings-modal>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-container": AppContainer;
  }
}
