import type { IPlugin, PluginContext } from "bun_plugins";
import type { ActionHandler } from "trigger_system/node";
import { ActionRegistry } from "trigger_system/node";
import { PLUGIN_NAMES } from "../constants";

export class ActionRegistryPlugin implements IPlugin {
  name = PLUGIN_NAMES.ACTION_REGISTRY;
  version = "1.0.0";

  public get registry() {
    return ActionRegistry.getInstance();
  }
  
  constructor() {
    //console.log(`${this.name} v${this.version}`);
  }

  onLoad(context: PluginContext) {
    const {log} = context;
    log.info(`${this.name} v${this.version} onLoad`);

    // context.storage.set("registry", this.registry.Handlers);
  }

  onUnload() {
    console.log(`${this.name} v${this.version} onUnload`);
  }


  register(name: string, fn: ActionHandler) {
    this.registry.register(name, fn);
  }
}

export const actionRegistryPlugin = new ActionRegistryPlugin();
