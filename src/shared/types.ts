import { RPCSchema } from "electrobun/bun";
import type { TriggerRule } from "trigger_system/node";

export type AsyncResponseWrapper<T> = T | { type: "async_id"; id: string };

/**
 * IPC Types for Plugin Manager
 * Defines the communication schema between Bun (main process) and WebView
 */
export type PluginManagerRPC = {
  bun: RPCSchema<{
    requests: {
      getPlugins: { params: {}; response: AsyncResponseWrapper<PluginInfo[]> };
      getPluginStatus: { params: { pluginId: string }; response: AsyncResponseWrapper<PluginStatus> };
      reloadPlugin: { params: { pluginId: string }; response: AsyncResponseWrapper<boolean> };
      togglePlugin: { params: { pluginName: string; enabled: boolean }; response: AsyncResponseWrapper<ActionResult> };
      getRules: { params: {}; response: AsyncResponseWrapper<RuleInfo[]> };
      removePlugin: { params: { pluginName: string }; response: AsyncResponseWrapper<ActionResult> };
      getPluginsDir: { params: {}; response: AsyncResponseWrapper<string> };
      openPluginsFolder: { params: {}; response: AsyncResponseWrapper<boolean> };
      openWindow: { params: {}; response: boolean };
      closeWindow: { params: {}; response: boolean };
      getWindowStatus: { params: {}; response: WindowStatus };
      openRulesFolder: { params: {}; response: AsyncResponseWrapper<string> };
      openPluginFolder: { params: { pluginName: string }; response: AsyncResponseWrapper<boolean> };
      openRuleFolder: { params: { filePath: string }; response: AsyncResponseWrapper<boolean> };
      uploadRule: { params: {}; response: AsyncResponseWrapper<boolean> };
      uploadPlugin: { params: {}; response: AsyncResponseWrapper<boolean> };
      // ===== Rules Management API =====
      loadRulesFromDir: { params: { dirPath: string }; response: AsyncResponseWrapper<TriggerRule[]> };
      loadRulesFromFile: { params: { filePath: string }; response: AsyncResponseWrapper<TriggerRule[]> };
      createDefaultRule: { params: {}; response: AsyncResponseWrapper<TriggerRule> };
      saveRule: { params: { rule: TriggerRule; filePath: string; oldRuleId?: string }; response: AsyncResponseWrapper<void> };
      saveAllRules: { params: { rules: TriggerRule[]; baseDir: string }; response: AsyncResponseWrapper<string[]> };
      deleteRule: { params: { filePath: string }; response: AsyncResponseWrapper<boolean> };
      ruleExists: { params: { filePath: string }; response: AsyncResponseWrapper<boolean> };
      ensureRulesDir: { params: { dirPath: string }; response: AsyncResponseWrapper<void> };
      toggleRule: { params: { ruleId: string; enabled: boolean }; response: AsyncResponseWrapper<ActionResult> };
      deleteRuleById: { params: { ruleId: string }; response: AsyncResponseWrapper<ActionResult> };
      updateEngineRules: { params: { rules: TriggerRule[] }; response: AsyncResponseWrapper<boolean> };
      
      // ===== Editor Integration API =====
      editorImport: { params: { format: 'yaml' | 'json'; payload: string | object; filePath?: string }; response: void };
      setEditorFile: { params: { filePath: string }; response: void };
      editorRequestExport: { params: {}; response: void };
      editorClear: { params: {}; response: void };
      loadRuleInEditor: { params: { filePath: string }; response: AsyncResponseWrapper<void> };
    };
    messages: {
      editorExported: { yaml: string; json: object; timestamp: string };
    };
  }>;
  webview: RPCSchema<{
    requests: {};
    messages: {
      showNotification: { title: string; message: string };
      windowStateChanged: { state: "opened" | "closed" };
      asyncResponse: { id: string; data?: any; error?: string };
      togglePlugin: { pluginName: string; enabled: boolean };
      pluginLoaded: { pluginId: string; name: string };
      pluginUnloaded: { pluginId: string };
      pluginError: { pluginId: string; error: string };
      eventReceived: { platform: string; eventName: string; data: unknown };
      
      // Editor Events (Bun -> WebView)
      triggerEditorImport: { format: 'yaml' | 'json'; payload: string | object };
      triggerEditorRequestExport: {};
      triggerEditorClear: {};
    };
  }>;
};

/**
 * Plugin information
 */
export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  description?: string;
}

/**
 * Plugin status
 */
export interface PluginStatus {
  id: string;
  loaded: boolean;
  enabled: boolean;
  error?: string;
}

/**
 * Rule information
 */
export interface RuleInfo {
  id: string;
  name?: string;
  description?: string;
  platform: string;
  enabled: boolean;
  priority?: number;
  tags?: string[];
  filePath?: string;
}

/**
 * Window status
 */
export interface WindowStatus {
  isOpen: boolean;
  isFocused: boolean;
}

// Result types used by views
export interface ActionResult {
  success: boolean;
  error?: string;
}
