import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { GitHubRelease, GitHubAsset } from "../types.js";

// Import theme system
import { baseStyles } from "../styles/index.js";

interface GitHubInstallDetail {
  repo: string;
  asset: GitHubAsset;
}

/**
 * GitHub Search Component
 * Handles searching and installing plugins from GitHub releases
 */
@customElement("github-search")
export class GitHubSearch extends LitElement {
  static styles = [
    baseStyles,
    css`
    .card {
      background: var(--card-bg);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
      border: 1px solid var(--border-color);
    }

    .card h3 {
      margin: 0 0 15px 0;
      color: var(--text-color);
      font-size: 1.1rem;
    }

    .release-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 400px;
      overflow-y: auto;
    }

    .release-item {
      padding: 12px;
      background: var(--bg-color);
      border-radius: 6px;
      border: 1px solid var(--border-color);
      cursor: pointer;
    }

    .release-item:hover {
      border-color: var(--primary-color);
    }

    .release-item.selected {
      border-color: var(--primary-color);
    }

    .release-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .release-tag {
      color: var(--primary-color);
      font-weight: 600;
    }

    .release-date {
      color: var(--text-muted);
      font-size: 12px;
    }

    .release-body {
      color: var(--text-muted);
      font-size: 13px;
      margin-bottom: 10px;
    }

    .asset-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }

    .asset-tag {
      background: var(--card-bg);
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      color: var(--text-color);
      cursor: pointer;
    }

    .asset-tag:hover {
      background: var(--primary-color);
      color: white;
    }

    .asset-tag.selected {
      background: var(--primary-color);
      color: white;
    }
  `
  ];

  @property({ type: Boolean }) loading: boolean = false;
  @property({ type: String }) error: string = "";
  @property({ type: String }) success: string = "";

  @state() private githubRepo: string = "";
  @state() private releases: GitHubRelease[] = [];
  @state() private selectedRelease: GitHubRelease | null = null;
  @state() private selectedAsset: GitHubAsset | null = null;

  private handleRepoInput(e: Event): void {
    this.githubRepo = (e.target as HTMLInputElement).value;
  }

  private handleSearch(): void {
    this.dispatchEvent(
      new CustomEvent("github-search", {
        detail: { repo: this.githubRepo },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleReleaseClick(release: GitHubRelease): void {
    this.selectedRelease = release;
    this.selectedAsset = release.assets[0] || null;
  }

  private handleAssetClick(e: Event, asset: GitHubAsset): void {
    e.stopPropagation();
    this.selectedAsset = asset;
  }

  private handleInstall(): void {
    if (!this.selectedAsset) return;
    
    this.dispatchEvent(
      new CustomEvent<GitHubInstallDetail>("github-install", {
        detail: {
          repo: this.githubRepo,
          asset: this.selectedAsset,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Update state from parent
   */
  updateState(data: {
    releases?: GitHubRelease[];
    selectedRelease?: GitHubRelease | null;
    selectedAsset?: GitHubAsset | null;
    loading?: boolean;
    error?: string;
    success?: string;
  }): void {
    if (data.releases !== undefined) this.releases = data.releases;
    if (data.selectedRelease !== undefined) this.selectedRelease = data.selectedRelease;
    if (data.selectedAsset !== undefined) this.selectedAsset = data.selectedAsset;
    if (data.loading !== undefined) this.loading = data.loading;
    if (data.error !== undefined) this.error = data.error;
    if (data.success !== undefined) this.success = data.success;
  }

  render() {
    return html`
      <div class="card">
        <h3>Install from GitHub</h3>
        <div class="form-group">
          <label>GitHub Repository (owner/repo)</label>
          <input
            type="text"
            placeholder="e.g., owner/plugin-repo"
            .value=${this.githubRepo}
            @input=${this.handleRepoInput}
          />
        </div>
        <button
          class="btn-primary"
          ?disabled=${this.loading}
          @click=${this.handleSearch}
        >
          Search Releases
        </button>
      </div>

      ${this.error ? html`<div class="message error">${this.error}</div>` : ""}
      ${this.success ? html`<div class="message success">${this.success}</div>` : ""}

      ${this.loading
        ? html`<div class="loading">Loading releases...</div>`
        : this.releases.length > 0
          ? html`
              <div class="card">
                <h3>Select Release</h3>
                <div class="release-list">
                  ${this.releases.map(
                    (release) => html`
                      <div
                        class="release-item ${this.selectedRelease?.id ===
                        release.id
                          ? "selected"
                          : ""}"
                        @click=${() => this.handleReleaseClick(release)}
                      >
                        <div class="release-header">
                          <span class="release-tag">${release.tag_name}</span>
                          <span class="release-date"
                            >${new Date(
                              release.published_at,
                            ).toLocaleDateString()}</span
                          >
                        </div>
                        ${release.name ? html`<div>${release.name}</div>` : ""}
                        ${release.body
                          ? html`<div class="release-body">
                              ${release.body.substring(0, 150)}...
                            </div>`
                          : ""}
                        ${release.assets.length > 0
                          ? html`
                              <div class="asset-list">
                                ${release.assets.map(
                                  (asset) => html`
                                    <span
                                      class="asset-tag ${this.selectedAsset?.id ===
                                      asset.id
                                        ? "selected"
                                        : ""}"
                                      @click=${(e: Event) =>
                                        this.handleAssetClick(e, asset)}
                                    >
                                      ${asset.name}
                                    </span>
                                  `,
                                )}
                              </div>
                            `
                          : ""}
                      </div>
                    `,
                  )}
                </div>
              </div>

              ${this.selectedAsset
                ? html`
                    <div class="card">
                      <button
                        class="btn-success"
                        ?disabled=${this.loading}
                        @click=${this.handleInstall}
                      >
                        ${this.loading
                          ? "Installing..."
                          : `Install ${this.selectedAsset.name}`}
                      </button>
                    </div>
                  `
                : ""}
            `
          : ""}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "github-search": GitHubSearch;
  }
}
