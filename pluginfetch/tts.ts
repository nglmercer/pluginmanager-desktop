import type { IPlugin, PluginContext } from "bun_plugins";
import { PLUGIN_NAMES, ACTIONS } from "../src/bun/constants";
import { getRegistryPlugin } from "./shared";
import { ApiExecutor } from "./apifetch";

//        context?.emit(PLATFORMS.SYSTEM, { eventName: 'TTS', data: {message: "text"} });
export class saveDataPlugin implements IPlugin {
  name = PLUGIN_NAMES.TTS_SERVICE;
  version = "1.0.0";
  description = "Text-to-speech service use https://github.com/nglmercer/SonicBoom";
  defaultConfig?: Record<string, any> | undefined = {
      "url": "http://localhost:8455/api/tts/play",
      "method": "POST",
      "query": {
        "voice": "F1",
        "lang": "en",
        "play_now": "true"
      },
      "headers": {
        "Content-Type": "text/plain"
      },
      "body": "${message}"
  }

  async onLoad(context: PluginContext) {
    const {log} = context;
    const registryPlugin = await getRegistryPlugin(context);
    if (!registryPlugin || !registryPlugin.registry) return;
    let config = await this.loadConfig(context);

    registryPlugin.registry.register(ACTIONS.TTS, async (action, ctx) => {
      const msg = String(action.params?.message);
      if (!msg)return;
      config = await this.loadConfig(context);
      const api = new ApiExecutor();
      const result = await api.execute({
        url: config.url!,
        method: (config.method! as "POST" | "GET" | "PUT" | "DELETE") || "POST",
        body: msg,
        query: config.query,
        headers: config.headers
      }).catch(err => {
        log.error("TTS request failed",err);
        return null;
      });
      return result;
    });
  }
  async loadConfig(context: PluginContext) {
    const {storage} = context;
    const config = this.defaultConfig;
        //ctx.data
    const defaultMethod = await storage.get<string>("method",config?.method);
    const defaultUrl = await storage.get<string>("url",config?.url) ;
    const defaultQuery = await storage.get<Record<string, any>>("query",config?.query);
    const defaultHeaders = await storage.get<Record<string, any>>("headers",config?.headers);
    if (defaultMethod === config?.method) {
      await storage.set("method",defaultMethod);
    }
    if (defaultUrl === config?.url) {
      await storage.set("url",defaultUrl);
    }
    if (defaultQuery === config?.query) {
      await storage.set("query",defaultQuery);
    }
    if (defaultHeaders === config?.headers) {
      await storage.set("headers",defaultHeaders);
    }
    return {
      method: defaultMethod,
      url: defaultUrl,
      query: defaultQuery,
      headers: defaultHeaders
    };
  }
  onUnload() {
    
  }
}
