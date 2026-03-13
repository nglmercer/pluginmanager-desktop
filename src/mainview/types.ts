// Type definitions for the Plugin Manager component

export interface PluginInfo {
  name: string;
  id: string;
  version: string;
  description?: string;
}

export interface GitHubAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name?: string;
  body?: string;
  published_at: string;
  assets: GitHubAsset[];
}

export interface InstallResult {
  success: boolean;
  pluginName?: string;
  version?: string;
  error?: string;
}

export interface RemoveResult {
  success: boolean;
  error?: string;
}
