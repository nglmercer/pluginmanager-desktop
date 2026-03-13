/**
 * Plugin Manager API
 * Provides an API for installing, removing, and managing plugins
 */

import * as fs from "node:fs";
import {
  PluginInstaller,
  installFromGitHub,
  installFromZip,
  removePlugin,
  isPluginInstalled,
  type PluginDownloadOptions,
  type PluginInstallResult,
  type GitHubRelease,
} from "./plugin-installer";
import { BasePluginManager } from "./baseplugin";
import type { PluginInfo } from "../ipc";
// ============================================================================
// Types
// ============================================================================

export interface PluginManagerAPI {
  // Installation
  installFromGitHub: (options: PluginDownloadOptions) => Promise<PluginInstallResult>;
  installFromZip: (zipPath: string, pluginName?: string) => Promise<PluginInstallResult>;
  
  // Management
  listPlugins: (manager: BasePluginManager) => PluginInfo[];
  removePlugin: (pluginName: string) => { success: boolean; error?: string };
  isPluginInstalled: (pluginName: string) => boolean;
  
  // GitHub
  getGitHubReleases: (repo: string, options?: { headers?: Record<string, string> }) => Promise<GitHubRelease[]>;
  getLatestRelease: (repo: string, options?: { headers?: Record<string, string> }) => Promise<GitHubRelease>;
  
  // Paths
  getPluginsDir: () => string;
  
  // Hot reload
  reloadPlugin: (pluginName: string, manager: BasePluginManager) => Promise<boolean>;
}

// ============================================================================
// API Implementation
// ============================================================================

/**
 * Plugin Manager API instance
 */
export const pluginAPI: PluginManagerAPI = {
  /**
   * Install a plugin from a GitHub release
   */
  installFromGitHub: async (options: PluginDownloadOptions): Promise<PluginInstallResult> => {
    console.log(`[PluginAPI] Installing from GitHub: ${options.repo}`);
    const result = await installFromGitHub(options);
    
    if (result.success) {
      console.log(`[PluginAPI] Successfully installed ${result.pluginName}@${result.version}`);
    } else {
      console.error(`[PluginAPI] Failed to install: ${result.error}`);
    }
    
    return result;
  },

  /**
   * Install a plugin from a local zip file
   */
  installFromZip: async (zipPath: string, pluginName?: string): Promise<PluginInstallResult> => {
    console.log(`[PluginAPI] Installing from zip: ${zipPath}`);
    
    // Validate file exists
    if (!fs.existsSync(zipPath)) {
      return {
        success: false,
        error: `File not found: ${zipPath}`,
      };
    }
    
    const result = await installFromZip(zipPath, pluginName);
    
    if (result.success) {
      console.log(`[PluginAPI] Successfully installed ${result.pluginName}`);
    } else {
      console.error(`[PluginAPI] Failed to install: ${result.error}`);
    }
    
    return result;
  },

  /**
   * List all installed plugins
   */
  listPlugins: (manager: BasePluginManager) => {
      if (!manager) return [];
      const plugins = manager.listPlugins();
      return plugins.map((id) => ({
        id,
        name: id,
        version: "1.0.0",
        enabled: true,
      }));
  },

  /**
   * Remove a plugin
   */
  removePlugin: (pluginName: string): { success: boolean; error?: string } => {
    console.log(`[PluginAPI] Removing plugin: ${pluginName}`);
    const result = removePlugin(pluginName);
    
    if (result.success) {
      console.log(`[PluginAPI] Successfully removed ${pluginName}`);
    } else {
      console.error(`[PluginAPI] Failed to remove: ${result.error}`);
    }
    
    return result;
  },

  /**
   * Check if a plugin is installed
   */
  isPluginInstalled: (pluginName: string): boolean => {
    return isPluginInstalled(pluginName);
  },

  /**
   * Get releases from a GitHub repository
   */
  getGitHubReleases: async (
    repo: string,
    options?: { headers?: Record<string, string> }
  ): Promise<GitHubRelease[]> => {
    return await PluginInstaller.fetchGitHubReleases(repo, options);
  },

  /**
   * Get the latest release from a GitHub repository
   */
  getLatestRelease: async (
    repo: string,
    options?: { headers?: Record<string, string> }
  ): Promise<GitHubRelease> => {
    return await PluginInstaller.fetchLatestRelease(repo, options);
  },

  /**
   * Get the plugins directory path
   */
  getPluginsDir: (): string => {
    return PluginInstaller.getPluginsDir();
  },

  /**
   * Reload a specific plugin
   * Note: Full hot-reload requires the plugin to be previously loaded
   */
  reloadPlugin: async (pluginName: string, manager: BasePluginManager): Promise<boolean> => {
    try {
      await manager.reloadPlugin(pluginName);
      console.log(`[PluginAPI] Successfully reloaded plugin: ${pluginName}`);
      return true;
    } catch (error) {
      console.error(`[PluginAPI] Failed to reload plugin: ${pluginName}`, error);
      return false;
    }
  },
};

// ============================================================================
// Export
// ============================================================================

export default pluginAPI;
