import { PluginManager } from "bun_plugins";
import { RuleEngine } from "trigger_system/node";
import { join } from "node:path";
import { actionRegistryPlugin, ActionRegistryPlugin } from "./Register";
import { ensureDir, getBaseDir } from "../utils/filepath";
import { PLUGIN_NAMES } from "../constants";
import { helpers } from "./defaults/helpers";

/**
 * Gestor de plugins personalizado para TTS
 * Extiende PluginManager para asegurar que el ActionRegistryPlugin esté siempre cargado
 */
export class BasePluginManager extends PluginManager {
  public engine: RuleEngine;
  public alreadyLoaded: boolean = false;
  public actionRegistryPlugin: ActionRegistryPlugin | null = null;
  public pluginsDir = join(getBaseDir(), "plugins");

  constructor() {
    super(undefined, {
      pluginLoadTimeout: 30000
    });
    // Inicializar el motor de reglas
    this.engine = new RuleEngine({ rules: [], globalSettings: { debugMode: true } });
    
    // Registrar los plugins core automáticamente
    this.actionRegistryPlugin = actionRegistryPlugin;
    Object.entries(helpers).forEach(([name, fn]) => {
      this.actionRegistryPlugin?.register(name, fn);
    });
    this.register(this.actionRegistryPlugin);
  }

  /**
   * Emula un evento para testing
   * @param eventName - Nombre del evento (ej: 'chat', 'gift', 'comment')
   * @param data - Datos del evento (objeto con la estructura del evento)
   */
  async emulateEvent(eventName: string, data: Record<string, unknown>) {
    const registryPlugin = (await this.getPlugin(
      PLUGIN_NAMES.ACTION_REGISTRY
    )) as ActionRegistryPlugin;
    const pluginHelpers = registryPlugin?.Helpers || {};
    
    console.log(`[EMULATE]`, {
        eventName,
        data,
        pluginHelpers
    });
    this.engine.processEventSimple(eventName, data, pluginHelpers);
  }

  /**
   * Carga plugins desde el directorio configurado por defecto
   */
  async loadDefaultPlugins() {
    if (this.alreadyLoaded) return;
    this.alreadyLoaded = true;
    await ensureDir(this.pluginsDir);
    await this.loadPluginsFromDirectory(this.pluginsDir);
    return this.listPlugins();
  }

  /**
   * Toggle a plugin (enable/disable)
   * @param pluginName - Name of the plugin
   * @param enabled - Whether to enable or disable
   */
  public async togglePlugin(pluginName: string, enabled: boolean): Promise<void> {
    console.log(`[PluginManager] Toggling plugin ${pluginName}: ${enabled}`);
    if (enabled) {
      // For enabling, we attempt to reload it (or load if first time)
      await this.reloadPlugin(pluginName);
    } else {
      // For disabling, we unregister it from the manager
      this.unregister(pluginName);
    }
  }
}