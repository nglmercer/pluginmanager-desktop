import { Electroview } from "electrobun/view";
import type { PluginManagerRPC } from "./types";
import { PLUGIN_NAMES } from "../bun/constants";
// Type for async callback resolving
type Resolver = (data: unknown) => void;
type Rejecter = (error: Error) => void;

const asyncCallbacks = new Map<string, { resolve: Resolver; reject: Rejecter }>();

// Define RPC schema for plugin manager
const rpc = Electroview.defineRPC<PluginManagerRPC>({
  maxRequestTime: 120000, // Important: 2 minute timeout to prevent blocking dialogs from timing out
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
      
      // Editor Integration (Bun -> WebView)
      triggerEditorImport: (data) => {
        window.dispatchEvent(new CustomEvent("triggerEditorImport", { detail: data }));
        window.postMessage({ type: 'TRIGGER_EDITOR_IMPORT', ...data }, '*');
      },
      triggerEditorRequestExport: () => {
        window.dispatchEvent(new CustomEvent("triggerEditorRequestExport", { detail: {} }));
        window.postMessage({ type: 'TRIGGER_EDITOR_REQUEST_EXPORT' }, '*');
      },
      triggerEditorClear: () => {
        window.dispatchEvent(new CustomEvent("triggerEditorClear", { detail: {} }));
        window.postMessage({ type: 'TRIGGER_EDITOR_CLEAR' }, '*');
      },
    },
  },
});

export const electroview = new Electroview({ rpc });
export const EXPORT_CLICKED = 'TRIGGER_EDITOR_EXPORT_CLICKED';
// Relay messages from Editor (postMessage) to Bun (RPC)
declare global {
  interface Window {
    // add you custom properties and methods
    logs?: boolean
    triggerEditor?: {
      importJson?: (json: string | object) => void;
      importYaml?: (yaml: string) => void;
      requestExport?: () => void;
      clear?: () => void;
      addAutocompleteData?: (alias: string, data: any, mode?: 'path' | 'value') => void;
      removeAutocompleteData?: (alias: string) => void;
      testEvent?: (eventName: string, data?: Record<string, any>, vars?: Record<string, any>, state?: Record<string, any>) => Promise<any>;
    };
  }
}
window.logs = true

window.addEventListener('message', (event) => {
  const { data } = event;
  if (!data || typeof data !== 'object') return;
  if (window.logs) console.log('[RPC] Message from Editor:', data);
  if (window.triggerEditor) {
    if (data.type === PLUGIN_NAMES.ACTION_REGISTRY){
      window.triggerEditor.addAutocompleteData?.(PLUGIN_NAMES.ACTION_REGISTRY, data.data, 'value' as 'path' | 'value');
    }
  }
  if (data.type === EXPORT_CLICKED) {
    console.log('[RPC] Relaying TRIGGER_EDITOR_EXPORT to Bun');
    electroview.rpc!.send.editorExported(data.payload);
  }
});

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
