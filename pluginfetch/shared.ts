import type { IPlugin,PluginContext } from "bun_plugins";
import type { ActionRegistry } from "trigger_system/node";
import { PLUGIN_NAMES } from "../src/bun/constants";
/* import { type as arkType, type Type } from "arktype";
import type { Action, TriggerContext,ActionHandler } from "trigger_system/node";
import { ExpressionEngine } from "trigger_system/node"; */
export interface ActionRegistryApi extends IPlugin {
  register: ActionRegistry["register"];
  get: ActionRegistry["get"];
  registry?: ActionRegistry | null;
  registerHelper: (name: string, fn: Function) => void;
  getHelpers: () => Record<string, Function>;
}
export async function getRegistryPlugin(context: PluginContext){
    const registryPlugin = (await context.getPlugin(
      PLUGIN_NAMES.ACTION_REGISTRY
    )) as ActionRegistryApi;
    return registryPlugin
}
export type RequestConfig = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string | object;
};

export class ApiExecutor {
  private defaults: Partial<RequestConfig>;

  constructor(defaults: Partial<RequestConfig> = {}) {
    this.defaults = {
      headers: { 'Content-Type': 'application/json' },
      ...defaults
    };
  }

  /**
   * Replaces placeholders in the body or URL
   * e.g., replaceVariables("Hello {name}", { name: "World" }) -> "Hello World"
   */
  private replaceVariables(template: string, vars: Record<string, string>): string {
    return template.replace(/{(\w+)}/g, (_, key) => vars[key] || `{${key}}`);
  }

  async execute(config: RequestConfig, vars: Record<string, string> = {}) {
    const finalUrl = this.replaceVariables(config.url, vars);
    const finalBody = typeof config.body === 'string' 
      ? this.replaceVariables(config.body, vars) 
      : config.body;

    const url = new URL(finalUrl);
    if (config.query) {
      Object.entries(config.query).forEach(([k, v]) => url.searchParams.append(k, v));
    }

    const response = await fetch(url.toString(), {
      method: config.method || this.defaults.method,
      headers: { ...this.defaults.headers, ...config.headers },
      body: typeof finalBody === 'object' ? JSON.stringify(finalBody) : finalBody,
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    return response.json().catch(() => response.text());
  }
}