import { LitElement, html, css } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { electroview } from "./rpc.js";
import type { PluginInfo, RemoveResult } from "./types.js";

// Import modular components
import { PluginList } from "./components/plugin-list.js";

// Import theme system
import { getThemeManager, baseStyles } from "./styles/index.js";

// Register the child components
import "./components/plugin-list.js";

/**
 * Main Plugin Manager Component
 * Container component that orchestrates the plugin management UI
 */
@customElement("plugin-manager")
export class PluginManager extends LitElement {
  static styles = [
    baseStyles,
    css`
    .plugin-manager {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    h2 {
      color: var(--text-color);
      margin-bottom: 20px;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .message {
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 15px;
    }

    .error {
      color: var(--danger-color);
      background: var(--danger-muted);
    }

    .success {
      color: var(--success-color);
      background: var(--success-muted);
    }

    .theme-toggle {
      margin-left: auto;
      background: transparent;
      border: 1px solid var(--border-color);
      padding: 6px 10px;
      font-size: 16px;
      cursor: pointer;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .theme-toggle:hover {
      background: var(--hover-bg);
    }
  `
  ];

  @state() private plugins: PluginInfo[] = [];
  @state() private loading: boolean = false;
  @state() private error: string = "";
  @state() private success: string = "";

  //@ts-expect-error
  @query("plugin-list") private _listElement!: PluginList;

  private themeManager = getThemeManager();
  private _themeUnsubscribe?: () => void;
  private _pollInterval?: any;

  connectedCallback() {
    super.connectedCallback();
    this.loadPlugins();
    this._themeUnsubscribe = this.themeManager.subscribe(() => this.requestUpdate());
    
    // Poll for changes in plugins list as we now rely on manual management
    this._pollInterval = setInterval(() => this.loadPlugins(), 2000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._themeUnsubscribe) {
      this._themeUnsubscribe();
    }
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
    }
  }

  private async loadPlugins(): Promise<void> {
    try {
      const result = await electroview.rpc!.request.getPlugins({}) as PluginInfo[];
      this.plugins = result || [];
    } catch (e: unknown) {
      this.error = `Failed to load plugins: ${(e as Error).message}`;
    }
  }

  private async removePlugin(pluginName: string): Promise<void> {
    if (!confirm(`Are you sure you want to remove "${pluginName}"? This will delete the plugin folder permanently.`)) {
      return;
    }

    this.loading = true;
    this.error = "";
    this.success = "";

    try {
      const result = await electroview.rpc!.request.removePlugin({
        pluginName,
      }) as RemoveResult;

      if (result?.success) {
        this.success = `Successfully removed ${pluginName}`;
        await this.loadPlugins();
      } else {
        this.error = result?.error || "Removal failed";
      }
    } catch (e: unknown) {
      this.error = (e as Error).message || "Removal failed";
    } finally {
      this.loading = false;
    }
  }

  private handlePluginRemove(e: CustomEvent<{ pluginName: string }>): void {
    this.removePlugin(e.detail.pluginName);
  }

  /**
   * Toggle between light and dark themes
   */
  private toggleTheme(): void {
    this.themeManager.toggleTheme();
  }

  render() {
    return html`
      <div class="plugin-manager">
        <h2>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M20 7h-9M14 17H5M17 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM7 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            />
          </svg>
          Plugin Manager
          <button
            class="theme-toggle"
            @click=${this.toggleTheme}
            title="Toggle theme"
          >
            ${this.themeManager.getMode() === "dark"
              ? html`☀️`
              : html`🌙`}
          </button>
        </h2>

        ${this.error ? html`<div class="message error">${this.error}</div>` : ""}
        ${this.success
          ? html`<div class="message success">${this.success}</div>`
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
