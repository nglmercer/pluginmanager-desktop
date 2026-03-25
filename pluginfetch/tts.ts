import type { IPlugin, PluginContext } from "bun_plugins";
import { PLUGIN_NAMES, ACTIONS } from "../src/bun/constants";
import { getRegistryPlugin,ApiExecutor } from "./shared";

export class saveDataPlugin implements IPlugin {
  name = PLUGIN_NAMES.TTS_SERVICE;
  version = "1.0.0";
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
    const {log,storage} = context;
    const registryPlugin = await getRegistryPlugin(context);
    if (!registryPlugin) return;

    registryPlugin.registry?.register(ACTIONS.TTS, async (action, ctx) => {
      const msg = String(action?.params?.message);
      if (!msg)return;
      //ctx.data
      const defaultUrl = await storage.get("tts_url",this.defaultConfig?.url);
      const api = new ApiExecutor();
      const result = await api.execute({
        url: defaultUrl!,
        method: this.defaultConfig?.method || "POST",
        body: msg,
        query: this.defaultConfig?.query,
        headers: this.defaultConfig?.headers
      }).catch(err => {
        log.error("TTS request failed",err);
        return null;
      });
      return result;
    });
  }
  
  onUnload() {
    
  }
}
