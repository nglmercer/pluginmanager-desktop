import { BrowserView, BrowserWindow, Utils } from "electrobun/bun";
import { BasePluginManager } from "../manager/baseplugin";
import { PLATFORMS } from "../constants";
import { pluginAPI } from "../manager/plugin-api";
import { PLUGIN_NAMES } from "../constants";
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
   * Helper to handle async operations by returning an ID to the frontend
   */
  private handleAsync(promise: Promise<any>): { type: 'async_id'; id: string } {
    const id = Math.random().toString(36).substring(7);
    promise.then(data => {
      if (this.window?.webview?.rpc) {
        // @ts-ignore
        this.window.webview.rpc.send.asyncResponse({ id, data });
      }
    }).catch(error => {
      if (this.window?.webview?.rpc) {
        // @ts-ignore
        this.window.webview.rpc.send.asyncResponse({ id, error: String(error) });
      }
    });
    return { type: 'async_id', id };
  }

  /**
   * Setup RPC handlers (Bun side - handles requests FROM webview)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setupRpc(): void {
    // Define RPC for handling requests from webview
    this.rpc = BrowserView.defineRPC({
      handlers: {
        requests: {
          // ===== Plugin Management API =====

          // Get all loaded plugins
          getPlugins: (): PluginInfo[] => {
            if (!this.manager) return [];
            const plugins = this.manager.listPlugins();
            // import const filter,for core plugin or default plugins
            if (plugins.includes(PLUGIN_NAMES.ACTION_REGISTRY)) {
              plugins.splice(plugins.indexOf(PLUGIN_NAMES.ACTION_REGISTRY), 1);
            }
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

          // Remove plugin
          removePlugin: (params: unknown) => {
            const p = params as { pluginName: string };
            return this.handleAsync(pluginAPI.removePlugin(p.pluginName));
          },

          // Get plugins directory
          getPluginsDir: (): string => {
            return pluginAPI.getPluginsDir();
          },

          // Open plugins folder in file explorer
          openPluginsFolder: () => {
             return this.handleAsync((async () => {
               const pluginsDir = pluginAPI.getPluginsDir();
               console.log(`[IPC] Opening plugins folder: ${pluginsDir}`);
               try {
                 // In Electrobun, showItemInFolder opens the parent and highlights the item, 
                 // but if we pass a directory, it usually opens that directory.
                 return Utils.showItemInFolder(pluginsDir);
               } catch (e) {
                 console.error("[IPC] Failed to open plugins folder:", e);
                 return false;
               }
             })());
          },

          // Get window status
          getWindowStatus: (): WindowStatus => {
            return {
              isOpen: this.window !== null,
              isFocused: this.window !== null,
            };
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
