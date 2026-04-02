import type { IPlugin, PluginContext } from "bun_plugins";
import { getRegistryPlugin } from "./shared";
import { ApiExecutor } from "./apifetch";

export interface BaseApiConfig {
  method?: string;
  url?: string;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: unknown;
  [key: string]: unknown;
}

export abstract class BaseApiPlugin<TParams = unknown> implements IPlugin {
  abstract name: string;
  abstract version: string;
  abstract description: string;
  abstract defaultConfig?: BaseApiConfig;
  abstract actionName: string;

  async onLoad(context: PluginContext) {
    const { log } = context;
    const registryPlugin = await getRegistryPlugin(context);
    if (!registryPlugin || !registryPlugin.registry) return;

    await this.loadConfig(context);

    registryPlugin.registry.register(this.actionName, async (action, ctx) => {
      if (!action.params) return;

      const validatedParams = this.validateParams(action.params);
      if (!validatedParams) return;

      const config = await this.loadConfig(context);
      const api = new ApiExecutor();
      
      const result = await api.execute({
        url: config.url!,
        method: (config.method! as "POST" | "GET" | "PUT" | "DELETE") || "POST",
        body: this.buildBody(validatedParams, config),
        query: config.query as Record<string, string>,
        headers: config.headers as Record<string, string>
      }).catch((err: unknown) => {
        log.error(`${this.name} request failed`, err);
        return null;
      });
      return result;
    });
  }

  // Returns valid params or null to abort execution
  abstract validateParams(params: unknown): TParams | null;
  
  // Builds the body string explicitly to be sent in the request
  abstract buildBody(validatedParams: TParams, config: BaseApiConfig): string | undefined;

  async loadConfig(context: PluginContext): Promise<BaseApiConfig> {
    const { storage } = context;
    const config = this.defaultConfig || {};
    const loadedConfig: Record<string, unknown> = {};

    for (const [key, defaultValue] of Object.entries(config)) {
      const storedValue = await storage.get(key, defaultValue);
      
      // Check if it's missing entirely to initialize it
      const rawStored = await storage.get(key);
      if (rawStored === undefined || rawStored === null) {
        await storage.set(key, defaultValue);
      }

      loadedConfig[key] = storedValue;
    }

    return loadedConfig as BaseApiConfig;
  }

  onUnload() {}
}

