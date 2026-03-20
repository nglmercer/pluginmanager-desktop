import { LitElement, html, css } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { baseStyles } from "../styles/index.js";

/**
 * Custom Dialog Component
 * Implements Alert, Confirm, and Prompt functionality using Lit
 */
@customElement("custom-dialog")
export class CustomDialog extends LitElement {
  static styles = [
    baseStyles,
    css`
      dialog {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        color: var(--text-color);
        padding: 0;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 10px 25px var(--shadow-color-strong);
        margin: auto;
        overflow: hidden;
      }

      dialog::backdrop {
        background: var(--overlay-bg);
        backdrop-filter: blur(4px);
      }

      .dialog-header {
        padding: 15px 20px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .dialog-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--text-color);
      }

      .dialog-content {
        padding: 20px;
      }

      .dialog-message {
        margin-bottom: 20px;
        line-height: 1.5;
        color: var(--text-color);
      }

      .dialog-footer {
        padding: 15px 20px;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        background: var(--bg-color);
      }

      input {
        width: 100%;
        margin-top: 10px;
      }

      .btn-cancel {
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-muted);
      }

      .btn-cancel:hover {
        background: var(--hover-bg);
        color: var(--text-color);
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
      <dialog @cancel=${this.handleCancel}>
        <div class="dialog-header">
          <h3>${this.dialogTitle}</h3>
        </div>
        <div class="dialog-content">
          <div class="dialog-message">${this.message}</div>
          ${this.type === "prompt"
            ? html`
                <input
                  type="text"
                  .value=${this.value}
                  .placeholder=${this.placeholder}
                  @input=${this.handleInput}
                  @keydown=${this.handleKeyDown}
                />
              `
            : ""}
        </div>
        <div class="dialog-footer">
          ${this.type !== "alert"
            ? html`
                <button class="btn-cancel" @click=${this.handleCancel}>
                  Cancel
                </button>
              `
            : ""}
          <button class="btn-primary" @click=${this.handleConfirm}>
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
