import { BrowserView, BrowserWindow, Utils } from "electrobun/bun";
import { BasePluginManager } from "../manager/baseplugin";
import { PLATFORMS } from "../constants";
import { pluginAPI } from "../manager/plugin-api";
import { rulesAPI } from "../manager/rules-api";
import { PLUGIN_NAMES } from "../constants";
import { RulePersistence } from "trigger_system/node";
import { PluginInstaller } from "../manager/plugin-installer";
import type { PluginManagerRPC, PluginInfo, PluginStatus, RuleInfo, WindowStatus, ActionResult } from "../../shared/types";
import type { TriggerRule } from "trigger_system/node";
import { IPC_EVENTS, EDITOR_MESSAGES } from "../constants";
import { randomUUID } from "crypto";
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
  private mainWindow: BrowserWindow | null = null;
  private editorWindow: BrowserWindow | null = null;
  // Type this as the result of defineRPC, using the full schema
  private rpc: ReturnType<typeof BrowserView.defineRPC<PluginManagerRPC>> | null = null;
  private callback?: (eventName?: string) => void;
  /**
   * Initialize RPC and setup event listeners
   */
  constructor(cb?: (eventName?: string) => void) {
    this.callback = cb;
    this.setupRpc();
  }

  /**
   * Initialize IPC with plugin manager
   */
  initialize(managerInstance: BasePluginManager): void {
    this.manager = managerInstance;
    this.setupEventListeners();
  }

  /**
   * Set the browser window for IPC communication
   */
  setWindow(win: BrowserWindow): void {
    this.windows.add(win);
    this.lastFocusedWindow = win;
    this.setupRpc();
  }

  /**
   * Helper to handle async operations by returning an ID to the frontend
   */
