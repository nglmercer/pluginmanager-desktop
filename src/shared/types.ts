import { RPCSchema } from "electrobun/bun";

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
      togglePlugin: { params: { pluginName: string; enabled: boolean }; response: AsyncResponseWrapper<boolean> };
      getRules: { params: {}; response: AsyncResponseWrapper<RuleInfo[]> };
      removePlugin: { params: { pluginName: string }; response: AsyncResponseWrapper<{ success: boolean; error?: string }> };
      getPluginsDir: { params: {}; response: AsyncResponseWrapper<string> };
      openPluginsFolder: { params: {}; response: AsyncResponseWrapper<boolean> };
      openWindow: { params: {}; response: boolean };
      closeWindow: { params: {}; response: boolean };
      getWindowStatus: { params: {}; response: WindowStatus };
    };
    messages: {};
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
