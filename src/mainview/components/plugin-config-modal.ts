import { LitElement, html } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { translate as t } from "lit-i18n";
import { invokeRpc } from "../../shared/rpc.js";
import type { ActionResult } from "../types.js";
import { CLOSE_ICON, CHECK_ICON, INFO_ICON } from "../styles/index.js";

/**
 * Plugin Configuration Modal
 * Allows editing plugin configuration in two modes: Fields and JSON Input
 */
@customElement("plugin-config-modal")
export class PluginConfigModal extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @query("dialog") private _dialog!: HTMLDialogElement;

  @state() private pluginName: string = "";
  @state() private config: any = {};
  @state() private mode: "input" | "fields" = "fields";
  @state() private rawConfig: string = "";
  @state() private loading: boolean = false;
  @state() private saving: boolean = false;
  @state() private error: string | null = null;

  /**
   * Open the modal for a specific plugin
   */
  async open(pluginName: string) {
    this.pluginName = pluginName;
    this.loading = true;
    this.error = null;
    this.config = {};
    this.rawConfig = "";
    
    // Ensure dialog is in DOM before showing
    await this.updateComplete;
    this._dialog.showModal();

    try {
      this.config = await invokeRpc("getPluginConfig", { pluginName });
      this.rawConfig = JSON.stringify(this.config, null, 2);
      
      // Decide initial mode: if config is object and not null, prefer fields
      if (typeof this.config === 'object' && this.config !== null && Object.keys(this.config).length > 0) {
        this.mode = "fields";
      } else {
        this.mode = "input";
      }
    } catch (e) {
      console.error("Failed to load plugin config:", e);
      this.error = String(e);
      this.mode = "input";
    } finally {
      this.loading = false;
    }
  }

  /**
   * Close the modal
   */
  close() {
    this._dialog.close();
  }

  private handleRawConfigChange(e: Event) {
    this.rawConfig = (e.target as HTMLTextAreaElement).value;
    // Don't sync back to this.config immediately to avoid losing cursor or partial JSON errors
  }

  private beautifyJson() {
    try {
      const parsed = JSON.parse(this.rawConfig);
      this.rawConfig = JSON.stringify(parsed, null, 2);
      this.config = parsed;
    } catch (e) {
      this.error = "Cannot format invalid JSON";
      setTimeout(() => this.error = null, 3000);
    }
  }

  private updateNestedField(path: string[], value: any) {
    const newConfig = { ...this.config };
    let current = newConfig;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        current[key] = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] };
        current = current[key];
    }
    current[path[path.length - 1]] = value;
    this.config = { ...newConfig };
    this.rawConfig = JSON.stringify(this.config, null, 2);
    this.requestUpdate();
  }

  /**
   * Save the configuration
   */
  private async save() {
    this.saving = true;
    this.error = null;

    let finalConfig = this.config;
    
    if (this.mode === "input") {
      try {
        finalConfig = JSON.parse(this.rawConfig);
      } catch (e) {
        this.error = "Invalid JSON: " + String(e);
        this.saving = false;
        return;
      }
    }

    try {
      const result = await invokeRpc("setPluginConfig", { 
        pluginName: this.pluginName, 
        config: finalConfig 
      }) as ActionResult;
      
      if (result && result.success) {
        this.close();
        this.dispatchEvent(new CustomEvent("config-saved", { 
          detail: { pluginName: this.pluginName, config: finalConfig },
          bubbles: true,
          composed: true
        }));
      } else {
        this.error = result.error || "Failed to save configuration";
      }
    } catch (e) {
      console.error("Failed to save plugin config:", e);
      this.error = String(e);
    } finally {
      this.saving = false;
    }
  }

  private renderField(key: string, value: any, path: string[] = []): any {
    const currentPath = [...path, key];
    const isBool = typeof value === 'boolean';
    const isNum = typeof value === 'number';
    const isObj = typeof value === 'object' && value !== null && !Array.isArray(value);
    
    if (isObj) {
        return html`
          <div class="flex flex-col gap-4 p-5 bg-white/5 border border-white/5 rounded-2xl mb-2 transition-all hover:bg-white/[0.07] hover:border-white/10 group/section">
            <label class="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] px-1 flex items-center gap-2 group-hover/section:text-primary/60 transition-colors">
                <span class="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover/section:bg-primary/40 transition-colors"></span>
                ${key}
            </label>
            <div class="grid gap-5 pl-4 border-l border-white/10">
              ${Object.entries(value).map(([k, v]) => this.renderField(k, v, currentPath))}
            </div>
          </div>
        `;
    }

    return html`
      <div class="flex flex-col gap-2 group/field">
        <label class="text-[11px] font-bold text-muted/60 uppercase tracking-wider px-1 group-hover/field:text-primary/80 transition-colors">${key}</label>
        <div class="relative">
          ${isBool 
            ? html`
                <div class="flex items-center gap-4 p-3 bg-input/50 border border-border/50 rounded-xl hover:border-primary/40 hover:bg-input transition-all cursor-pointer select-none"
                     @click=${(e: Event) => {
                        const cb = (e.currentTarget as HTMLElement).querySelector('input');
                        if (cb && e.target !== cb) cb.click();
                     }}>
                  <div class="relative inline-flex items-center">
                    <input 
                        type="checkbox" 
                        class="sr-only" 
                        .checked=${value} 
                        @change=${(e: Event) => this.updateNestedField(currentPath, (e.target as HTMLInputElement).checked)}
                    />
                    <div class="w-10 h-5 bg-white/10 rounded-full transition-colors ${value ? 'bg-primary' : ''}"></div>
                    <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : ''} shadow-sm"></div>
                  </div>
                  <span class="text-sm font-semibold transition-colors ${value ? 'text-primary' : 'text-muted'}">${value ? 'Enabled' : 'Disabled'}</span>
                </div>
              `
            : html`
                <input
                  type="${isNum ? 'number' : 'text'}"
                  class="w-full bg-input/50 border border-border/50 rounded-xl px-4 py-3.5 text-primary transition-all duration-200 hover:border-primary/40 focus:border-primary focus:bg-input outline-none ring-0 focus:ring-4 focus:ring-primary/10 font-medium"
                  .value=${value === null ? "" : value}
                  @input=${(e: Event) => {
                    const val = (e.target as HTMLInputElement).value;
                    this.updateNestedField(currentPath, isNum ? Number(val) : val);
                  }}
                  spellcheck="false"
                />
              `}
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <dialog 
        class="bg-[#1a1a1a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl text-primary p-0 w-[95%] max-w-[650px] shadow-[0_25px_70px_rgba(0,0,0,0.6)] m-auto overflow-hidden ring-1 ring-white/5 animate-in zoom-in-95 duration-300"
        @click=${(e: MouseEvent) => e.target === this._dialog && this.close()}
      >
        <!-- Header -->
        <div class="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/2">
          <div class="flex flex-col gap-0.5">
             <div class="text-[10px] uppercase tracking-[0.2em] font-black text-primary/40">${t("app.editConfig") || "Configuration"}</div>
             <h3 class="m-0 text-xl font-bold tracking-tight text-white flex items-center gap-2">
               ${this.pluginName}
               <span class="w-1.5 h-1.5 rounded-full bg-success"></span>
             </h3>
          </div>
          <button 
            class="text-muted/60 hover:text-white transition-all p-2.5 rounded-full hover:bg-white/5 active:scale-90" 
            @click=${this.close}
            title="${t("app.close")}"
          >
            ${CLOSE_ICON}
          </button>
        </div>
        
        <!-- Tabs & Global Actions -->
        <div class="px-8 py-3 border-b border-white/5 bg-black/20 flex items-center justify-between">
            <div class="flex p-1 bg-white/5 rounded-xl border border-white/5 gap-1">
                <button 
                    class="px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${this.mode === 'fields' ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-100' : 'text-muted/60 hover:text-white scale-[0.98]'}"
                    @click=${() => {
                        this.mode = 'fields';
                        try { this.config = JSON.parse(this.rawConfig); } catch(e) {}
                    }}
                >
                    Fields
                </button>
                <button 
                    class="px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${this.mode === 'input' ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-100' : 'text-muted/60 hover:text-white scale-[0.98]'}"
                    @click=${() => {
                        this.mode = 'input';
                        this.rawConfig = JSON.stringify(this.config, null, 2);
                    }}
                >
                    JSON
                </button>
            </div>

            ${this.mode === 'input' ? html`
                <button 
                    class="text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-all py-2 px-4 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95"
                    @click=${this.beautifyJson}
                >
                    Format Code
                </button>
            ` : ""}
        </div>

        <!-- Content Area -->
        <div class="px-8 py-8 max-h-[60vh] overflow-y-auto custom-scrollbar bg-linear-to-b from-transparent to-black/10">
          ${this.loading ? html`
            <div class="flex flex-col items-center justify-center p-20 gap-5">
              <div class="relative">
                <div class="absolute inset-0 rounded-full border-2 border-primary/20 blur-sm"></div>
                <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-primary relative z-10"></div>
              </div>
              <div class="text-primary/40 text-xs font-black uppercase tracking-[0.2em] animate-pulse">${t("app.loading")}</div>
            </div>
          ` : ""}
          
          ${this.error ? html`
            <div class="bg-danger/10 border border-danger/20 p-5 rounded-2xl text-danger text-sm mb-8 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-xl shadow-danger/5">
              <div class="mt-0.5 transform scale-125">${INFO_ICON}</div>
              <div class="flex-1 font-bold leading-relaxed">${this.error}</div>
            </div>
          ` : ""}

          ${!this.loading && this.mode === "input" ? html`
            <div class="relative group animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div class="absolute -inset-1 bg-linear-to-r from-primary/5 to-primary/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-1000"></div>
              <textarea
                class="relative w-full h-[350px] bg-[#0d0d0d]/80 border border-white/5 rounded-2xl px-6 py-6 text-[#d4d4d4] font-mono text-[13px] leading-relaxed transition-all duration-300 focus:border-primary/50 focus:bg-black outline-none resize-none focus:ring-12 focus:ring-primary/5 select-all custom-scrollbar overflow-y-auto"
                .value=${this.rawConfig}
                @input=${this.handleRawConfigChange}
                placeholder="{ \"key\": \"value\" }"
                spellcheck="false"
              ></textarea>
              <div class="absolute bottom-4 right-6 text-[10px] font-black text-white/10 uppercase tracking-widest pointer-events-none group-focus-within:text-primary/20 transition-colors">
                JSON Editor
              </div>
            </div>
          ` : ""}

          ${!this.loading && this.mode === "fields" ? html`
            <div class="grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-4">
              ${Object.entries(this.config).length === 0 ? html`
                <div class="text-center text-muted/40 p-12 flex flex-col items-center gap-6 bg-white/2 rounded-[32px] border border-dashed border-white/10 mx-4">
                  <div class="opacity-10 scale-[2.5] transform rotate-12">${INFO_ICON}</div>
                  <p class="max-w-[240px] text-xs font-bold uppercase tracking-widest leading-loose">
                    ${t("app.noConfigFields")}
                  </p>
                </div>
              ` : Object.entries(this.config).map(([key, value]) => this.renderField(key, value))}
            </div>
          ` : ""}
        </div>

        <!-- Footer -->
        <div class="px-8 py-5 border-t border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md">
            <div class="flex gap-3 w-full sm:w-auto">
              <button 
                class="flex-1 sm:flex-none px-6 py-3 rounded-2xl border border-white/10 text-muted/60 font-black text-[11px] uppercase tracking-widest transition-all duration-200 hover:bg-white/5 hover:text-white active:scale-95 disabled:opacity-50" 
                @click=${this.close}
                ?disabled=${this.saving}
              >
                ${t("app.cancel")}
              </button>
              <button 
                class="flex-1 sm:flex-none px-12 py-3 rounded-2xl bg-primary text-white font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-primary/30 transition-all duration-300 hover:scale-[1.02] hover:brightness-110 active:scale-95 disabled:opacity-50 min-w-[160px] flex items-center justify-center gap-2 overflow-hidden group" 
                @click=${this.save}
                ?disabled=${this.saving || this.loading}
              >
                ${this.saving ? html`
                  <div class="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                  <span class="animate-pulse">${t("app.saving") || "Saving..."}</span>
                ` : html`
                  <span class="group-hover:-translate-y-[2px] transition-transform duration-300">${CHECK_ICON}</span>
                  <span class="group-hover:translate-x-[2px] transition-transform duration-300">${t("app.save")}</span>
                `}
              </button>
            </div>
        </div>
      </dialog>
      
      <style>
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid transparent;
          background-clip: padding-box;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "plugin-config-modal": PluginConfigModal;
  }
}
