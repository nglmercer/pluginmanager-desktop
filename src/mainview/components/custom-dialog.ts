import { LitElement, html, css } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { baseStyles, tailwindStyles } from "../styles/index.js";

/**
 * Custom Dialog Component
 * Implements Alert, Confirm, and Prompt functionality using Lit
 */
@customElement("custom-dialog")
export class CustomDialog extends LitElement {
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

      /* Custom input focus ring since global styles might be limited */
      input:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--primary-color);
      }
    `,
  ];

  @state() private dialogTitle: string = "";
  @state() private message: string = "";
  @state() private value: string = "";
  @state() private type: "alert" | "confirm" | "prompt" = "alert";
  @state() private placeholder: string = "";

  @query("dialog") private _dialog!: HTMLDialogElement;
  @query("input") private _input?: HTMLInputElement;

  private _resolve: ((value: any) => void) | null = null;

  /**
   * Show the dialog and return a promise that resolves with the user's action
   */
  async show(options: {
    title?: string;
    message: string;
    value?: string;
    placeholder?: string;
    type: "alert" | "confirm" | "prompt";
  }): Promise<any> {
    this.dialogTitle = options.title || this.getDefaultTitle(options.type);
    this.message = options.message;
    this.value = options.value || "";
    this.placeholder = options.placeholder || "";
    this.type = options.type;

    // Ensure rendering is done before accessing shadow DOM elements
    await this.updateComplete;

    return new Promise((resolve) => {
      this._resolve = resolve;
      this._dialog.showModal();
      
      // Auto-focus input for prompt
      if (this.type === "prompt") {
        setTimeout(() => this._input?.focus(), 50);
      }
    });
  }

  private getDefaultTitle(type: string): string {
    switch (type) {
      case "alert": return "Notification";
      case "confirm": return "Confirmation";
      case "prompt": return "Input Required";
      default: return "Dialog";
    }
  }

  private handleCancel() {
    this._dialog.close();
    if (this._resolve) {
      this._resolve(this.type === "confirm" ? false : null);
      this._resolve = null;
    }
  }

  private handleConfirm() {
    const result = this.type === "prompt" ? this.value : true;
    this._dialog.close();
    if (this._resolve) {
      this._resolve(result);
      this._resolve = null;
    }
  }

  private handleInput(e: Event) {
    this.value = (e.target as HTMLInputElement).value;
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      this.handleConfirm();
    } else if (e.key === "Escape") {
      this.handleCancel();
    }
  }

  render() {
    return html`
      <dialog 
        class="bg-card/80 backdrop-blur-md border border-border rounded-2xl text-primary p-0 w-[90%] max-w-[400px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] m-auto overflow-hidden ring-1 ring-white/10"
        @cancel=${this.handleCancel}
      >
        <div class="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-white/5">
          <h3 class="m-0 text-lg font-semibold tracking-tight text-primary">${this.dialogTitle}</h3>
        </div>
        
        <div class="px-6 py-6">
          <div class="text-[15px] leading-relaxed text-muted mb-4">${this.message}</div>
          
          ${this.type === "prompt"
            ? html`
                <div class="relative group">
                  <input
                    type="text"
                    class="w-full bg-input border border-border rounded-xl px-4 py-3 text-primary transition-all duration-200 group-hover:border-primary/50 focus:border-primary focus:bg-background"
                    .value=${this.value}
                    .placeholder=${this.placeholder}
                    @input=${this.handleInput}
                    @keydown=${this.handleKeyDown}
                    spellcheck="false"
                  />
                  <div class="absolute inset-0 rounded-xl pointer-events-none transition-opacity opacity-0 group-focus-within:opacity-100 ring-2 ring-primary/20"></div>
                </div>
              `
            : ""}
        </div>

        <div class="px-6 py-4 border-t border-border/50 flex justify-end gap-3 bg-black/10">
          ${this.type !== "alert"
            ? html`
                <button 
                  class="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-border text-muted font-medium transition-all duration-200 hover:bg-hover hover:text-primary active:scale-95" 
                  @click=${this.handleCancel}
                >
                  Cancel
                </button>
              `
            : ""}
          <button 
            class="flex-1 sm:flex-none px-8 py-2.5 rounded-xl bg-primary text-white font-semibold shadow-lg shadow-primary/20 transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-50" 
            @click=${this.handleConfirm}
          >
            ${this.type === "alert" ? "OK" : "Confirm"}
          </button>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "custom-dialog": CustomDialog;
  }
}
