import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { translate as t } from "lit-i18n";
import type { PluginInfo } from "../types.js";

// Import theme system
import { FOLDER_ICON, TRASH_ICON, NO_PLUGINS_ICON } from "../styles/index.js";

/**
 * Plugin List Component
 * Displays the list of installed plugins (list only, no global actions)
 */
@customElement("plugin-list")
export class PluginList extends LitElement {
  protected createRenderRoot() {
    return this;
  }

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

  private async handleToggle(pluginName: string, enabled: boolean): Promise<void> {
    const { invokeRpc } = await import("../../shared/rpc.js");
    try {
      await invokeRpc("togglePlugin", { pluginName, enabled });
    } catch (e) {
      console.error("Failed to toggle plugin:", e);
    }
  }

  private async handleOpenPluginFolder(pluginName: string): Promise<void> {
    const { invokeRpc } = await import("../../shared/rpc.js");
    try {
      await invokeRpc("openPluginFolder", { pluginName });
    } catch (e) {
      console.error("Failed to open plugin folder:", e);
    }
  }

  render() {
    if (this.loading) {
      return html`<div class="text-primary text-center p-5">${t("app.loading")}</div>`;
    }

    if (this.plugins.length === 0) {
      return html`
        <div class="text-center text-muted py-10 px-5">
          ${NO_PLUGINS_ICON}
          <p class="m-[5px_0]">${t("app.noPlugins")}</p>
        </div>
      `;
    }

    return html`
      <div class="flex flex-col gap-[10px]">
        ${this.plugins.map(
          (plugin) => html`
            <div class="flex justify-between items-center p-[15px] bg-card rounded-md border border-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary">
              <div class="flex-1">
                <div class="flex items-center gap-[10px] mb-1">
                  <span class="text-primary font-semibold text-[1.1rem]">${plugin.name}</span>
                  <span class="text-muted text-[12px] py-0.5 px-1.5 bg-hover rounded-md">v${plugin.version}</span>
                </div>
                ${plugin.description
                  ? html`
                      <div class="text-muted text-[13px] mt-1 leading-[1.4]">
                        ${plugin.description}
                      </div>
                    `
                  : html`<div class="text-muted text-[13px] mt-1 leading-[1.4]">${t("app.noDescription")}</div>`}
              </div>
              <div class="flex items-center gap-3">
                <label class="relative inline-block w-10 h-5 mr-1" title="${plugin.enabled ? t("app.disable") : t("app.enable")}">
                  <input
                    type="checkbox"
                    class="opacity-0 w-0 h-0"
                    ?checked=${plugin.enabled}
                    @change=${(e: Event) => this.handleToggle(plugin.id || plugin.name, (e.target as HTMLInputElement).checked)}
                  />
                  <span class="slider absolute cursor-pointer inset-0 bg-border transition-all duration-400 rounded-[20px] checked:bg-success"></span>
                </label>

                <button
                  class="bg-transparent border border-border p-2 cursor-pointer rounded-md flex items-center justify-center text-primary transition-all duration-200 hover:bg-hover hover:border-primary hover:text-primary"
                  @click=${() => this.handleOpenPluginFolder(plugin.id || plugin.name)}
                  title="${t("app.openPluginFolder")}"
                >
                  ${FOLDER_ICON}
                </button>

                <button
                  class="bg-transparent border border-border p-2 cursor-pointer rounded-md flex items-center justify-center text-primary transition-all duration-200 hover:bg-danger-muted hover:border-danger hover:text-danger"
                  @click=${() => this.handleRemove(plugin.id || plugin.name)}
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
