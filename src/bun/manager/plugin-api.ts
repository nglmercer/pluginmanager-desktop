/**
 * Plugin Manager API
 * Provides a simplified API for managing plugins (manual management focus)
 */

import {
  PluginInstaller,
  removePlugin,
  isPluginInstalled,
} from "./plugin-installer";
import { BasePluginManager } from "./baseplugin";
import type { PluginInfo } from "../ipc";

export interface PluginManagerAPI {
  // Management
  listPlugins: (manager: BasePluginManager) => PluginInfo[];
  removePlugin: (pluginName: string) => Promise<{ success: boolean; error?: string }>;
  isPluginInstalled: (pluginName: string) => boolean;
  
  // Paths
  getPluginsDir: () => string;
  
  // Hot reload
  reloadPlugin: (pluginName: string, manager: BasePluginManager) => Promise<boolean>;
}

/**
 * Plugin Manager API instance
 */
export const pluginAPI: PluginManagerAPI = {
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
  removePlugin: async (pluginName: string): Promise<{ success: boolean; error?: string }> => {
    console.log(`[PluginAPI] Removing plugin: ${pluginName}`);
    const result = await removePlugin(pluginName);
    
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
   * Get the plugins directory path
   */
  getPluginsDir: (): string => {
    return PluginInstaller.getPluginsDir();
  },

  /**
   * Reload a specific plugin
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

export default pluginAPI;
