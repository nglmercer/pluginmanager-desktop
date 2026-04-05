import { PLUGIN_NAMES, ACTIONS } from "../src/bun/constants";
import { BaseApiPlugin, type BaseApiConfig } from "./utils/baseApiPlugin";

export interface TTSParams {
  message: string;
}

// context?.emit(PLATFORMS.SYSTEM, { eventName: 'TTS', data: {message: "text"} });
export class saveDataPlugin extends BaseApiPlugin<TTSParams> {
  name = PLUGIN_NAMES.TTS_SERVICE;
  version = "1.0.0";
  description = "Text-to-speech service use https://github.com/nglmercer/SonicBoom";
  defaultConfig: BaseApiConfig = {
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
  };
  actionName = ACTIONS.TTS;

  validateParams(params: unknown): TTSParams | null {
    if (typeof params !== 'object' || params === null) return null;
    const { message } = params as Record<string, unknown>;
    
    if (!message || typeof message !== 'string') return null;
    return { message };
  }

  buildBody(validatedParams: TTSParams, config: BaseApiConfig): string | undefined {
    return String(validatedParams.message);
  }
}
