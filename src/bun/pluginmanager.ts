import { TriggerLoader } from "trigger_system/node";
import { BasePluginManager } from "./manager/baseplugin";
import { ensureDir, getBaseDir } from "./utils/filepath";
import { ActionRegistryPlugin } from "./manager/Register";
import * as path from "path";
import { PLATFORMS, PLUGIN_NAMES, PATHS } from "./constants";

const manager = new BasePluginManager();

export async function main() {
  await manager.loadDefaultPlugins();
  const engine = manager.engine;

  
  console.log("[MAIN]", Object.values(PLATFORMS));
  Object.values(PLATFORMS).forEach((platform) => {
    manager.on(platform, async ({ eventName, data }) => {
      const registryPlugin = (await manager.getPlugin(
        PLUGIN_NAMES.ACTION_REGISTRY
      )) as ActionRegistryPlugin;
      //console.log("Helpers:", registryPlugin);
      
      const pluginHelpers = registryPlugin.Helpers;
      //console.log(pluginHelpers,registryPlugin);
      if (!eventName || !data) {
        return;
      }
      engine.processEventSimple(eventName, data, pluginHelpers);
    });
  });

  // El plugin siempre emite { eventName, data } (datos raw por defecto)
  /* manager.on('tiktok', ({ eventName, data }) => {
        if (!eventName || !data) {
            return;
        }
        engine.processEventSimple(eventName, data);
    }); */

  const rulesDir = path.resolve(getBaseDir(), PATHS.RULES_DIR);
  const result = ensureDir(rulesDir);

  //watcher se ejecuta despues o demora al inicializar que los demas eventos
  const watcher = TriggerLoader.watchRules(rulesDir, async (newRules) => {
    engine.updateRules(newRules);
    const ruleIds = engine.getRules().map((r) => r.id);
    const loadedPlugins = manager.listPlugins();
    console.log({
      loadedPlugins,
      ruleIds,
      length: newRules.length,
    });

  });
  watcher.on("error", (err) => {
    console.error("Error watching rules:", err);
  });
  manager.enableHotReload(manager.pluginsDir);
  const pluginsInfo = manager.getPluginStatus();
  console.log("Plugins info:", pluginsInfo);
  return {
    engine,
    manager,
    watcher,
    rulesDir,
    result,
  };
}

