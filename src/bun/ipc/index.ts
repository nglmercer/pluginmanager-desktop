import { BrowserView, BrowserWindow, Utils } from "electrobun/bun";
import { BasePluginManager } from "../manager/baseplugin";
import { PLATFORMS } from "../constants";
import { pluginAPI } from "../manager/plugin-api";
import { rulesAPI } from "../manager/rules-api";
import { PLUGIN_NAMES } from "../constants";
import * as path from "path";
import { RulePersistence } from "trigger_system/node";
import type { PluginManagerRPC, PluginInfo, PluginStatus, RuleInfo, WindowStatus } from "../../shared/types";
import type { TriggerRule } from "trigger_system/node";

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

          // Get all loaded and tracked plugins
          getPlugins: (): PluginInfo[] => {
            if (!this.manager) return [];
            
            const listPlugins = this.manager.listPlugins();
            const disabledPlugins = Array.from(this.manager.disabledPluginNames);
            const allPluginNames = Array.from(new Set([...listPlugins, ...disabledPlugins]));
            
            const pluginInfos = allPluginNames.map((name): PluginInfo | null => {
              if (name === PLUGIN_NAMES.ACTION_REGISTRY) return null;
              
              const plugin = this.manager?.getPlugin(name);
              const metadata = this.manager?.discoveredPluginsMetadata.get(name);
              
              if (!plugin && !metadata) return null;
              
              return {
                id: name,
                name: plugin?.name || metadata?.name || name,
                version: plugin?.version || metadata?.version || "0.0.0",
                enabled: (this.manager?.getPluginStatus()[name] && !this.manager?.disabledPluginNames.has(name)) ? true : false,
                description: plugin?.description || metadata?.description || "",
              } as PluginInfo;
            });
            
            const filteredPlugins = pluginInfos.filter((p): p is PluginInfo => p !== null);
            console.log("[IPC] GetPlugins:", filteredPlugins);
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
              const isDisabled = this.manager.disabledPluginNames.has(pluginId);
              const isDiscovered = this.manager.discoveredPluginsMetadata.has(pluginId);
              
              return {
                id: pluginId,
                loaded: !!plugin || isDiscovered,
                enabled: !!plugin && !isDisabled,
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
            // Map TriggerRule to RuleInfo with full metadata
            return rules.map((rule: any): RuleInfo => ({
              id: rule.id,
              name: rule.name,
              description: rule.description,
              platform: rule.on || "unknown",
              enabled: rule.enabled ?? true,
              priority: rule.priority,
              tags: rule.tags,
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

          // ===== Rules Management API =====

          // Load rules from directory
          loadRulesFromDir: (params: RPCRequests['loadRulesFromDir']['params']) => {
            return this.handleAsync(rulesAPI.loadRulesFromDir(params.dirPath));
          },

          // Load rules from file
          loadRulesFromFile: (params: RPCRequests['loadRulesFromFile']['params']) => {
            return this.handleAsync(rulesAPI.loadRulesFromFile(params.filePath));
          },

          // Save a rule
          saveRule: (params: RPCRequests['saveRule']['params']) => {
            return this.handleAsync(rulesAPI.saveRule(params.rule, params.filePath));
          },

          // Save all rules
          saveAllRules: (params: RPCRequests['saveAllRules']['params']) => {
            return this.handleAsync(rulesAPI.saveAllRules(params.rules, params.baseDir));
          },

          // Delete a rule
          deleteRule: (params: RPCRequests['deleteRule']['params']) => {
            return this.handleAsync(rulesAPI.deleteRule(params.filePath));
          },

          // Check if rule file exists
          ruleExists: (params: RPCRequests['ruleExists']['params']) => {
            return this.handleAsync(Promise.resolve(rulesAPI.ruleExists(params.filePath)));
          },

          // Ensure rules directory exists
          ensureRulesDir: (params: RPCRequests['ensureRulesDir']['params']) => {
            return this.handleAsync(Promise.resolve(rulesAPI.ensureRulesDir(params.dirPath)));
          },

          // Update engine rules directly
          updateEngineRules: (params: RPCRequests['updateEngineRules']['params']) => {
            if (!this.manager) return false;
            try {
              this.manager.engine.updateRules(params.rules);
              console.log(`[IPC] Updated engine with ${params.rules.length} rules`);
              return true;
            } catch (error) {
              console.error("[IPC] Failed to update engine rules:", error);
              return false;
            }
          },

          // Toggle rule enabled state
          toggleRule: async (params: RPCRequests['toggleRule']['params']): Promise<boolean> => {
            if (!this.manager) return false;
            try {
              const rulesDir = pluginAPI.getRulesDir();
              const filePath = path.join(rulesDir, `${params.ruleId}.yaml`);
              // Load the rule file
              const rules = await RulePersistence.loadFile(filePath);
              const rule = rules.find((r: TriggerRule) => r.id === params.ruleId);
              if (!rule) {
                console.error(`[IPC] Rule not found: ${params.ruleId}`);
                return false;
              }
              // Update enabled state
              rule.enabled = params.enabled;
              // Save back to file
              await RulePersistence.saveRule(rule, filePath);
              // Update engine with the modified rule
              this.manager.engine.updateRules([rule]);
              console.log(`[IPC] Toggled rule ${params.ruleId} to ${params.enabled}`);
              return true;
            } catch (error) {
              console.error("[IPC] Failed to toggle rule:", error);
              return false;
            }
          },

          // Delete rule by ID
          deleteRuleById: async (params: RPCRequests['deleteRuleById']['params']): Promise<boolean> => {
            if (!this.manager) return false;
            try {
              const rulesDir = pluginAPI.getRulesDir();
              const filePath = path.join(rulesDir, `${params.ruleId}.yaml`);
              // Delete the file
              const deleted = await RulePersistence.deleteFile(filePath);
              if (deleted) {
                // Remove from engine
                const currentRules = this.manager.engine.getRules();
                const remaining = currentRules.filter((r: TriggerRule) => r.id !== params.ruleId);
                this.manager.engine.updateRules(remaining);
                console.log(`[IPC] Deleted rule ${params.ruleId}`);
              }
              return deleted;
            } catch (error) {
              console.error("[IPC] Failed to delete rule:", error);
              return false;
            }
          },

          // Open a specific plugin folder
          openPluginFolder: (params: RPCRequests['openPluginFolder']['params']) => {
             return this.handleAsync((async () => {
               if (!this.manager) return false;
               const pluginPath = this.manager.getPluginPath(params.pluginName);
               if (!pluginPath) {
                 console.error(`[IPC] Plugin folder not found: ${params.pluginName}`);
                 return false;
               }
               console.log(`[IPC] Opening plugin folder: ${pluginPath}`);
               try {
                 return Utils.showItemInFolder(pluginPath);
               } catch (e) {
                 console.error("[IPC] Failed to open plugin folder:", e);
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
