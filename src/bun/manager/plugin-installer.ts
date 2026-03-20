/**
 * Plugin Installer Module (Simplified)
 * Handles basic management like path resolution and removal.
 * Installation is now handled manually by the user in the file explorer.
 */

import { join } from "node:path";
import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import { getBaseDir } from "../utils/filepath";
import { PATHS } from "../constants";
import { BasePluginManager } from "./baseplugin";
import { JsonPluginStorage } from "bun_plugins";
export class PluginInstallerService {
  public static getPluginsDir(): string {
    return join(getBaseDir(), PATHS.PLUGINS_DIR);
  }

  public static async removePlugin(pluginName: string, manager?: BasePluginManager): Promise<{ success: boolean; error?: string }> {
    const pathplugin = manager?.getPluginPath(pluginName);
    try {
      if (!pathplugin) {
        return { success: false, error: `Plugin ${pluginName} not found` };
      }
      manager?.unregister(pluginName);
      console.log('[uninstall] uninstalled plugin', pluginName);
      await fs.unlink(pathplugin);
      return { success: true };
    } catch (error) {
      console.error(`[uninstall] Failed to remove plugin ${pluginName}: ${pathplugin}`, error);
      return { success: false, error: String(error) };
    }
  }

  public static isPluginInstalled(pluginName: string): boolean {
    return fsSync.existsSync(join(this.getPluginsDir(), pluginName));
  }
  public static getConfig(pluginName: string, key: string):unknown | boolean{
    const storage = JsonPluginStorage.getInstanceByName(pluginName);
    if(!storage){
      return false;
    }
    return storage.get(key);
  }
  public static setConfig(pluginName: string, key: string, value: unknown):unknown | boolean{
    const storage = JsonPluginStorage.getInstanceByName(pluginName);
    if(!storage){
      return false;
    }
    storage.set(key, value);
    return storage.get(key);
  }
}

// Named exports
export const removePlugin = PluginInstallerService.removePlugin.bind(PluginInstallerService);
export const isPluginInstalled = PluginInstallerService.isPluginInstalled.bind(PluginInstallerService);
export const getPluginsDir = PluginInstallerService.getPluginsDir.bind(PluginInstallerService);

/**
 * Backward compatible PluginInstaller object
 */
export const PluginInstaller = {
  removePlugin,
  isPluginInstalled,
  getPluginsDir,
};

export default PluginInstaller;
