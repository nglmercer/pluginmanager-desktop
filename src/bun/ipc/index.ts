import { BrowserView, BrowserWindow } from "electrobun/bun";
import { BasePluginManager } from "../manager/baseplugin";
import { PLATFORMS } from "../constants";
import { pluginAPI } from "../manager/plugin-api";
import { join } from "node:path";
import * as fs from "node:fs";

/**
 * Plugin information for IPC
 */
export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
}

/**
 * Plugin status for IPC
 */
export interface PluginStatus {
  id: string;
  loaded: boolean;
  enabled: boolean;
  error?: string;
}

/**
 * Rule information for IPC
 */
export interface RuleInfo {
  id: string;
  platform: string;
  enabled: boolean;
}

/**
 * Window status for IPC
 */
export interface WindowStatus {
  isOpen: boolean;
  isFocused: boolean;
}

/**
 * IPC Handler for Plugin Manager
 * Manages communication between Bun (plugins) and WebView (UI)
 */
export class IpcHandler {
  private window: BrowserWindow | null = null;
  private manager: BasePluginManager | null = null;
  private rpc: ReturnType<typeof BrowserView.defineRPC> | null = null;

  /**
   * Initialize IPC with plugin manager
   */
  initialize(managerInstance: BasePluginManager): void {
    this.manager = managerInstance;
    this.setupRpc();
    this.setupEventListeners();
  }

  /**
   * Set the browser window for IPC communication
   */
  setWindow(win: BrowserWindow): void {
    this.window = win;
  }

  /**
   * Setup RPC handlers (Bun side - handles requests FROM webview)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setupRpc(): void {
    // Define RPC for handling requests from webview
    this.rpc = BrowserView.defineRPC({
      handlers: {
        // Requests from webview to Bun
        requests: {
          // Get all loaded plugins
          getPlugins: (): PluginInfo[] => {
            if (!this.manager) return [];
            const plugins = this.manager.listPlugins();
            return plugins.map((id) => ({
              id,
              name: id,
              version: "1.0.0",
              enabled: true,
            }));
          },

          // Get specific plugin status
          getPluginStatus: (params: any): PluginStatus => {
            const pluginId = params?.pluginId || "";
            if (!this.manager) {
              return { id: pluginId, loaded: false, enabled: false, error: "No manager" };
            }
            try {
              const plugin = this.manager.getPlugin(pluginId);
              return {
                id: pluginId,
                loaded: !!plugin,
                enabled: true,
              };
            } catch (error) {
              return {
                id: pluginId,
                loaded: false,
                enabled: false,
                error: String(error),
              };
            }
          },

          // Reload a plugin
          reloadPlugin: (_params: any): boolean => {
            if (!this.manager) return false;
            try {
              this.manager.enableHotReload(this.manager.pluginsDir);
              return true;
            } catch {
              return false;
            }
          },

          // Get all rules
          getRules: (): RuleInfo[] => {
            if (!this.manager) return [];
            const rules = this.manager.engine.getRules();
            return rules.map((rule: any) => ({
              id: rule.id,
              platform: "unknown",
              enabled: rule.enabled ?? true,
            }));
          },

          // Get window status
          getWindowStatus: (): WindowStatus => {
            return {
              isOpen: this.window !== null,
              isFocused: this.window !== null,
            };
          },

          // ===== Plugin Installer API =====

          // List installed plugins
          listInstalledPlugins: () => {
            return pluginAPI.listPlugins(this.manager!);
          },

          // Install plugin from GitHub
          installFromGitHub: async (params: unknown) => {
            const p = params as { repo: string; version?: string; assetName?: string };
            return await pluginAPI.installFromGitHub({
              repo: p.repo,
              version: p.version,
              assetName: p.assetName,
            });
          },

          // Install plugin from zip
          installFromZip: async (params: unknown) => {
            const p = params as { zipPath: string; pluginName?: string };
            return await pluginAPI.installFromZip(p.zipPath, p.pluginName);
          },

          // Remove plugin
          removePlugin: (params: unknown) => {
            const p = params as { pluginName: string };
            return pluginAPI.removePlugin(p.pluginName);
          },

          // Get GitHub releases
          getGitHubReleases: async (params: unknown) => {
            const p = params as { repo: string };
            return await pluginAPI.getGitHubReleases(p.repo);
          },

          // Get latest GitHub release
          getLatestRelease: async (params: unknown) => {
            const p = params as { repo: string };
            return await pluginAPI.getLatestRelease(p.repo);
          },

          // Get plugins directory
          getPluginsDir: (): string => {
            return pluginAPI.getPluginsDir();
          },

          // ===== Plugin Management =====

          // Search plugins by name
          searchPlugins: (params: unknown) => {
            const p = params as { query: string };
            const plugins = pluginAPI.listPlugins(this.manager!);
            if (!p.query) return plugins;
            const query = p.query.toLowerCase();
            return plugins.filter(
              (plugin) =>
                plugin.name?.toLowerCase().includes(query) ||
                plugin.id?.toLowerCase().includes(query) ||
                plugin.version?.toLowerCase().includes(query)
            );
          },

          // Check if plugin is installed
          isPluginInstalled: (params: unknown) => {
            const p = params as { pluginName: string };
            return pluginAPI.isPluginInstalled(p.pluginName);
          },

          // Upload plugin from webview (receives base64 encoded zip)
          uploadPlugin: async (params: unknown) => {
            const p = params as { fileName: string; base64Data: string };
            const tempDir = join(pluginAPI.getPluginsDir(), ".temp");
            const tempPath = join(tempDir, p.fileName);
            
            // Ensure temp directory exists
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }
            
            // Write file
            const buffer = new Uint8Array(Buffer.from(p.base64Data, "base64"));
            fs.writeFileSync(tempPath, buffer);
            
            // Install from the temp file - don't pass pluginName so installer can detect it
            const result = await pluginAPI.installFromZip(tempPath);
            
            // Clean up temp file
            try {
              if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
              }
            } catch (e) {
              console.log("[IPC] Could not remove temp file:", e);
            }
            
            return result;
          },
        },
        // Messages from webview to Bun
        messages: {
          "*": (messageName: string, payload: any) => {
            console.log(`[IPC] Message from webview: ${messageName}`, payload);
          },
        },
      },
    });
  }

  /**
   * Setup event listeners for plugin manager events
   */
  private setupEventListeners(): void {
    if (!this.manager) return;

    // Listen for all platform events
    Object.values(PLATFORMS).forEach((platform) => {
      this.manager!.on(platform, async (event) => {
        // Send event to webview if connected
        this.broadcastToWebview("eventReceived", {
          platform,
          eventName: event.eventName,
          data: event.data,
        });
      });
    });
  }

