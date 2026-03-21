import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { i18next } from "../defaults/i18n.js";
import { invokeRpc } from "../defaults/rpc.js";
import type { PluginInfo, ActionResult } from "../types.js";

// Register child component
import "./plugin-list.js";

/**
 * Plugin Manager Container
 * Handles data loading and events for the plugin list
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

  private _pollInterval?: ReturnType<typeof setInterval>;

  connectedCallback() {
    super.connectedCallback();
    this.loadPlugins();
    // Poll for changes
    this._pollInterval = setInterval(() => this.loadPlugins(), 2000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
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
      }) as ActionResult;

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

  render() {
    return html`
      <div class="p-5 pt-0">
        ${this.error ? html`<div class="p-[10px] rounded-md mb-[15px] text-danger bg-danger-muted">${this.error}</div>` : ""}
        ${this.success
          ? html`<div class="p-[10px] rounded-md mb-[15px] text-success bg-success-muted">${this.success}</div>`
          : ""}

        <plugin-list
          .plugins=${this.plugins}
          .loading=${this.loading}
          @plugin-remove=${this.handlePluginRemove}
        ></plugin-list>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "plugin-manager": PluginManager;
  }
}
