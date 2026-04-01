import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { translate as t } from "lit-i18n";
import { i18next } from "../defaults/i18n.js";
import type { PluginInfo } from "../types.js";

// Import theme system
import { FOLDER_ICON, TRASH_ICON, NO_PLUGINS_ICON, MORE_VERT_ICON } from "../styles/index.js";

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
  @state() private processingIds: Set<string> = new Set();

  private setProcessing(id: string, processing: boolean) {
    if (processing) {
      this.processingIds.add(id);
    } else {
      this.processingIds.delete(id);
    }
    this.requestUpdate();
  }

  private async handleRemove(pluginName: string): Promise<void> {
    if (this.processingIds.has(pluginName)) return;
    
    this.setProcessing(pluginName, true);
    this.dispatchEvent(
      new CustomEvent("plugin-remove", {
        detail: { pluginName },
        bubbles: true,
        composed: true,
      })
    );
    // Timeout as a fallback in case the event doesn't lead to a full re-render
    setTimeout(() => this.setProcessing(pluginName, false), 1000);
  }

  private async handleToggle(pluginName: string, enabled: boolean): Promise<void> {
    if (this.processingIds.has(pluginName)) return;
    
    this.setProcessing(pluginName, true);
    const { invokeRpc } = await import("../../shared/rpc.js");
    try {
      await invokeRpc("togglePlugin", { pluginName, enabled });
    } catch (e) {
      console.error("Failed to toggle plugin:", e);
    } finally {
      this.setProcessing(pluginName, false);
    }
  }

  private async handleOpenPluginFolder(pluginName: string): Promise<void> {
    if (this.processingIds.has(pluginName)) return;
    
    this.setProcessing(pluginName, true);
    const { invokeRpc } = await import("../../shared/rpc.js");
    try {
      await invokeRpc("openPluginFolder", { pluginName });
    } catch (e) {
      console.error("Failed to open plugin folder:", e);
    } finally {
      this.setProcessing(pluginName, false);
    }
  }

  private showPluginActions(e: MouseEvent, plugin: PluginInfo): void {
    const ActionMenu = customElements.get("action-menu") as any;
    if(!ActionMenu) return;
    
    ActionMenu.show(e, [
      {
        id: "open",
        label: i18next.t("app.openPluginFolder", { defaultValue: "Open Folder" }),
        icon: FOLDER_ICON,
        action: () => this.handleOpenPluginFolder(plugin.id || plugin.name)
      },
      {
        id: "uninstall",
        label: i18next.t("app.uninstall", { defaultValue: "Uninstall" }),
        icon: TRASH_ICON,
        danger: true,
        action: () => this.handleRemove(plugin.id || plugin.name)
      }
    ]);
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
        ${repeat(
          this.plugins,
          (plugin) => plugin.id || plugin.name,
          (plugin) => {
            const pluginId = plugin.id || plugin.name;
            const isProcessing = this.processingIds.has(pluginId);
            
            return html`
              <div 
                class="flex justify-between items-center p-[15px] bg-card rounded-md border border-border transition-all duration-200 
                ${isProcessing ? 'opacity-60 cursor-wait' : 'hover:-translate-y-0.5 hover:shadow-md hover:border-primary'}"
              >
                <div class="flex-1 ${isProcessing ? 'pointer-events-none' : ''}">
                  <div class="flex items-center gap-[10px] mb-1">
                    <span class="text-primary font-semibold text-[1.1rem]">${plugin.name}</span>
                    <span class="text-muted text-[12px] py-0.5 px-1.5 bg-hover rounded-md">v${plugin.version}</span>
                    ${isProcessing ? html`
                      <div class="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    ` : ""}
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
                      ?disabled=${isProcessing}
                      @change=${(e: Event) => this.handleToggle(pluginId, (e.target as HTMLInputElement).checked)}
                    />
                    <span class="slider absolute cursor-pointer inset-0 bg-border transition-all duration-400 rounded-[20px] checked:bg-success ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}"></span>
                  </label>

                  <!-- Actions Dropdown Trigger -->
                  <button
                    class="flex bg-transparent border-none p-2 cursor-pointer rounded-md text-primary hover:bg-hover ${isProcessing ? 'pointer-events-none opacity-50' : ''}"
                    @click=${(e: MouseEvent) => this.showPluginActions(e, plugin)}
                    ?disabled=${isProcessing}
                    title="${i18next.t("app.moreOptions", { defaultValue: "More Menu" })}"
                  >
                    ${MORE_VERT_ICON}
                  </button>
                </div>
              </div>
            `;
          }
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
