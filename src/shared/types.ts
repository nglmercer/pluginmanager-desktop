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
      // Plugin Installer API
      listInstalledPlugins: { params: {}; response: PluginInstallInfo[] };
      installFromGitHub: { params: PluginInstallFromGitHubParams; response: PluginInstallResult };
      installFromZip: { params: PluginInstallFromZipParams; response: PluginInstallResult };
      removePlugin: { params: { pluginName: string }; response: { success: boolean; error?: string } };
      getGitHubReleases: { params: { repo: string }; response: GitHubReleaseInfo[] };
      getLatestRelease: { params: { repo: string }; response: GitHubReleaseInfo };
      getPluginsDir: { params: {}; response: string };
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

// ============================================================================
// Plugin Installer Types
// ============================================================================

/**
 * Installed plugin information
 */
export interface PluginInstallInfo {
  name: string;
  path: string;
  hasPackageJson: boolean;
  packageJson?: {
    name: string;
    version: string;
    description?: string;
  };
}

/**
 * Parameters for installing from GitHub
 */
export interface PluginInstallFromGitHubParams {
  repo: string;
  version?: string;
  assetName?: string;
  headers?: Record<string, string>;
}

/**
 * Parameters for installing from zip
 */
export interface PluginInstallFromZipParams {
  zipPath: string;
  pluginName?: string;
}

/**
 * Result of plugin installation
 */
export interface PluginInstallResult {
  success: boolean;
  pluginPath?: string;
  pluginName?: string;
  version?: string;
  error?: string;
}

/**
 * GitHub release info (simplified for IPC)
 */
export interface GitHubReleaseInfo {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: GitHubAssetInfo[];
}

/**
 * GitHub asset info (simplified for IPC)
 */
export interface GitHubAssetInfo {
  id: number;
  name: string;
  label: string;
  content_type: string;
  size: number;
  browser_download_url: string;
}
