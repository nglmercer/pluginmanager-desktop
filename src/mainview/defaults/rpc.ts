import { Electroview } from "electrobun/view";
import type { PluginManagerRPC } from "../../shared/types";

// Type for async callback resolving
type Resolver = (data: unknown) => void;
type Rejecter = (error: Error) => void;

const asyncCallbacks = new Map<string, { resolve: Resolver; reject: Rejecter }>();

// Define RPC schema for plugin manager
const rpc = Electroview.defineRPC<PluginManagerRPC>({
  handlers: {
    requests: {},
    messages: {
      asyncResponse: ({ id, data, error }: { id: string; data?: unknown; error?: string }) => {
        const cb = asyncCallbacks.get(id);
        if (cb) {
          if (error) {
            cb.reject(new Error(error));
          } else {
            cb.resolve(data);
          }
          asyncCallbacks.delete(id);
        }
      },
      togglePlugin: (data: { pluginName: string; enabled: boolean }) => {
        window.dispatchEvent(new CustomEvent("togglePlugin", { detail: data }));
      },
      pluginLoaded: (data: { pluginId: string; name: string }) => 
        window.dispatchEvent(new CustomEvent("pluginLoaded", { detail: data })),
      pluginUnloaded: (data: { pluginId: string }) => 
        window.dispatchEvent(new CustomEvent("pluginUnloaded", { detail: data })),
      pluginError: (data: { pluginId: string; error: string }) => 
        window.dispatchEvent(new CustomEvent("pluginError", { detail: data })),
      eventReceived: (data: { platform: string; eventName: string; data: unknown }) => 
        window.dispatchEvent(new CustomEvent("eventReceived", { detail: data })),
      showNotification: ({ title, message }: { title: string; message: string }) => {
        (window as any).alert(message, title);
      },
      windowStateChanged: () => {},
    },
  },
});

export const electroview = new Electroview({ rpc });

/**
 * Invokes an RPC method on the Bun side with support for async responses
 */
export async function invokeRpc<K extends keyof PluginManagerRPC["bun"]["requests"]>(
  method: K,
  params: PluginManagerRPC["bun"]["requests"][K]["params"]
): Promise<unknown> {
  // @ts-ignore - electroview.rpc.request has dynamic members based on schema
  const res = await (electroview.rpc.request as any)[method](params);
  
  // Check if it's an async message redirection (Bun sends us an ID to wait for)
  if (res && typeof res === "object" && "type" in res && res.type === "async_id") {
    return new Promise((resolve, reject) => {
      asyncCallbacks.set(res.id as string, { resolve, reject });
    });
  }
  
  return res;
}
