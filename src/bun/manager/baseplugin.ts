import { PluginManager } from "bun_plugins";
import { RuleEngine } from "trigger_system/node";
import { join } from "node:path";
import { ActionRegistryPlugin } from "./Register";
import { ensureDir, getBaseDir } from "../utils/filepath";
import { PLUGIN_NAMES } from "../constants";
/**
 * Gestor de plugins personalizado para TTS
 * Extiende PluginManager para asegurar que el ActionRegistryPlugin esté siempre cargado
 */
export class BasePluginManager extends PluginManager {
  public engine: RuleEngine;
  public alreadyLoaded: boolean = false;
  public pluginsDir = join(getBaseDir(), "plugins");
  constructor() {
    super(undefined,{
      pluginLoadTimeout: 30000
    });
    // Inicializar el motor de reglas
    this.engine = new RuleEngine({ rules: [], globalSettings: { debugMode: true } });
    
    // Registrar los plugins core automáticamente
    this.register(new ActionRegistryPlugin());
    console.log("📦 BasePluginManager: Plugins ActionRegistry y RuleTester registrados");
  }

  /**
   * Emula un evento para testing
   * @param eventName - Nombre del evento (ej: 'chat', 'gift', 'comment')
   * @param data - Datos del evento (objeto con la estructura del evento)
   */
  async emulateEvent(eventName: string, data: any) {
    const registryPlugin = (await this.getPlugin(
      PLUGIN_NAMES.ACTION_REGISTRY
    )) as ActionRegistryPlugin;
    const pluginHelpers = registryPlugin?.Helpers || {};
    
    console.log(`[EMULATE] Evento: ${eventName}`, data);
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
}