import { BrowserView, BrowserWindow, Utils } from "electrobun/bun";
import { BasePluginManager } from "../manager/baseplugin";
import { PLATFORMS } from "../constants";
import { pluginAPI } from "../manager/plugin-api";
import { PLUGIN_NAMES } from "../constants";
import type { PluginManagerRPC, PluginInfo, PluginStatus, RuleInfo, WindowStatus } from "../../shared/types";

// This is the type of any RPC handler to help with complex typing
type RPCRequests = PluginManagerRPC['bun']['requests'];

/**
 * IPC Handler for Plugin Manager
 * Manages communication between Bun (plugins) and WebView (UI)
 */
export class IpcHandler {
  private window: BrowserWindow | null = null;
  private manager: BasePluginManager | null = null;
  // Type this as the result of defineRPC, using the full schema
  private rpc: ReturnType<typeof BrowserView.defineRPC<PluginManagerRPC>> | null = null;

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
  private handleAsync(promise: Promise<unknown>): { type: 'async_id'; id: string } {
    const id = Math.random().toString(36).substring(7);
    promise.then(data => {
      if (this.window?.webview?.rpc) {
        // @ts-ignore - electrobun's send method is dynamically typed via template strings
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
  private setupRpc(): void {
    if (!this.manager) {
        console.error("[IPC] Cannot setup RPC without a manager");
        return;
    }

    // Define RPC for handling requests from webview
    this.rpc = BrowserView.defineRPC<PluginManagerRPC>({
      handlers: {
        requests: {
          // ===== Plugin Management API =====

          // Get all loaded plugins
          getPlugins: (): PluginInfo[] => {
            if (!this.manager) return [];
            // filter core plugin or default plugins
            const pluginsInfo = this.manager.getPluginStatus();
            const pluginInfo = Object.entries(pluginsInfo).map(([key, value]) => ({
              id: key,
              name: value.name || key,
              version: value.version,
              status: value.status,
              enabled: value.enabled || value.status === 'active',
            }));
            const filteredPlugins = pluginInfo.filter((plugin) => plugin.id !== PLUGIN_NAMES.ACTION_REGISTRY);
            console.log(pluginInfo,filteredPlugins)
            return filteredPlugins;
          },

          // Get specific plugin status
          getPluginStatus: (params: RPCRequests['getPluginStatus']['params']): PluginStatus => {
            const pluginId = params.pluginId;
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
          reloadPlugin: (_params: RPCRequests['reloadPlugin']['params']): boolean => {
            if (!this.manager) return false;
            try {
              this.manager.enableHotReload(this.manager.pluginsDir);
              return true;
            } catch {
              return false;
            }
          },
          
          // Toggle Plugin
          togglePlugin: (params: RPCRequests['togglePlugin']['params']): boolean => {
            if (!this.manager) return false;
            try {
              void this.manager.togglePlugin(params.pluginName, params.enabled);
              return true;
            } catch {
              return false;
            }
          },
          
          // Get all rules
          getRules: (): RuleInfo[] => {
            if (!this.manager) return [];
            const rules = this.manager.engine.getRules();
            // We assume RuleEngine rules match our RuleInfo partially
            return rules.map((rule: { id: string, enabled?: boolean }) => ({
              id: rule.id,
              platform: "unknown",
              enabled: rule.enabled ?? true,
            }));
          },

          removePlugin: (params: RPCRequests['removePlugin']['params']) => {
            return this.handleAsync(pluginAPI.removePlugin(params.pluginName, this.manager || undefined));
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
                 return Utils.showItemInFolder(pluginsDir);
               } catch (e) {
                 console.error("[IPC] Failed to open plugins folder:", e);
                 return false;
               }
             })());
          },

          // Open rules folder in file explorer
          openRulesFolder: () => {
             return this.handleAsync((async () => {
               const rulesDir = pluginAPI.getRulesDir();
               console.log(`[IPC] Opening rules folder: ${rulesDir}`);
               try {
                 Utils.showItemInFolder(rulesDir);
                 return rulesDir;
               } catch (e) {
                 console.error("[IPC] Failed to open rules folder:", e);
                 return "";
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

          openWindow: (): boolean => {
             // Implementation of opening window via RPC
             if (this.isWindowOpen()) {
               this.focusWindow();
               return true;
             }
             this.openWindow("views://mainview/index.html");
             return true;
          },

          closeWindow: (): boolean => {
             this.closeWindow();
             return true;
          },
        },
        // Messages from webview to Bun
        messages: {
          "*": (messageName: string, payload: unknown) => {
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
      this.manager!.on(platform, async (event: { eventName: string, data: unknown }) => {
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
  broadcastToWebview(eventName: string, data: unknown): void {
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
   * Show a notification/alert in the webview
   */
  showNotification(title: string, message: string): void {
    if (this.window?.webview?.rpc) {
      // @ts-ignore
      this.window.webview.rpc.send.showNotification({ title, message });
    } else {
      console.log(`[IPC] Notification (no window): ${title} - ${message}`);
    }
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
