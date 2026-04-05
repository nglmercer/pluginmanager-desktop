import { BaseApiPlugin, type BaseApiConfig } from "./utils/baseApiPlugin";
import { OVERLAY_CONFIG, type OverlayParams } from "../src/bun/constants";

export class overlayPlugin extends BaseApiPlugin<OverlayParams> {
  name = OVERLAY_CONFIG.name;
  version = "1.0.0";
  description = "Overlay service use https://github.com/nglmercer/media-upload-api";
  defaultConfig: BaseApiConfig = OVERLAY_CONFIG.default;
  actionName = OVERLAY_CONFIG.name;

  validateParams(params: unknown): OverlayParams | null {
    if (typeof params !== 'object' || params === null) return null;
    const { video, audio, image, duration = 5000, volume = 1, muted = false } = params as Record<string, unknown>;

    if ((!video && !audio && !image) || 
        (video && typeof video !== 'string') || 
        (audio && typeof audio !== 'string') || 
        (image && typeof image !== 'string')) {
      return null;
    }
    return { 
      video: video as string | undefined, 
      audio: audio as string | undefined, 
      image: image as string | undefined,
      duration: duration as number,
      volume: volume as number,
      muted: muted as boolean
    };
  }

  buildBody(validatedParams: OverlayParams, config: BaseApiConfig): string | undefined {
    return JSON.stringify(validatedParams);
  }
}
