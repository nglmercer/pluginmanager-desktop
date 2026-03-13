import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

// Import theme system
import { darkTheme, generateThemeCSS, baseStyles } from "../styles/index.js";

/**
 * Plugin Upload Component
 * Handles uploading plugin ZIP files
 */
@customElement("plugin-upload")
export class PluginUpload extends LitElement {
  static styles = [
    css`:host {${generateThemeCSS(darkTheme)}}`,
    baseStyles,
    css`
    p {
      color: var(--text-muted);
      margin-bottom: 15px;
    }

    input[type="file"] {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      z-index: 2;
    }

    input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .drop-zone {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 2px dashed var(--border-color);
      border-radius: 8px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      overflow: hidden;
      transition: border-color 0.2s, background 0.2s;
    }

    .drop-zone:hover {
      border-color: var(--primary-color);
      background: var(--primary-muted);
    }

    .drop-zone.drag-over {
      border-color: var(--primary-color);
      background: var(--primary-muted);
    }

    .drop-zone svg {
      width: 48px;
      height: 48px;
      color: var(--text-muted);
      margin-bottom: 15px;
    }

    .drop-zone p {
      margin: 0;
      color: var(--text-muted);
    }

    .drop-zone .browse {
      color: var(--primary-color);
      text-decoration: underline;
    }

    .selected-file {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      background: var(--bg-color);
      border-radius: 6px;
      margin-bottom: 15px;
    }

    .selected-file svg {
      width: 24px;
      height: 24px;
      color: var(--primary-color);
    }

    .selected-file .file-name {
      flex: 1;
      color: var(--text-color);
    }

    .selected-file .remove-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
    }

    .selected-file .remove-btn:hover {
      color: var(--danger-color);
    }
  `
  ];

  @property({ type: Boolean }) loading: boolean = false;
  @property({ type: String }) selectedFile: string = "";
  @property({ type: String }) error: string = "";
  @property({ type: String }) success: string = "";

  private fileData: File | null = null;

  private handleFileSelect(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileData = input.files[0];
      this.selectedFile = input.files[0].name;
      this.dispatchEvent(
        new CustomEvent("file-selected", {
          detail: { file: input.files[0] },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private handleRemoveFile(): void {
    this.selectedFile = "";
    this.fileData = null;
    this.dispatchEvent(
      new CustomEvent("file-removed", {
        detail: {},
        bubbles: true,
        composed: true,
      })
    );
  }

  private async handleUpload(): Promise<void> {
    if (!this.fileData) return;

    this.loading = true;
    this.error = "";
    this.success = "";

    try {
      // Read file as base64
      console.log("Uploading file:", this.fileData);
      const base64 = await this.fileToBase64(this.fileData);
      
      // Import electroview dynamically to avoid circular imports
      const { electroview } = await import("../rpc.js");
      
      const result = await electroview.rpc!.request.uploadPlugin({
        fileName: this.fileData.name,
        base64Data: base64,
      }) as { success: boolean; pluginName?: string; error?: string };

      if (result?.success) {
        this.success = `Successfully installed ${result.pluginName}`;
        this.selectedFile = "";
        this.fileData = null;
        this.dispatchEvent(
          new CustomEvent("upload-success", {
            detail: { pluginName: result.pluginName },
            bubbles: true,
            composed: true,
          })
        );
      } else {
        this.error = result?.error || "Upload failed";
      }
    } catch (e: unknown) {
      this.error = (e as Error).message || "Upload failed";
    } finally {
      this.loading = false;
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/zip;base64,")
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  render() {
    return html`
      <div class="card">
        <h3>Upload Plugin (ZIP)</h3>
        <p>
          Upload a plugin as a ZIP file. The plugin will be extracted to the
          plugins directory.
        </p>

        ${this.selectedFile
          ? html`
              <div class="selected-file">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span class="file-name">${this.selectedFile}</span>
                <button class="remove-btn" @click=${this.handleRemoveFile}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <button
                class="btn-primary"
                ?disabled=${this.loading}
                @click=${this.handleUpload}
              >
                ${this.loading ? "Installing..." : "Install Plugin"}
              </button>
            `
          : html`
              <div class="drop-zone">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p>
                  Drag and drop your ZIP file here, or
                  <span class="browse">browse</span>
                </p>
                <input
                  type="file"
                  accept=".zip"
                  ?disabled=${this.loading}
                  @change=${this.handleFileSelect}
                />
              </div>
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "plugin-upload": PluginUpload;
  }
}