  /**
   * Broadcast message to webview
   */
  broadcastToWebview(eventName: string, data: any): void {
    if (this.window?.webview) {
      try {
        // Execute JS in webview to dispatch event
        this.window.webview.executeJavascript(`
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('${eventName}', { detail: ${JSON.stringify(data)} }));
          }
        `);
      } catch (e) {
        console.log("[IPC] Could not send to webview:", e);
      }
    }
  }

  /**
   * Notify webview of plugin loaded
   */
  notifyPluginLoaded(pluginId: string, name: string): void {
    this.broadcastToWebview("pluginLoaded", { pluginId, name });
  }

  /**
   * Notify webview of plugin error
   */
  notifyPluginError(pluginId: string, error: string): void {
    this.broadcastToWebview("pluginError", { pluginId, error });
  }

  /**
   * Get the window reference
   */
  getWindow(): BrowserWindow | null {
    return this.window;
  }

  /**
   * Check if window is open
   */
  isWindowOpen(): boolean {
    return this.window !== null;
  }

  /**
   * Close the IPC window
   */
  closeWindow(): void {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }

  /**
   * Create and open the window
   */
  openWindow(url: string): BrowserWindow {
    this.window = new BrowserWindow({
      title: "Plugin Manager",
      url,
      frame: { width: 1200, height: 800, x: 100, y: 100 },
      titleBarStyle: "default",
      rpc: this.rpc ?? undefined,
    });
    return this.window;
  }

  /**
   * Focus the window
   */
  focusWindow(): void {
    if (this.window) {
      this.window.focus();
    }
  }
}

// Singleton instance
export const ipcHandler = new IpcHandler();
