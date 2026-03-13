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

export class PluginInstallerService {
  public static getPluginsDir(): string {
    return join(getBaseDir(), PATHS.PLUGINS_DIR);
  }

  public static async removePlugin(pluginName: string): Promise<{ success: boolean; error?: string }> {
    const pluginPath = join(this.getPluginsDir(), pluginName);
    if (!fsSync.existsSync(pluginPath)) {
      return { success: false, error: "Plugin not found" };
    }
    
    try {
      await fs.rm(pluginPath, { recursive: true, force: true });
      return { success: true };
    } catch (error) {
      console.error(`[PluginInstaller] Failed to remove plugin: ${pluginName}`, error);
      return { success: false, error: String(error) };
    }
  }

  public static isPluginInstalled(pluginName: string): boolean {
    return fsSync.existsSync(join(this.getPluginsDir(), pluginName));
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
