import { BrowserView, BrowserWindow, Utils } from "electrobun/bun";
import { BasePluginManager } from "../manager/baseplugin";
import { PLATFORMS } from "../constants";
import { pluginAPI } from "../manager/plugin-api";
import { rulesAPI } from "../manager/rules-api";
import { PLUGIN_NAMES } from "../constants";
import { RulePersistence } from "trigger_system/node";
import type { PluginManagerRPC, PluginInfo, PluginStatus, RuleInfo, WindowStatus } from "../../shared/types";
import type { TriggerRule } from "trigger_system/node";
import { IPC_EVENTS, EDITOR_MESSAGES } from "../constants";

// This is the type of any RPC handler to help with complex typing
type RPCRequests = PluginManagerRPC['bun']['requests'];

/**
 * IPC Handler for Plugin Manager
 * Manages communication between Bun (plugins) and WebView (UI)
 */
export class IpcHandler {
  private windows: Set<BrowserWindow> = new Set();
  private lastFocusedWindow: BrowserWindow | null = null;
  private manager: BasePluginManager | null = null;
  private currentEditorFilePath: string | null = null;
  private editorWindow: BrowserWindow | null = null;
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
    this.windows.add(win);
    this.lastFocusedWindow = win;
  }

  /**
   * Helper to handle async operations by returning an ID to the frontend
   */
  private handleAsync(promise: Promise<unknown>): { type: 'async_id'; id: string } {
    const id = Math.random().toString(36).substring(7);
    promise.then(data => {
      this.windows.forEach(win => {
        if (win.webview?.rpc) {
          // @ts-ignore
          win.webview.rpc.send.asyncResponse({ id, data });
        }
      });
    }).catch(error => {
      this.windows.forEach(win => {
        if (win.webview?.rpc) {
          // @ts-ignore
          win.webview.rpc.send.asyncResponse({ id, error: String(error) });
        }
      });
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
          togglePlugin: (params: RPCRequests['togglePlugin']['params']) => {
            return this.handleAsync((async () => {
              if (!this.manager) return { success: false, error: "No manager" };
              try {
                await this.manager.togglePlugin(params.pluginName, params.enabled);
                return { success: true };
              } catch (error) {
                return { success: false, error: String(error) };
              }
            })());
          },
          
          // Get all rules
          getRules: (): RuleInfo[] => {
            if (!this.manager) return [];
            const rules = this.manager.registry.getAll();
            // Map TriggerRule to RuleInfo with full metadata and file path
            return rules.map((rule: TriggerRule): RuleInfo => ({
              id: rule.id!,
              name: rule.name,
              description: rule.description,
              platform: rule.on || "unknown",
              enabled: rule.enabled ?? true,
              priority: rule.priority,
              tags: rule.tags,
              filePath: this.manager?.registry.getFilePath(rule.id!),
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
            return this.handleAsync((async () => {
              if (this.manager && params.dirPath === this.manager.getRulesDir()) {
                await this.manager.loadRules();
                return this.manager.registry.getAll();
              }
              return rulesAPI.loadRulesFromDir(params.dirPath);
            })());
          },

          // Load rules from file
          loadRulesFromFile: (params: RPCRequests['loadRulesFromFile']['params']) => {
            return this.handleAsync((async () => {
              const rules = await RulePersistence.loadFile(params.filePath);
              if (this.manager && rules.length > 0) {
                this.manager.registry.registerAll(rules, params.filePath);
                this.manager.updateEngineFromRegistry();
              }
              return rules;
            })());
          },

          // Save a rule
          saveRule: (params: RPCRequests['saveRule']['params']) => {
            return this.handleAsync((async () => {
              const { rule, filePath } = params;
              if (this.manager) {
                const registry = this.manager.registry;
                registry.register(rule, filePath);
                
                // Workaround: ensure the updated/new rule is accurately reflected in the file's rule list
                const rulesInFile = registry.getRulesByFile(filePath);
                const finalRules = rulesInFile.some(r => r.id === rule.id)
                  ? rulesInFile.map(r => r.id === rule.id ? rule : r)
                  : [...rulesInFile, rule];
                  
                await RulePersistence.saveRulesToFile(finalRules, filePath);
                registry.markFileAsSaved(filePath);
                
                this.manager.updateEngineFromRegistry();
              } else {
                await RulePersistence.saveRule(rule, filePath);
              }
            })());
          },

          // Save all rules
          saveAllRules: (params: RPCRequests['saveAllRules']['params']) => {
            return this.handleAsync((async () => {
              // Standard saveAll might overwrite everything
              const results = await rulesAPI.saveAllRules(params.rules, params.baseDir);
              if (this.manager) {
                // We don't have exact file mapping here from the results easily,
                // but we can at least try to refresh the registry
                await this.manager.loadRules();
              }
              return results;
            })());
          },

          // Delete a rule file
          deleteRule: (params: RPCRequests['deleteRule']['params']) => {
            return this.handleAsync((async () => {
              const deleted = await rulesAPI.deleteRule(params.filePath);
              if (deleted && this.manager) {
                // Remove all rules associated with this file from registry
                const rulesInFile = this.manager.registry.getRulesByFile(params.filePath);
                for (const rule of rulesInFile) {
                  this.manager.registry.remove(rule.id!);
                }
                this.manager.updateEngineFromRegistry();
              }
              return deleted;
            })());
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
          toggleRule: (params: RPCRequests['toggleRule']['params']) => {
            return this.handleAsync((async () => {
              if (!this.manager) return false;
              const ruleId = params.ruleId;
              const registry = this.manager.registry;
              
              const rule = registry.get(ruleId);
              if (!rule) {
                console.error(`[IPC] Rule not found in registry: ${ruleId}`);
                return false;
              }

              const filePath = registry.getFilePath(ruleId);
              if (!filePath) {
                console.error(`[IPC] Could not find file path for rule: ${ruleId}`);
                return false;
              }

              // Update enabled state in memory (registry)
              const updated = registry.update(ruleId, { enabled: params.enabled });
              
              // Workaround: map the updated rule back into the file's rule list to ensure latest data is saved
              const rulesInFile = registry.getRulesByFile(filePath).map(r => r.id === ruleId ? updated : r);
              await RulePersistence.saveRulesToFile(rulesInFile, filePath);
              registry.markFileAsSaved(filePath);
              
              // Update engine
              this.manager.updateEngineFromRegistry();
              
              console.log(`[IPC] Toggled rule ${ruleId} to ${params.enabled} and saved ${filePath}`);
              return { success: true };
            })());
          },

          // Delete rule by ID
          deleteRuleById: (params: RPCRequests['deleteRuleById']['params']) => {
            return this.handleAsync((async () => {
              if (!this.manager) return false;
              const ruleId = params.ruleId;
              const registry = this.manager.registry;
              const filePath = registry.getFilePath(ruleId);
              
              if (!filePath) {
                console.error(`[IPC] Rule not found or file path unknown: ${ruleId}`);
                return false;
              }

              console.log(`[IPC] Attempting to remove rule ${ruleId} from registry`);
              // Remove from registry
              const removed = registry.remove(ruleId);
              if (removed) {
                // Workaround for library inconsistency: manually filter rules to ensure it's removed from file list
                const remainingRules = registry.getRulesByFile(filePath).filter(r => r.id !== ruleId);
                console.log(`[IPC] Remaining rules in ${filePath} (after filtering): ${remainingRules.length} (${remainingRules.map(r => r.id).join(', ')})`);
                
                if (remainingRules.length > 0) {
                  // If there are other rules in the same file, update the file
                  await RulePersistence.saveRulesToFile(remainingRules, filePath);
                  registry.markFileAsSaved(filePath);
                  console.log(`[IPC] Removed rule ${ruleId} from file, kept ${remainingRules.length} rules`);
                } else {
                  // If it was the last rule in the file, delete the file
                  await RulePersistence.deleteFile(filePath);
                  console.log(`[IPC] Deleted file ${filePath} because it had no more rules`);
                }
                
                this.manager.updateEngineFromRegistry();
              } else {
                console.warn(`[IPC] Registry.remove(${ruleId}) returned false`);
              }
              return { success: removed, error: removed ? undefined : "Rule not found in registry" };
            })());
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
              isOpen: this.isWindowOpen(),
              isFocused: this.lastFocusedWindow !== null,
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

          // ===== Editor Integration API =====
          editorImport: (params: RPCRequests['editorImport']['params']) => {
            console.log(`[IPC] Editor Import: ${params.format}`);
            if (params.filePath) {
              this.currentEditorFilePath = params.filePath;
            }
            this.broadcastToWebview(IPC_EVENTS.EDITOR_IMPORT, params);
            // Also send as window message for the editor's listener
            this.postMessageToWebview({
              type: EDITOR_MESSAGES.IMPORT,
              format: params.format,
              payload: params.payload
            });
          },

          setEditorFile: (params: { filePath: string }) => {
            console.log(`[IPC] Current editor file set to: ${params.filePath}`);
            this.currentEditorFilePath = params.filePath;
          },

          editorRequestExport: () => {
            console.log("[IPC] Editor Request Export");
            this.broadcastToWebview(IPC_EVENTS.EDITOR_REQUEST_EXPORT, {});
            this.postMessageToWebview({
              type: EDITOR_MESSAGES.REQUEST_EXPORT
            });
          },

          editorClear: () => {
            console.log("[IPC] Editor Clear");
            this.currentEditorFilePath = null;
            this.broadcastToWebview(IPC_EVENTS.EDITOR_CLEAR, {});
            this.postMessageToWebview({
              type: EDITOR_MESSAGES.CLEAR
            });
          },

          loadRuleInEditor: (params: RPCRequests['loadRuleInEditor']['params']) => {
            return this.handleAsync((async () => {
              const { filePath } = params;
              console.log(`[IPC] Loading rule for editor: ${filePath}`);
              try {
                // Ensure editor window is open
                this.openEditorWindow();

                const content = await rulesAPI.getRuleRawContent(filePath);
                const format = filePath.endsWith('.yaml') ? 'yaml' : 'json';
                
                // Track this file as the current editor file
                this.currentEditorFilePath = filePath;
                
                // Give the window a tiny bit of time to initialize if it's new
                // though broadcastToWebview handles all open windows.
                setTimeout(() => {
                  // Broadcast the content to all webviews
                  this.broadcastToWebview(IPC_EVENTS.EDITOR_IMPORT, {
                    format,
                    payload: content,
                    filePath
                  });
                  
                  // Also post message for editor listeners
                  this.postMessageToWebview({
                    type: EDITOR_MESSAGES.IMPORT,
                    format,
                    payload: content
                  });
                }, 1000);
                
                return { success: true };
              } catch (error) {
                console.error(`[IPC] Failed to load rule for editor: ${filePath}`, error);
                return { success: false, error: String(error) };
              }
            })());
          },
        },
        // Messages from webview to Bun
        messages: {
          "*": (messageName: string, payload: unknown) => {
            console.log(`[IPC] Message from webview: ${messageName}`, payload);
          },
          editorExported: async (payload) => {
            console.log("[IPC] Editor Exported data received", payload.timestamp);
            try {
              if (this.currentEditorFilePath) {
                console.log(`[IPC] Saving editor changes to: ${this.currentEditorFilePath}`);
                const data = typeof payload.yaml === 'string' ? payload.yaml : JSON.stringify(payload.json, null, 2);
                await Bun.write(this.currentEditorFilePath, data);
                this.showNotification("Saved", `Changes saved to ${this.currentEditorFilePath}`);
                
                // If it's a rule file, we should reload it in the engine
                if (this.manager && (this.currentEditorFilePath.endsWith('.yaml') || this.currentEditorFilePath.endsWith('.json'))) {
                   await this.manager.loadRules();
                   this.manager.updateEngineFromRegistry();
                }
              } else {
                console.log("[IPC] No file path tracked for editor export, data not saved automatically.");
              }
            } catch (error) {
              console.error("[IPC] Error handling editor export:", error);
              this.showNotification("Error", `Failed to save changes: ${error}`);
            }
          }
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
        this.broadcastToWebview(IPC_EVENTS.EVENT_RECEIVED, {
          platform,
          eventName: event.eventName,
          data: event.data,
        });
      });
    });
  }

  /**
   * Broadcast message to all webviews
   */
  broadcastToWebview(eventName: string, data: unknown): void {
    this.windows.forEach(win => {
      if (win.webview) {
        try {
          // Use string literal + JSON.stringify to avoid backtick issues in template literals
          const js = `
                     if (window.dispatchEvent) { 
                       window.dispatchEvent(new CustomEvent('${eventName}', { detail: ${JSON.stringify(data)} })); 
                     }`;
          win.webview.executeJavascript(js);
        } catch (e) {
          console.log(`[IPC] Could not send to webview ${win.id}:`, e);
        }
      }
    });

    // Also use RPC broadcast if available
    this.windows.forEach(win => {
        if (win.webview?.rpc) {
            // @ts-ignore
            if (win.webview.rpc.send[eventName]) {
                // @ts-ignore
                win.webview.rpc.send[eventName](data);
            }
        }
    });
  }

  /**
   * Post standard window message to all webviews
   */
  postMessageToWebview(data: unknown): void {
    this.windows.forEach(win => {
      if (win.webview) {
        try {
          const js = "window.postMessage(" + JSON.stringify(data) + ", '*');";
          win.webview.executeJavascript(js);
        } catch (e) {
          console.log(`[IPC] Could not postMessage to webview ${win.id}:`, e);
        }
      }
    });
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
    let sent = false;
    this.windows.forEach(win => {
        if (win.webview?.rpc) {
          // @ts-ignore
          win.webview.rpc.send.showNotification({ title, message });
          sent = true;
        }
    });
    
    if (!sent) {
      console.log(`[IPC] Notification (no windows): ${title} - ${message}`);
    }
  }

  /**
   * Get the window reference (last focused or first available)
   */
  getWindow(): BrowserWindow | null {
    return this.lastFocusedWindow || Array.from(this.windows)[0] || null;
  }

  /**
   * Check if window is open
   */
  isWindowOpen(): boolean {
    return this.windows.size > 0;
  }

  /**
   * Close the IPC window
   */
  closeWindow(): void {
    this.windows.forEach(win => {
       win.close();
    });
    this.windows.clear();
    this.lastFocusedWindow = null;
  }

  /**
   * Open the rules editor window
   */
  openEditorWindow(): BrowserWindow {
    // If editor window is already open, focus it and return
    if (this.editorWindow) {
        this.editorWindow.focus();
        return this.editorWindow;
    }

    this.editorWindow = this.openWindow("views://editor/index.html", "Rules Editor");
    
    this.editorWindow.on('close', () => {
        this.editorWindow = null;
    });

    return this.editorWindow;
  }

  /**
   * Create and open the window
   */
  openWindow(url: string, title: string = "Plugin Manager"): BrowserWindow {
    const win = new BrowserWindow({
      title,
      url,
      frame: { width: 1200, height: 800, x: 100, y: 100 },
      titleBarStyle: "default",
      rpc: this.rpc ?? undefined,
    });
    
    this.windows.add(win);
    this.lastFocusedWindow = win;

    win.on('focus', () => {
        this.lastFocusedWindow = win;
    });

    win.on('close', () => {
        this.windows.delete(win);
        if (this.lastFocusedWindow === win) {
            this.lastFocusedWindow = Array.from(this.windows)[0] || null;
        }
    });

    return win;
  }

  /**
   * Focus the window
   */
  focusWindow(): void {
    const win = this.getWindow();
    if (win) {
      win.focus();
    }
  }
}

// Singleton instance
export const ipcHandler = new IpcHandler();
