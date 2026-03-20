import { LitElement, html, css } from "lit";
import { customElement, query } from "lit/decorators.js";
import { translate as t } from "lit-i18n";
import { i18next } from "../i18n.js";
import { getThemeManager, baseStyles } from "../styles/index.js";

/**
 * Settings Modal Component
 * Allows users to change theme and language
 */
@customElement("settings-modal")
export class SettingsModal extends LitElement {
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
        border: 1px solid var(--border-color);
        margin: auto;
      }

      dialog::backdrop {
        background: var(--overlay-bg);
        backdrop-filter: blur(4px);
      }

      .modal-header {
        padding: 15px 20px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--text-color);
      }

      .modal-content {
        padding: 20px;
      }

      .settings-group {
        margin-bottom: 20px;
      }

      .settings-group label {
        font-weight: 600;
        margin-bottom: 10px;
        display: block;
        color: var(--text-color);
      }

      .theme-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .theme-btn {
        padding: 12px;
        border: 1px solid var(--border-color);
        background: var(--bg-color);
        color: var(--text-color);
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        transition: all 0.2s;
        font-size: 14px;
      }

      .theme-btn:hover {
        background: var(--hover-bg);
        border-color: var(--primary-color);
      }

      .theme-btn.active {
        background: var(--primary-muted);
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      .close-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 24px;
        line-height: 1;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        width: 32px;
        height: 32px;
      }

      .close-btn:hover {
        background: var(--hover-bg);
        color: var(--text-color);
      }

      select {
          cursor: pointer;
      }
    `,
  ];

  @query("dialog") private _dialog!: HTMLDialogElement;

  private themeManager = getThemeManager();

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
      <dialog @click=${(e: MouseEvent) => e.target === this._dialog && this.close()}>
        <div class="modal-header">
          <h3>${t("app.settings")}</h3>
          <button class="close-btn" @click=${this.close}>&times;</button>
        </div>
        <div class="modal-content">
          <div class="settings-group">
            <label>${t("app.theme")}</label>
            <div class="theme-options">
              <button
                class="theme-btn ${currentMode === "light" ? "active" : ""}"
                @click=${() => this.handleThemeChange("light")}
              >
                <span>☀️</span>
                <span>${t("app.themeLight")}</span>
              </button>
              <button
                class="theme-btn ${currentMode === "dark" ? "active" : ""}"
                @click=${() => this.handleThemeChange("dark")}
              >
                <span>🌙</span>
                <span>${t("app.themeDark")}</span>
              </button>
            </div>
          </div>

          <div class="settings-group">
            <label>${t("app.language")}</label>
            <select @change=${this.handleLangChange} .value=${i18next.language}>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
          
          <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
              <button class="btn-primary" @click=${this.close}>${t("app.close")}</button>
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
