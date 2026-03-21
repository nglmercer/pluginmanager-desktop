// Type definitions for the Plugin Manager component

export interface PluginInfo {
  name: string;
  id: string;
  version: string;
  description?: string;
  enabled: boolean;
}

export interface RuleInfo {
  id: string;
  name?: string;
  description?: string;
  platform: string;
  enabled: boolean;
  priority?: number;
  tags?: string[];
}

export interface RemoveResult {
  success: boolean;
  error?: string;
}
