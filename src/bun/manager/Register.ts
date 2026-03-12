import type { IPlugin, PluginContext } from "bun_plugins";
import type { ActionHandler } from "trigger_system/node";
import { ActionRegistry } from "trigger_system/node";
import { PLUGIN_NAMES } from "../constants";


export class HelperRegistry {
  private static instance: HelperRegistry;
  private helpers: Record<string, Function> = {};

  private constructor() {}

  static getInstance(): HelperRegistry {
    if (!HelperRegistry.instance) {
      HelperRegistry.instance = new HelperRegistry();
    }
    return HelperRegistry.instance;
  }

  register(name: string, fn: Function) {
    this.helpers[name] = fn;
    console.log(`[HelperRegistry] Helper registrado: ${name}`);
  }

  getHelpers() {
    return { ...this.helpers };
  }

  get(name: string): Function | undefined {
    return this.helpers[name];
  }
}

export class ActionRegistryPlugin implements IPlugin {
  name = PLUGIN_NAMES.ACTION_REGISTRY;
  version = "1.0.0";

  public get registry() {
    return ActionRegistry.getInstance();
  }

  public get helperRegistry() {
    return HelperRegistry.getInstance();
  }

  get Helpers() {
    return this.helperRegistry.getHelpers();
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
