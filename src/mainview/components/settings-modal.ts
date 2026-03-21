import { LitElement, html, css } from "lit";
import { customElement, query } from "lit/decorators.js";
import { translate as t } from "lit-i18n";
import { i18next } from "../i18n.js";
import { getThemeManager, baseStyles, tailwindStyles } from "../styles/index.js";

/**
 * Settings Modal Component
 * Allows users to change theme and language
 */
@customElement("settings-modal")
export class SettingsModal extends LitElement {
  static styles = [
    tailwindStyles,
    baseStyles,
    css`
      dialog::backdrop {
        background: var(--overlay-bg);
        backdrop-filter: blur(8px);
        animation: backdrop-fade-in 0.3s ease-out;
      }

      @keyframes backdrop-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      dialog[open] {
        animation: dialog-slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes dialog-slide-up {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      select:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--primary-color);
      }
    `,
  ];

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
             <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
               <path d="M18 6L6 18M6 6l12 12"></path>
             </svg>
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
                   <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                     <path d="M6 9l6 6 6-6"></path>
                   </svg>
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
