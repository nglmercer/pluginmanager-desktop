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
export interface PluginManagerAPI {
  // Management
  removePlugin: (pluginName: string, manager?: BasePluginManager) => Promise<{ success: boolean; error?: string }>;
  isPluginInstalled: (pluginName: string) => boolean;
  
  // Paths
  getPluginsDir: () => string;
  getRulesDir: () => string;
  
  // Hot reload
  reloadPlugin: (pluginName: string, manager: BasePluginManager) => Promise<boolean>;
}

/**
 * Plugin Manager API instance
 */
export const pluginAPI: PluginManagerAPI = {
  /**
   * Remove a plugin
   */
  removePlugin: async (pluginName: string, manager?: BasePluginManager): Promise<{ success: boolean; error?: string }> => {
    console.log(`[PluginAPI] Removing plugin: ${pluginName}`);
    const result = await removePlugin(pluginName, manager);
    
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
   * Get the rules directory path
   */
  getRulesDir: (): string => {
    return PluginInstaller.getRulesDir();
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
