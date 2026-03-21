import { LitElement, html } from "lit";
import { customElement, query } from "lit/decorators.js";
import { translate as t } from "lit-i18n";
import { i18next } from "../i18n.js";
import { getThemeManager, CLOSE_ICON, CHEVRON_DOWN_ICON } from "../styles/index.js";

/**
 * Settings Modal Component
 * Allows users to change theme and language
 */
@customElement("settings-modal")
export class SettingsModal extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @query("dialog") private _dialog!: HTMLDialogElement;

  private themeManager = getThemeManager();
  private _themeUnsubscribe?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this._themeUnsubscribe = this.themeManager.subscribe(() => {
       this.requestUpdate();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._themeUnsubscribe) {
      this._themeUnsubscribe();
    }
  }

  open() {
    this._dialog.showModal();
  }

  close() {
    this._dialog.close();
  }

  private handleThemeChange(mode: "light" | "dark") {
    if (this.themeManager.getMode() !== mode) {
      this.themeManager.toggleTheme();
      this.requestUpdate();
      this.dispatchEvent(new CustomEvent("settings-changed", { bubbles: true, composed: true }));
    }
  }

  private handleLangChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    i18next.changeLanguage(target.value);
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent("settings-changed", { bubbles: true, composed: true }));
  }

  render() {
    const currentMode = this.themeManager.getMode();

    return html`
      <dialog 
        class="bg-card/80 backdrop-blur-md border border-border rounded-2xl text-primary p-0 w-[90%] max-w-[400px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] m-auto overflow-hidden ring-1 ring-white/10"
        @click=${(e: MouseEvent) => e.target === this._dialog && this.close()}
      >
        <div class="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-white/5">
          <h3 class="m-0 text-lg font-semibold tracking-tight text-primary">${t("app.settings")}</h3>
          <button 
            class="text-muted hover:text-primary transition-colors p-2 rounded-full hover:bg-white/5" 
            @click=${this.close}
          >
            ${CLOSE_ICON}
          </button>
        </div>
        
        <div class="px-6 py-6">
          <div class="mb-8">
            <label class="block text-sm font-bold text-muted uppercase tracking-wider mb-4 px-1">${t("app.theme")}</label>
            <div class="grid grid-cols-2 gap-4">
              <button
                class="p-4 border rounded-2xl flex flex-col items-center gap-2 transition-all duration-300 group ${currentMode === "light" ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-input border-border text-muted hover:border-primary/50"}"
                @click=${() => this.handleThemeChange("light")}
              >
                <span class="text-2xl transform transition-transform group-hover:scale-110 group-active:scale-90">☀️</span>
                <span class="font-semibold text-xs">${t("app.themeLight")}</span>
              </button>
              <button
                class="p-4 border rounded-2xl flex flex-col items-center gap-2 transition-all duration-300 group ${currentMode === "dark" ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-input border-border text-muted hover:border-primary/50"}"
                @click=${() => this.handleThemeChange("dark")}
              >
                <span class="text-2xl transform transition-transform group-hover:scale-110 group-active:scale-90">🌙</span>
                <span class="font-semibold text-xs">${t("app.themeDark")}</span>
              </button>
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-bold text-muted uppercase tracking-wider mb-4 px-1">${t("app.language")}</label>
            <div class="relative group">
                <select 
                    class="appearance-none w-full bg-input border border-border rounded-xl px-5 py-3.5 text-primary font-medium cursor-pointer transition-all duration-200 hover:border-primary/50 focus:border-primary focus:bg-background" 
                    @change=${this.handleLangChange} 
                    .value=${i18next.language}
                >
                  <option value="en">English (US)</option>
                  <option value="es">Español (ES)</option>
                </select>
                <div class="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted group-hover:text-primary transition-colors">
                   ${CHEVRON_DOWN_ICON}
                 </div>
            </div>
          </div>
          
          <div class="mt-8 flex justify-end">
              <button 
                class="w-full sm:w-auto px-10 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 transition-all duration-200 hover:brightness-110 active:scale-95" 
                @click=${this.close}
              >
                ${t("app.close")}
              </button>
          </div>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "settings-modal": SettingsModal;
  }
}
