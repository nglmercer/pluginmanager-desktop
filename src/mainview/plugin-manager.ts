import { LitElement, html, css } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { electroview } from "./rpc.js";
import type { GitHubRelease, GitHubAsset, PluginInfo, InstallResult, RemoveResult } from "./types.js";

// Import modular components
import { PluginTabs } from "./components/plugin-tabs.js";
import { PluginList } from "./components/plugin-list.js";
import { GitHubSearch } from "./components/github-search.js";
import { PluginUpload } from "./components/plugin-upload.js";

// Import theme system
import { getThemeManager, baseStyles } from "./styles/index.js";

// Register the child components
import "./components/plugin-tabs.js";
import "./components/plugin-list.js";
import "./components/github-search.js";
import "./components/plugin-upload.js";

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

  @state() private activeTab: string = "installed";
  @state() private plugins: PluginInfo[] = [];
  @state() private releases: GitHubRelease[] = [];
  @state() private loading: boolean = false;
  @state() private error: string = "";
  @state() private success: string = "";
  @state() private githubRepo: string = "";
  @state() private selectedRelease: GitHubRelease | null = null;
  @state() private selectedAsset: GitHubAsset | null = null;
  //@ts-expect-error
  @query("plugin-tabs") private _tabsElement!: PluginTabs;
  //@ts-expect-error
  @query("plugin-list") private _listElement!: PluginList;
  //@ts-expect-error
  @query("github-search") private _searchElement!: GitHubSearch;
  //@ts-expect-error
  @query("plugin-upload") private _uploadElement!: PluginUpload;

  private themeManager = getThemeManager();
  private _themeUnsubscribe?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this.loadPlugins();
    this._themeUnsubscribe = this.themeManager.subscribe(() => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._themeUnsubscribe) {
      this._themeUnsubscribe();
    }
  }

  private async loadPlugins(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      const result = await electroview.rpc!.request.listInstalledPlugins({}) as PluginInfo[];
      this.plugins = result || [];
    } catch (e: unknown) {
      this.error = `Failed to load plugins: ${(e as Error).message}`;
    } finally {
      this.loading = false;
    }
  }

  private async loadReleases(): Promise<void> {
    const repo = this.githubRepo.trim();
    if (!repo) {
      this.error = "Please enter a GitHub repository (owner/repo)";
      return;
    }

    this.loading = true;
    this.error = "";
    this.releases = [];
    this.selectedRelease = null;
    this.selectedAsset = null;

    try {
      const result = await electroview.rpc!.request.getGitHubReleases({
        repo,
      }) as GitHubRelease[];
      this.releases = result || [];
    } catch (e: unknown) {
      this.error = (e as Error).message || "Failed to load releases";
    } finally {
      this.loading = false;
    }
  }

  private async installFromGitHub(
    repo: string,
    asset: GitHubAsset
  ): Promise<void> {
    if (!asset) {
      this.error = "Please select an asset to install";
      return;
    }

    this.loading = true;
    this.error = "";
    this.success = "";

    try {
      const result = await electroview.rpc!.request.installFromGitHub({
        repo,
        version: undefined,
        assetName: asset.name,
      }) as InstallResult;

      if (result?.success) {
        this.success = `Successfully installed ${result.pluginName}@${result.version}`;
        this.activeTab = "installed";
        await this.loadPlugins();
      } else {
        this.error = result?.error || "Installation failed";
      }
    } catch (e: unknown) {
      this.error = (e as Error).message || "Installation failed";
    } finally {
      this.loading = false;
    }
  }

  private async removePlugin(pluginName: string): Promise<void> {
    if (!confirm(`Are you sure you want to remove "${pluginName}"?`)) {
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

  private handleTabChange(e: CustomEvent<{ tabId: string }>): void {
    this.activeTab = e.detail.tabId;
  }

  private handlePluginRemove(e: CustomEvent<{ pluginName: string }>): void {
    this.removePlugin(e.detail.pluginName);
  }

  private handleGitHubSearch(e: CustomEvent<{ repo: string }>): void {
    this.githubRepo = e.detail.repo;
    this.loadReleases();
  }

  private handleGitHubInstall(
    e: CustomEvent<{ repo: string; asset: GitHubAsset }>
  ): void {
    this.installFromGitHub(e.detail.repo, e.detail.asset);
  }

  private handleUploadSuccess(e: CustomEvent<{ pluginName: string }>): void {
    this.success = `Successfully installed ${e.detail.pluginName}`;
    this.activeTab = "installed";
    this.loadPlugins();
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

        <plugin-tabs
          .activeTab=${this.activeTab}
          .tabs=${
            [
              { id: "installed", label: "Installed Plugins", count: this.plugins.length },
              { id: "github", label: "Install from GitHub" },
              { id: "upload", label: "Upload ZIP" },
            ]
          }
          @tab-change=${this.handleTabChange}
        ></plugin-tabs>

        ${this.error ? html`<div class="message error">${this.error}</div>` : ""}
        ${this.success
          ? html`<div class="message success">${this.success}</div>`
          : ""}

        ${this.activeTab === "installed"
          ? html`
              <plugin-list
                .plugins=${this.plugins}
                .loading=${this.loading}
                @plugin-remove=${this.handlePluginRemove}
              ></plugin-list>
            `
          : ""}

        ${this.activeTab === "github"
          ? html`
              <github-search
                .releases=${this.releases}
                .selectedRelease=${this.selectedRelease}
                .selectedAsset=${this.selectedAsset}
                .loading=${this.loading}
                .error=${this.error}
                .success=${this.success}
                @github-search=${this.handleGitHubSearch}
                @github-install=${this.handleGitHubInstall}
              ></github-search>
            `
          : ""}

        ${this.activeTab === "upload"
          ? html`
              <plugin-upload
                .loading=${this.loading}
                @upload-success=${this.handleUploadSuccess}
              ></plugin-upload>
            `
          : ""}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "plugin-manager": PluginManager;
  }
}