/*   private _handleAsync(promise: Promise<unknown>): { type: 'async_id'; id: string } {
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
  } */

  /**
   * Setup RPC handlers (Bun side - handles requests FROM webview)
   */
  private setupRpc(): void {
    // Define RPC for handling requests from webview
    // This can be called before manager is initialized; handlers check for manager presence.
    this.rpc = BrowserView.defineRPC<PluginManagerRPC>({
      maxRequestTime: 120000, // Important: 2 minutes timeout to prevent blocking dialogs from failing
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
          togglePlugin: async (params: RPCRequests['togglePlugin']['params']): Promise<ActionResult> => {
            if (!this.manager) return { success: false, error: "No manager" };
            try {
              await this.manager.togglePlugin(params.pluginName, params.enabled);
              return { success: true };
            } catch (error) {
              return { success: false, error: String(error) };
            }
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

          removePlugin: async (params: RPCRequests['removePlugin']['params']): Promise<ActionResult> => {
            return await pluginAPI.removePlugin(params.pluginName, this.manager || undefined);
          },

          // Get plugins directory
          getPluginsDir: (): string => {
            return pluginAPI.getPluginsDir();
          },

          // Open plugins folder in file explorer
          openPluginsFolder: async (): Promise<boolean> => {
            const pluginsDir = pluginAPI.getPluginsDir();
            console.log(`[IPC] Opening plugins folder: ${pluginsDir}`);
            try {
              Utils.showItemInFolder(pluginsDir);
              return true;
            } catch (e) {
              console.error("[IPC] Failed to open plugins folder:", e);
              return false;
            }
          },

          // Open rules folder in file explorer
          openRulesFolder: async (): Promise<string> => {
            const rulesDir = pluginAPI.getRulesDir();
            console.log(`[IPC] Opening rules folder: ${rulesDir}`);
            try {
              Utils.showItemInFolder(rulesDir);
              return rulesDir;
            } catch (e) {
              console.error("[IPC] Failed to open rules folder:", e);
              return "";
            }
          },

          // ===== Upload API =====
          uploadPlugin: async (): Promise<boolean> => {
            try {
              const paths = await Utils.openFileDialog({
                startingFolder: Utils.paths.home,
                canChooseFiles: false,
                canChooseDirectory: true,
                allowsMultipleSelection: true,
              });
              
              const validPaths = paths ? paths.filter(p => p.trim() !== "") : [];
              if (validPaths.length === 0) return false;
              
              const pluginsDir = pluginAPI.getPluginsDir();
              const fs = require("fs");
              const path = require("path");
              
              for (const p of validPaths) {
                const basename = path.basename(p);
                const target = path.join(pluginsDir, basename);
                fs.cpSync(p, target, { recursive: true });
              }
              // It's up to the frontend to reload the plugins list or call manager.loadPlugins if needed.
              return true;
            } catch (e) {
              console.error("[IPC] Failed to upload plugin:", e);
              return false;
            }
          },

          uploadRule: async (): Promise<boolean> => {
            try {
              const paths = await Utils.openFileDialog({
                startingFolder: Utils.paths.home,
                allowedFileTypes: "yaml,yml,json",
                canChooseFiles: true,
                canChooseDirectory: false,
                allowsMultipleSelection: true,
              });

              const validPaths = paths ? paths.filter(p => p.trim() !== "") : [];
              if (validPaths.length === 0) return false;
              
              const rulesDir = pluginAPI.getRulesDir();
              const fs = require("fs");
              const path = require("path");
              for (const p of validPaths) {
                const basename = path.basename(p);
                fs.copyFileSync(p, path.join(rulesDir, basename));
              }
              if (this.manager) {
                 await this.manager.loadRules();
                 this.manager.updateEngineFromRegistry();
              }
              return true;
            } catch (e) {
              console.error("[IPC] Failed to upload rule:", e);
              return false;
            }
          },

          // ===== Rules Management API =====

          // Load rules from directory
          loadRulesFromDir: async (params: RPCRequests['loadRulesFromDir']['params']): Promise<TriggerRule[]> => {
            if (this.manager && params.dirPath === this.manager.getRulesDir()) {
              await this.manager.loadRules();
              return this.manager.registry.getAll();
            }
            return await rulesAPI.loadRulesFromDir(params.dirPath);
          },

          // Load rules from file
          loadRulesFromFile: async (params: RPCRequests['loadRulesFromFile']['params']): Promise<TriggerRule[]> => {
            const rules = await RulePersistence.loadFile(params.filePath);
            if (this.manager && rules.length > 0) {
              this.manager.registry.registerAll(rules, params.filePath);
              this.manager.updateEngineFromRegistry();
            }
            return rules;
          },

          // Create default rule
          createDefaultRule: async (): Promise<TriggerRule> => {
            const rulesDir = pluginAPI.getRulesDir();
            const uniqueId = randomUUID();
            const options = {
              event: "onStart",
              name: "New Default Rule",
              description: "Auto-generated rule with id: " + uniqueId,
              enabled: false,
              filePath: `${rulesDir}/onStart-${uniqueId}.yaml`
            };
            const rule = rulesAPI.createDefaultRule(options, true);
            return rule;
          },

          // Save a rule
          saveRule: async (params: RPCRequests['saveRule']['params']): Promise<void> => {
            const { rule, filePath, oldRuleId } = params;  // Add oldRuleId param for renames
            if (this.manager) {
              const registry = this.manager.registry;
              registry.register(rule, filePath);
              
              // Get current rules in file, filtering out old ID if this is a rename
              const rulesInFile = registry.getRulesByFile(filePath).filter(r => r.id !== oldRuleId);
              
              // Check if rule exists (by current ID), if so update it, otherwise add it
              const existingIndex = rulesInFile.findIndex(r => r.id === rule.id);
              if (existingIndex >= 0) {
                rulesInFile[existingIndex] = rule;
              } else {
                rulesInFile.push(rule);
              }
              
              await RulePersistence.saveRulesToFile(rulesInFile, filePath);
              registry.markFileAsSaved(filePath);
              this.manager.updateEngineFromRegistry();
            } else {
              await RulePersistence.saveRule(rule, filePath);
            }
          },

          // Save all rules
          saveAllRules: async (params: RPCRequests['saveAllRules']['params']): Promise<string[]> => {
            // Standard saveAll might overwrite everything
            const results = await rulesAPI.saveAllRules(params.rules, params.baseDir);
            if (this.manager) {
              // We don't have exact file mapping here from the results easily,
              // but we can at least try to refresh the registry
              await this.manager.loadRules();
            }
            return results;
          },

          // Delete a rule file
          deleteRule: async (params: RPCRequests['deleteRule']['params']): Promise<boolean> => {
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
          },

          // Check if rule file exists
          ruleExists: async (params: RPCRequests['ruleExists']['params']): Promise<boolean> => {
            return rulesAPI.ruleExists(params.filePath);
          },

          // Ensure rules directory exists
          ensureRulesDir: async (params: RPCRequests['ensureRulesDir']['params']): Promise<void> => {
            return await rulesAPI.ensureRulesDir(params.dirPath);
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
          toggleRule: async (params: RPCRequests['toggleRule']['params']): Promise<ActionResult> => {
            if (!this.manager) return { success: false, error: "No manager" };
            const ruleId = params.ruleId;
            const registry = this.manager.registry;
            
            const rule = registry.get(ruleId);
            if (!rule) {
              console.error(`[IPC] Rule not found in registry: ${ruleId}`);
              return { success: false, error: "Rule not found" };
            }

            const filePath = registry.getFilePath(ruleId);
            if (!filePath) {
              console.error(`[IPC] Could not find file path for rule: ${ruleId}`);
              return { success: false, error: "File path not found" };
            }

            // Load current file content directly to ensure we have the most accurate list
            // especially during concurrent loads/saves
            const rulesInFile = await RulePersistence.loadFile(filePath);
            const existingRuleIndex = rulesInFile.findIndex(r => r.id === ruleId);
            
            if (existingRuleIndex !== -1) {
              // Update rule in the loaded list
              rulesInFile[existingRuleIndex].enabled = params.enabled;
              
              // Save back to file
              await RulePersistence.saveRulesToFile(rulesInFile, filePath);
              registry.markFileAsSaved(filePath);
              
              // Sync memory registry
              registry.update(ruleId, { enabled: params.enabled });
              
              // Update engine
              this.manager.updateEngineFromRegistry();
              
              console.log(`[IPC] Toggled rule ${ruleId} to ${params.enabled} and saved ${filePath}`);
              return { success: true };
            } else {
              // Fallback: rule might have been registered with a wrong ID or file mapping
              // Update in registry anyway and try to save registry's view
              const updated = registry.update(ruleId, { enabled: params.enabled });
              const registryRulesInFile = registry.getRulesByFile(filePath);
              
              if (registryRulesInFile.length > 0) {
                 const finalRules = registryRulesInFile.map(r => r.id === ruleId ? updated : r);
                 await RulePersistence.saveRulesToFile(finalRules, filePath);
                 registry.markFileAsSaved(filePath);
                 this.manager.updateEngineFromRegistry();
                 return { success: true };
              }
              
              return { success: false, error: "Rule not found in file" };
            }
          },

          // Delete rule by ID
          deleteRuleById: async (params: RPCRequests['deleteRuleById']['params']): Promise<ActionResult> => {
            if (!this.manager) return { success: false, error: "No manager" };
            const ruleId = params.ruleId;
            const registry = this.manager.registry;
            const filePath = registry.getFilePath(ruleId);
            
            if (!filePath) {
              console.error(`[IPC] Rule not found or file path unknown: ${ruleId}`);
              return { success: false, error: "Rule not found" };
            }

            console.log(`[IPC] Attempting to remove rule ${ruleId} from registry`);
            // Remove from registry
            const removed = registry.remove(ruleId);
            if (removed) {
              // Same atomic strategy: read-modify-save the file directly
              const rulesInFile = await RulePersistence.loadFile(filePath);
              const remainingRules = rulesInFile.filter(r => r.id !== ruleId);
              
              if (remainingRules.length > 0) {
                // Update file with remaining rules
                await RulePersistence.saveRulesToFile(remainingRules, filePath);
                registry.markFileAsSaved(filePath);
                console.log(`[IPC] Removed rule ${ruleId} from file ${filePath}, kept ${remainingRules.length} rules`);
              } else {
                // Last rule in file, delete the file
                await RulePersistence.deleteFile(filePath);
                console.log(`[IPC] Deleted file ${filePath} because rule ${ruleId} was the last one`);
              }
              
              this.manager.updateEngineFromRegistry();
            } else {
              console.warn(`[IPC] Registry.remove(${ruleId}) returned false`);
            }
            return { success: removed, error: removed ? undefined : "Rule not found in registry" };
          },

          // ===== Plugin Config API =====
          getPluginConfig: async (params: RPCRequests['getPluginConfig']['params']): Promise<any> => {
            if (!this.manager) return {};
            try {
              const config = await PluginInstaller.getConfig(params.pluginName, "");
              return config || {};
            } catch (error) {
              console.error(`[IPC] Failed to get plugin config: ${params.pluginName}`, error);
              return {};
            }
          },

          setPluginConfig: async (params: RPCRequests['setPluginConfig']['params']): Promise<ActionResult> => {
            if (!this.manager) return { success: false, error: "No manager" };
            try {
              await PluginInstaller.setConfig(params.pluginName, "", params.config);
              console.log(`[IPC] Plugin config saved for ${params.pluginName}`);
              return { success: true };
            } catch (error) {
              console.error(`[IPC] Failed to set plugin config: ${params.pluginName}`, error);
              return { success: false, error: String(error) };
            }
          },

          // Open a specific plugin folder
          openPluginFolder: async (params: RPCRequests['openPluginFolder']['params']): Promise<boolean> => {
            if (!this.manager) return false;
            const pluginPath = this.manager.getPluginPath(params.pluginName);
            if (!pluginPath) {
              console.error(`[IPC] Plugin folder not found: ${params.pluginName}`);
              return false;
            }
            console.log(`[IPC] Opening plugin folder: ${pluginPath}`);
            try {
              Utils.showItemInFolder(pluginPath);
              return true;
            } catch (e) {
              console.error("[IPC] Failed to open plugin folder:", e);
              return false;
            }
          },

          // Open rule folder
          openRuleFolder: async (params: RPCRequests['openRuleFolder']['params']): Promise<boolean> => {
            return rulesAPI.openRuleFolder(params.filePath);
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

          loadRuleInEditor: async (params: RPCRequests['loadRuleInEditor']['params']): Promise<void> => {
            const { filePath } = params;
            console.log(`[IPC] Loading rule for editor: ${filePath}`);
            try {
              // Ensure editor window is open
              this.openEditorWindow();

              const content = await rulesAPI.getRuleRawContent(filePath);
              const format = filePath.endsWith('.yaml') ? 'yaml' : 'json';
              
              // Track this file as the current editor file
              this.currentEditorFilePath = filePath;
              const sendData = () => {
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
              };
              setTimeout(sendData, 1000);
              setTimeout(() => sendData(), 2000);
              return;
            } catch (error) {
              console.error(`[IPC] Failed to load rule for editor: ${filePath}`, error);
              return;
            }
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
                
                // Parse editor result and ensure it's a valid rules array
                let content: string;
                if (typeof payload.yaml === 'string') {
                  content = payload.yaml;
                } else if (payload.json) {
                  content = JSON.stringify(payload.json, null, 2);
                } else {
                  throw new Error("Editor export missing yaml or json content");
                }
                
                await Bun.write(this.currentEditorFilePath, content);
                this.showNotification("Saved", `Changes saved to ${this.currentEditorFilePath}`);
                
                // Reload rules - the registry will parse and validate the file content
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
        }
      }
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
   * Check if any window is open, or specifically the main window
   */
  isWindowOpen(url?: string): boolean {
    if (url) {
      return Array.from(this.windows).some(win => win.webview?.url === url);
    }
    return this.windows.size > 0;
  }

  /**
   * Check if the main window is open
   */
  isMainWindowOpen(): boolean {
      return this.mainWindow !== null;
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
        try {
            this.editorWindow.focus();
            return this.editorWindow;
        } catch (e) {
            console.log("[IPC] Existing editor window seems closed but not cleared");
            this.editorWindow = null;
        }
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

    // Track main window specifically
    if (url.includes("mainview")) {
        this.mainWindow = win;
    }
    const events = ['dom-ready', 'focus','close']
    win.webview.on('dom-ready',() => {
      console.log("[IPC] Window dom-ready");
        this.setupRpc();
        if (this.callback) {
          this.callback(events[0]);
        }
    });
    win.on('focus', () => {
        this.lastFocusedWindow = win;
        if (this.callback) {
          this.callback(events[1]);
        }
    });
    win.on('close', () => {
        this.windows.delete(win);
        if (this.mainWindow === win) {
            this.mainWindow = null;
        }
        if (this.lastFocusedWindow === win) {
            this.lastFocusedWindow = Array.from(this.windows)[0] || null;
        }
        if (this.callback) {
          this.callback(events[2]);
        }
    });

    return win;
  }
  setCallback(callback: (event?: string) => void): void {
    this.callback = callback;
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
