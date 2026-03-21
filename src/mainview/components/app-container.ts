import { LitElement, html } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { translate as t } from "lit-i18n";
//import { invokeRpc } from "../defaults/rpc.js";

// Import components for side-effect registration
import "./plugin-manager.js";
import "./rule-manager.js";
import type { SettingsModal } from "./settings-modal.js";
import "./settings-modal.js";

// Import icons
import { APP_ICON, SETTINGS_ICON, FOLDER_ICON } from "../styles/index.js";

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

  private async handleOpenPluginsFolder(): Promise<void> {
    const { invokeRpc } = await import("../defaults/rpc.js");
    await invokeRpc("openPluginsFolder", {});
  }

  private async handleOpenRulesFolder(): Promise<void> {
    const { invokeRpc } = await import("../defaults/rpc.js");
    await invokeRpc("openRulesFolder", {});
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
        </div>

        <div class="flex gap-[10px] mb-5">
          <button class="btn" @click=${this.handleOpenPluginsFolder}>
            ${FOLDER_ICON} ${t("app.openPluginsFolder")}
          </button>
          <button class="btn" @click=${this.handleOpenRulesFolder}>
            ${FOLDER_ICON} ${t("app.openRulesFolder")}
          </button>
          <button
            class="ml-auto bg-transparent border border-border p-2 cursor-pointer rounded-md transition-colors flex items-center justify-center text-primary hover:bg-hover"
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
