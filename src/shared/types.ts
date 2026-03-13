import { RPCSchema } from "electrobun/bun";

/**
 * IPC Types for Plugin Manager
 * Defines the communication schema between Bun (main process) and WebView
 */
export type PluginManagerRPC = {
  bun: RPCSchema<{
    requests: {
      getPlugins: { params: {}; response: PluginInfo[] };
      getPluginStatus: { params: { pluginId: string }; response: PluginStatus };
      reloadPlugin: { params: { pluginId: string }; response: boolean };
      getRules: { params: {}; response: RuleInfo[] };
      removePlugin: { params: { pluginName: string }; response: { success: boolean; error?: string } };
      getPluginsDir: { params: {}; response: string };
      openPluginsFolder: { params: {}; response: boolean };
    };
    messages: {
      pluginLoaded: { pluginId: string; name: string };
      pluginUnloaded: { pluginId: string };
      pluginError: { pluginId: string; error: string };
      eventReceived: { platform: string; eventName: string; data: unknown };
    };
  }>;
  webview: RPCSchema<{
    requests: {
      openWindow: { params: {}; response: boolean };
      closeWindow: { params: {}; response: boolean };
      getWindowStatus: { params: {}; response: WindowStatus };
    };
    messages: {
      showNotification: { title: string; message: string };
      windowStateChanged: { state: "opened" | "closed" };
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
  platform: string;
  enabled: boolean;
}

/**
 * Window status
 */
export interface WindowStatus {
  isOpen: boolean;
  isFocused: boolean;
}

// Result types used by views
export interface RemoveResult {
  success: boolean;
  error?: string;
}
