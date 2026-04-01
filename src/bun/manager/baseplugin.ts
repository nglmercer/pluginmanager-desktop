import { PluginManager } from "bun_plugins";
import { RuleEngine, RuleRegistry, RulePersistence } from "trigger_system/node";
import type { TriggerRule } from "trigger_system/node";
import { join } from "node:path";
import * as fs from "node:fs/promises";
import { actionRegistryPlugin, ActionRegistryPlugin } from "./Register";
import { ensureDir, getBaseDir } from "../utils/filepath";
import { PLUGIN_NAMES, PATHS } from "../constants";
import { helpers } from "./defaults/helpers";

/**
 * Gestor de plugins personalizado para TTS
 * Extiende PluginManager para asegurar que el ActionRegistryPlugin esté siempre cargado
 */
export class BasePluginManager extends PluginManager {
  public engine: RuleEngine;
  public registry: RuleRegistry;
  public alreadyLoaded: boolean = false;
  public isReloadingRules: boolean = false;
  public actionRegistryPlugin: ActionRegistryPlugin | null = null;
  public pluginsDir = join(getBaseDir(), PATHS.PLUGINS_DIR);
  public rulesDir = join(getBaseDir(), PATHS.RULES_DIR);
  
  // Track all discovered plugins' metadata and disabled names
  public discoveredPluginsMetadata: Map<string, {name: string, version: string, description: string}> = new Map();
  public disabledPluginNames: Set<string> = new Set();

  constructor() {
    super(undefined, {
      pluginLoadTimeout: 30000
    });
    // Inicializar el motor de reglas
    this.engine = new RuleEngine({ rules: [], globalSettings: { debugMode: true } });
    this.registry = new RuleRegistry();
    this.registry.setDefaultDir(this.rulesDir);
    
    // Ensure directories exist
    ensureDir(this.pluginsDir);
    ensureDir(this.rulesDir);
    
    // Registrar los plugins core automáticamente
    this.actionRegistryPlugin = actionRegistryPlugin;
    this.register(this.actionRegistryPlugin);
  }

  /**
   * Emula un evento para testing
   * @param eventName - Nombre del evento (ej: 'chat', 'gift', 'comment')
   * @param data - Datos del evento (objeto con la estructura del evento)
   */
  async emulateEvent(eventName: string, data: Record<string, unknown>, pluginHelpers: Record<string, unknown> = helpers) {
    console.log(`[EMULATE]`, {
        eventName,
        data
        
    });
    return this.engine.processEventSimple(eventName, data, pluginHelpers);
  }

  /**
   * Get the rules directory path
   */
  public getRulesDir(): string {
    return this.rulesDir;
  }

  /**
   * Carga plugins desde el directorio configurado por defecto
   */
  async loadDefaultPlugins() {
    if (this.alreadyLoaded) return;
    this.alreadyLoaded = true;
    await ensureDir(this.pluginsDir);
    await this.loadPluginsFromDirectory(this.pluginsDir);
    
    // Capture metadata for all discovered plugins
    this.updateDiscoveredPluginsMetadata();
    
    return this.listPlugins();
  }

  /**
   * Update the internal registry of discovered plugins
   */
  private updateDiscoveredPluginsMetadata() {
    const activePlugins = this.listPlugins();
    for (const name of activePlugins) {
      if (name === PLUGIN_NAMES.ACTION_REGISTRY) continue;
      
      const plugin = this.getPlugin(name);
      if (plugin && !this.discoveredPluginsMetadata.has(name)) {
        this.discoveredPluginsMetadata.set(name, {
          name: plugin.name,
          version: plugin.version,
          description: plugin.description || ""
        });
      }
    }
  }

  /**
   * Toggle a plugin (enable/disable)
   * @param pluginName - Name of the plugin
   * @param enabled - Whether to enable or disable
   */
  public async togglePlugin(pluginName: string, enabled: boolean): Promise<void> {
    console.log(`[PluginManager] Toggling plugin ${pluginName}: ${enabled}`);
    if (enabled) {
      // For enabling, we attempt to re-enable it
      await this.enablePlugin(pluginName);
      this.disabledPluginNames.delete(pluginName);
      
      // Update metadata in case it's the first time it's being properly enabled
      this.updateDiscoveredPluginsMetadata();
    } else {
      // Store metadata before disabling if we don't have it yet
      const plugin = this.getPlugin(pluginName);
      if (plugin) {
        this.discoveredPluginsMetadata.set(pluginName, {
          name: plugin.name,
          version: plugin.version,
          description: plugin.description || ""
        });
      }
      
      // For disabling, we unregister it from the manager
      await this.disablePlugin(pluginName);
      this.disabledPluginNames.add(pluginName);
    }
  }

  /**
   * Load rules from the rules directory into the registry and engine
   */
  public async loadRules(): Promise<void> {
    if (this.isReloadingRules) return;
    this.isReloadingRules = true;
    
    console.log(`[PluginManager] Loading rules from ${this.rulesDir}`);
    try {
      const files = await fs.readdir(this.rulesDir);
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.json'));
      
      const allLoaded: {rules: TriggerRule[], path: string}[] = [];
      
      for (const file of yamlFiles) {
        const filePath = join(this.rulesDir, file);
        try {
          const rules = await RulePersistence.loadFile(filePath);
          if (rules && rules.length > 0) {
            allLoaded.push({ rules, path: filePath });
          }
        } catch (error) {
          console.error(`[PluginManager] Failed to load rules from ${file}:`, error);
        }
      }

      // Atomic-ish swap: clear only when we have the new data ready
      this.registry.clear();
      for (const item of allLoaded) {
        this.registry.registerAll(item.rules, item.path);
      }
      
      this.updateEngineFromRegistry();
    } catch (error) {
      console.error(`[PluginManager] Failed to read rules directory:`, error);
    } finally {
      this.isReloadingRules = false;
    }
  }

  /**
   * Sync the engine with the registry rules
   */
  public updateEngineFromRegistry(): void {
    const rules = this.registry.getAll();
    this.engine.updateRules(rules);
    console.log(`[PluginManager] Updated engine with ${rules.length} rules from registry`);
  }
}