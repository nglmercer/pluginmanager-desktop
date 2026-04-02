import type { IPlugin, PluginContext } from "bun_plugins";
import { getRegistryPlugin } from "./shared";
import { ApiExecutor } from "./apifetch";

export interface BaseApiConfig {
  method?: string;
  url?: string;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: unknown;
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

    const defaultMethod = await storage.get<string>("method", config.method);
    const defaultUrl = await storage.get<string>("url", config.url);
    const defaultQuery = await storage.get<Record<string, unknown>>("query", config.query);
    const defaultHeaders = await storage.get<Record<string, unknown>>("headers", config.headers);

    if (defaultMethod === config.method) {
      await storage.set("method", defaultMethod);
    }
    if (defaultUrl === config.url) {
      await storage.set("url", defaultUrl);
    }
    if (defaultQuery === config.query) {
      await storage.set("query", defaultQuery);
    }
    if (defaultHeaders === config.headers) {
      await storage.set("headers", defaultHeaders);
    }

    return {
      method: defaultMethod,
      url: defaultUrl,
      query: defaultQuery,
      headers: defaultHeaders
    };
  }

  onUnload() {}
}

