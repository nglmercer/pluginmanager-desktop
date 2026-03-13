import { Electroview } from "electrobun/view";
import type { PluginManagerRPC } from "../shared/types";
import type { WindowStatus } from "../shared/types";

const asyncCallbacks = new Map<string, { resolve: Function; reject: Function }>();

// Define RPC schema for plugin manager
const rpc = Electroview.defineRPC<PluginManagerRPC>({
  handlers: {
    requests: {
       openWindow: () => true,
       closeWindow: () => true,
       getWindowStatus: (): WindowStatus => ({ isOpen: true, isFocused: true }),
    },
    messages: {
      asyncResponse: ({ id, data, error }: { id: string; data?: any; error?: string }) => {
        const cb = asyncCallbacks.get(id);
        if (cb) {
          if (error) cb.reject(new Error(error));
          else cb.resolve(data);
          asyncCallbacks.delete(id);
        }
      },
      pluginLoaded: (data: { pluginId: string; name: string }) => window.dispatchEvent(new CustomEvent("pluginLoaded", { detail: data })),
      pluginUnloaded: (data: { pluginId: string }) => window.dispatchEvent(new CustomEvent("pluginUnloaded", { detail: data })),
      pluginError: (data: { pluginId: string; error: string }) => window.dispatchEvent(new CustomEvent("pluginError", { detail: data })),
      eventReceived: (data: { platform: string; eventName: string; data: unknown }) => window.dispatchEvent(new CustomEvent("eventReceived", { detail: data })),
      showNotification: () => {},
      windowStateChanged: () => {},
    },
  },
});

export const electroview = new Electroview({ rpc });

export async function invokeRpc<K extends keyof PluginManagerRPC["bun"]["requests"]>(
  method: K,
  params: PluginManagerRPC["bun"]["requests"][K]["params"]
): Promise<any> { // Extracting real return type is tricky here but any works for the wrapper
  // @ts-ignore
  const res = await electroview.rpc.request[method](params);
  // @ts-ignore
  if (res && typeof res === "object" && "type" in res && res.type === "async_id") {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      asyncCallbacks.set(res.id, { resolve, reject });
    });
  }
  return res as any;
}
