import { Electroview } from "electrobun/view";
import type { PluginManagerRPC } from "./types";
import { PLUGIN_NAMES,OVERLAY_CONFIG } from "../bun/constants";
import { ApiExecutor,type RequestConfig,type filesResponse } from "../../pluginfetch/utils/apifetch";
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
export interface ActionField {
  readonly key: string;
  readonly label: string;
  readonly type: 'string' | 'number' | 'boolean' | 'select' | 'textarea';
  readonly placeholder?: string;
  readonly description?: string;
  readonly labelKey?: string;
  readonly descriptionKey?: string;
  readonly options?: readonly { 
    readonly value: string; 
    readonly label: string; 
    readonly labelKey?: string 
  }[];
  readonly default?: any;
}

export interface ActionConfig {
  readonly type: string;
  readonly fields: readonly ActionField[];
}
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
      registerActionConfig?: (config: ActionConfig) => void;
      getActionConfigs?: () => ActionConfig[];
      //[key: string | string[], options?: (Omit<TOptions, "context"> & { context?: string | undefined; }) | undefined] | [key: string | string[], options: TOptionsBase & $Dictionary & { ...; }]
      t?: (key: string, options?: Record<string, any> | any) => string;
    };
  }
}
window.logs = true
window.addEventListener('message',async (event) => {
  const { data } = event;
  if (!data || typeof data !== 'object') return;

  if (window.logs) console.log('[RPC] Message from Editor:', data);
  if (window.triggerEditor) {
    if (data.type === PLUGIN_NAMES.ACTION_REGISTRY){
      window.triggerEditor.addAutocompleteData?.(PLUGIN_NAMES.ACTION_REGISTRY, data.data, 'value' as 'path' | 'value');
    }
    if (data.type === PLUGIN_NAMES.SAVE_EVENTS){
      window.triggerEditor.addAutocompleteData?.(PLUGIN_NAMES.SAVE_EVENTS, data.data, 'path' as 'path' | 'value');      
    }
    const TTS_config = {
      type: 'tts',
      fields: [
          { 
            key: 'message', 
            label: 'Text to Speak', 
            labelKey: window.triggerEditor.t?.('tts.message', 'Text to Speak'), 
            type: 'string', 
            placeholder: window.triggerEditor.t?.('tts.placeholder', 'Enter text to speak...') 
          }
        ]
    } as const;
    window.triggerEditor.registerActionConfig?.(TTS_config);
    // TODO: Add media upload config
    if (data.type === OVERLAY_CONFIG.name){
      const options: RequestConfig = {
        url: data.storage.url,
        method: 'GET'
      }
      const mediaOptions = await getMedia(options.url ? options : undefined);
      const mediaConfig = {
      type: OVERLAY_CONFIG.name,
      fields: [
        {
          key: 'media',
          label: 'Media',
          labelKey: window.triggerEditor.t?.('media.label', 'Media'),
          type: 'select',
          options: mediaOptions,
          placeholder: window.triggerEditor.t?.('media.placeholder', 'Select media...')
        }
      ]
    } as const;
    window.triggerEditor.registerActionConfig?.(mediaConfig);
    }
  }
  if (data.type === EXPORT_CLICKED) {
    console.log('[RPC] Relaying TRIGGER_EDITOR_EXPORT to Bun');
    electroview.rpc!.send.editorExported(data.payload);
  }

});
// http://localhost:3001/api/files?pageSize=100
async function getMedia(config: RequestConfig ={
  url: 'http://localhost:3001/api/files',
  method: 'GET',
  query: {
    pageSize: '100'
  }
}): Promise<{ value: string; label: string }[]> {
  try {
    const executor = new ApiExecutor();
    const result = await executor.execute(config) as filesResponse;
    return result.files.map((file) => ({ value: file.id, label: file.name }));
  } catch (error) {
    console.error('Error fetching media:', error);
    return [];
  }
}
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
