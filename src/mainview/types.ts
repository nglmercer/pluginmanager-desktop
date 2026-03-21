// Type definitions for the Plugin Manager component

export interface PluginInfo {
  name: string;
  id: string;
  version: string;
  description?: string;
  enabled: boolean;
}

export interface RemoveResult {
  success: boolean;
  error?: string;
}
