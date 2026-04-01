import { LitElement, html } from "lit";
import { customElement, state, property } from "lit/decorators.js";
import { i18next } from "../defaults/i18n.js";
import { invokeRpc } from "../../shared/rpc.js";
import type { PluginInfo, ActionResult } from "../types.js";

// Register child components
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
  @state() private isInitialLoad: boolean = true;
  @state() private error: string = "";
  @state() private success: string = "";
  
  @property({ type: String }) sortBy: string = "name";
  @property({ type: String }) sortOrder: 'asc' | 'desc' = "asc";

  private _pollInterval?: ReturnType<typeof setInterval>;

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('sortBy') || changedProperties.has('sortOrder')) {
      this.plugins = this.sort(this.plugins);
    }
  }

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
    if (this.isInitialLoad) {
      this.loading = true;
    }
    try {
      const result = (await invokeRpc("getPlugins", {})) as PluginInfo[];
      this.plugins = this.sort(result || []);
    } catch (e: unknown) {
      console.error("Failed to load plugins:", e);
      this.error = i18next.t("messages.loadFailed", { error: (e as Error).message });
    } finally {
      this.loading = false;
      this.isInitialLoad = false;
    }
  }

  private sort(plugins: PluginInfo[]): PluginInfo[] {
    return [...plugins].sort((a, b) => {
      let valA: any, valB: any;
      
      switch (this.sortBy) {
        case "id":
          valA = (a.id || "").toLowerCase();
          valB = (b.id || "").toLowerCase();
          break;
        case "enabled":
          valA = a.enabled ? 0 : 1;
          valB = b.enabled ? 0 : 1;
          break;
        case "version":
          valA = a.version.toLowerCase();
          valB = b.version.toLowerCase();
          break;
        case "name":
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
      }

      let comparison = 0;
      if (valA < valB) comparison = -1;
      if (valA > valB) comparison = 1;

      return this.sortOrder === "asc" ? comparison : -comparison;
    });
  }

  private async removePlugin(pluginName: string): Promise<void> {
    if (!(await confirm(i18next.t("messages.removeConfirm", { name: pluginName })))) {
      return;
    }

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
      // No global loading here, PluginList handles per-item locking
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
