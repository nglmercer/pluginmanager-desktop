import type { IPlugin, PluginContext } from "bun_plugins";
import { PLUGIN_NAMES, ACTIONS } from "../src/bun/constants";
import { BaseApiPlugin, type BaseApiConfig } from "./utils/baseApiPlugin";

const OVERLAY_CONFIG = {
  default: {
    "url": "http://localhost:3001/api/alerts/trigger",
    "method": "POST",
    "headers": {
      "Content-Type": "text/plain",
      "Authorization": "Bearer your-token-here"
    },
    "body": {
      "duration": 5000,
      "volume": 1,
      "muted": false,
      //"video": "/uploads/video/example.mp4"
      //"image": "/uploads/image/example.png"
      //"audio": "/uploads/audio/example.mp3"
    }
  },
  name: "overlay-service"
}

export interface OverlayParams {
  video?: string;
  audio?: string;
  image?: string;
}

export class overlayPlugin extends BaseApiPlugin<OverlayParams> {
  name = OVERLAY_CONFIG.name;
  version = "1.0.0";
  description = "Overlay service use https://github.com/nglmercer/media-upload-api";
  defaultConfig: BaseApiConfig = OVERLAY_CONFIG.default;
  actionName = OVERLAY_CONFIG.name;

  validateParams(params: unknown): OverlayParams | null {
    if (typeof params !== 'object' || params === null) return null;
    const { video, audio, image } = params as Record<string, unknown>;

    if ((!video && !audio && !image) || 
        (video && typeof video !== 'string') || 
        (audio && typeof audio !== 'string') || 
        (image && typeof image !== 'string')) {
      return null;
    }
    return { 
      video: video as string | undefined, 
      audio: audio as string | undefined, 
      image: image as string | undefined
    };
  }

  buildBody(validatedParams: OverlayParams, config: BaseApiConfig): string | undefined {
    return JSON.stringify(validatedParams);
  }
}
