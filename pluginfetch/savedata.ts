import type { IPlugin, PluginContext } from "bun_plugins";
import { PLUGIN_NAMES, ACTIONS, PLATFORMS } from "../src/bun/constants";
import { getRegistryPlugin, parseData } from "./shared";
import { mkdir,readdir } from "node:fs/promises";
async function ensureDir(path: string) {
  try {
    const exists = await readdir(path).catch(() => false);
    if (!exists) {
      await mkdir(path, { recursive: true });
    }
  } catch (error) {
    console.error("[Storage] Error ensuring directory.", error);
  }
}
export class saveDataPlugin implements IPlugin {
  name = PLUGIN_NAMES.SAVE_EVENTS;
  description = "Saves event data to files and keeps an in-memory cache";
  version = "1.1.0";
  
  private context?: PluginContext;
  private saveEnabled: boolean = true;
  public eventCache = new Map<string, any>();

  async onLoad(context: PluginContext) {
    this.context = context;
    const { log,on } = this.context;
    const registryPlugin = await getRegistryPlugin(context);
    
    if (registryPlugin?.registry) {
      registryPlugin.registry.register(ACTIONS.AUTOSAVE, (action) => {
        const msg = String(action?.params?.message);
        const enabledValues = ['true', 'on', 'enabled', true];
        this.saveEnabled = enabledValues.includes(msg);
        return this.saveEnabled;
      });
    }

    log.info(`${this.name} initialized.`);

    Object.values(PLATFORMS).forEach((platform) => {
      on(platform, async ({ eventName, data }) => {
        if (!eventName || data == null) return;

        const parsed = parseData(data);
        if (!parsed) return;

        this.eventCache.set(eventName, parsed);

        if (this.saveEnabled) {
          await this.persistToDisk(eventName, parsed);
        }
      });
    });
    await this.getData();
  }

  private async persistToDisk(eventName: string, data: any) {
    try {
      const filePath = `./data/${eventName}.json`;
      await Bun.write(
        filePath, 
        JSON.stringify(data, null, 2), 
        { createPath: true }
      );
      return {filePath, success: true};
    } catch (error) {
      return {filePath: null, success: false,error};
    }
  }
  async getData(): Promise<Record<string, any>> {
    const allData: Record<string, any> = Object.fromEntries(this.eventCache);
    const { emit } = this.context!;
    try {
      const dataPath = "./data";
      const glob = new Bun.Glob("*.json");
      // fix when data folder not exist return 
      await ensureDir(dataPath);
      for await (const file of glob.scan({ cwd: dataPath })) {
        const eventName = file.replace(".json", "");
        
        if (!allData[eventName]) {
          const fileContent = Bun.file(`${dataPath}/${file}`);
          if (await fileContent.exists()) {
            allData[eventName] = await fileContent.json();
            this.eventCache.set(eventName, allData[eventName]);
          }
        }
        emit(this.name, allData);
      }
    } catch (e) {
      console.warn("[Storage] Error reading data folder.", e);
    }

    return allData;
  }
  onUnload() {
    this.eventCache.clear();
  }
}