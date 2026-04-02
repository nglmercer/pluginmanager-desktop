import type { IPlugin, PluginContext } from "bun_plugins";
import { PLUGIN_NAMES, ACTIONS } from "../src/bun/constants";
import { getRegistryPlugin } from "./utils/shared";
import { ApiExecutor } from "./utils/apifetch";

//        context?.emit(PLATFORMS.SYSTEM, { eventName: 'TTS', data: {message: "text"} });
// {"duration":5000,"volume":1,"muted":false,"video":"/uploads/video/951ef249-d8d9-47ad-8170-22f3875f4065.mp4"}
const OVERLAY_CONFIG = {
  default: {
  "url": "http://localhost:3001/api/tts/play",
  "method": "POST",
  "query": {
    "voice": "F1",
    "lang": "en",
    "play_now": "true"
  },
  "headers": {
    "Content-Type": "text/plain"
  },
  //{"duration":5000,"volume":1,"muted":false,"video":"/uploads/video/951ef249-d8d9-47ad-8170-22f3875f4065.mp4"}
  // mediatype: video | audio | image
  "body": {
    "duration": 5000,
    "volume": 1,
    "muted": false,
    //...mediatype currect video, audio or image
    "video": "/uploads/video/example.mp4"
  }
  },
  name: "overlay-service"
}
export class overlayPlugin implements IPlugin {
  name = OVERLAY_CONFIG.name;
  version = "1.0.0";
  description = "Overlay service use https://github.com/nglmercer/media-upload-api";
  defaultConfig?: Record<string, any> | undefined = OVERLAY_CONFIG;

  async onLoad(context: PluginContext) {
    const {log} = context;
    const registryPlugin = await getRegistryPlugin(context);
    if (!registryPlugin || !registryPlugin.registry) return;
    let config = await this.loadConfig(context);

    registryPlugin.registry.register(ACTIONS.TTS, async (action, ctx) => {
      if (!action.params) return;
      const {message} = action.params;
      if (!message || typeof message !== 'string') return;
      // { message: "text" }
      config = await this.loadConfig(context);
      const api = new ApiExecutor();
      const result = await api.execute({
        url: config.url!,
        method: (config.method! as "POST" | "GET" | "PUT" | "DELETE") || "POST",
        body: String(message),
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
