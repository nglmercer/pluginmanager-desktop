/**
 * Plugin Installer Module
 * Handles downloading plugins from GitHub releases and installing from zip files
 */

import { join } from "node:path";
import * as fs from "node:fs";
import { ensureDir, getBaseDir } from "../utils/filepath";
import { PATHS } from "../constants";

// ============================================================================
// Types
// ============================================================================

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  zipball_url: string;
  tarball_url: string;
  assets: GitHubAsset[];
  published_at: string;
  draft: boolean;
  prerelease: boolean;
}

export interface GitHubAsset {
  id: number;
  name: string;
  label: string;
  content_type: string;
  size: number;
  browser_download_url: string;
  state: "uploaded" | "routing" | "processing" | "started" | "completed" | "replaced" | "deleted";
}

export interface PluginDownloadOptions {
  /** GitHub repository in format "owner/repo" */
  repo: string;
  /** Version/tag to download (default: latest) */
  version?: string;
  /** Name of the asset to download (e.g., "plugin.zip") */
  assetName?: string;
  /** Custom headers for authentication */
  headers?: Record<string, string>;
}

export interface PluginInstallResult {
  success: boolean;
  pluginPath?: string;
  pluginName?: string;
  version?: string;
  error?: string;
}

export interface LocalPluginInfo {
  name: string;
  path: string;
  hasPackageJson: boolean;
  packageJson?: {
    name: string;
    version: string;
    description?: string;
  };
}

// ============================================================================
// Constants
// ============================================================================

const GITHUB_API_BASE = "https://api.github.com/repos";

/**
 * Get the plugins directory path
 */
function getPluginsDir(): string {
  return join(getBaseDir(), PATHS.PLUGINS_DIR);
}

// ============================================================================
// GitHub API Functions
// ============================================================================

/**
 * Fetch releases from a GitHub repository
 */
export async function fetchGitHubReleases(
  repo: string,
  options?: { headers?: Record<string, string>; perPage?: number }
): Promise<GitHubRelease[]> {
  const { headers = {}, perPage = 30 } = options || {};
  
  const response = await fetch(`${GITHUB_API_BASE}/${repo}/releases?per_page=${perPage}`, {
    headers: {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as GitHubRelease[];
}

/**
 * Fetch the latest release from a GitHub repository
 */
export async function fetchLatestRelease(
  repo: string,
  options?: { headers?: Record<string, string> }
): Promise<GitHubRelease> {
  const { headers = {} } = options || {};
  
  const response = await fetch(`${GITHUB_API_BASE}/${repo}/releases/latest`, {
    headers: {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as GitHubRelease;
}

/**
 * Fetch a specific release by tag
 */
export async function fetchReleaseByTag(
  repo: string,
  tag: string,
  options?: { headers?: Record<string, string> }
): Promise<GitHubRelease> {
  const { headers = {} } = options || {};
  
  const response = await fetch(`${GITHUB_API_BASE}/${repo}/releases/tags/${tag}`, {
    headers: {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return await response.json() as GitHubRelease;
}

/**
 * Find a specific asset in a release by name pattern
 */
export function findAssetInRelease(
  release: GitHubRelease,
  pattern: string | RegExp
): GitHubAsset | undefined {
  return release.assets.find(asset => {
    if (typeof pattern === "string") {
      return asset.name === pattern || asset.name.endsWith(pattern);
    }
    return pattern.test(asset.name);
  });
}

// ============================================================================
// Download Functions
// ============================================================================

/**
 * Download a file from a URL
 */
export async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  // Ensure directory exists
  const dir = join(destPath, "..");
  await ensureDir(dir);

  // Write to file using Bun
  const arrayBuffer = await response.arrayBuffer();
  await Bun.write(destPath, new Uint8Array(arrayBuffer));
}

/**
 * Download a GitHub release asset
 */
export async function downloadReleaseAsset(
  asset: GitHubAsset,
  destPath: string,
  headers?: Record<string, string>
): Promise<void> {
  const response = await fetch(asset.browser_download_url, {
    headers: {
      "Accept": "application/octet-stream",
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  // Ensure directory exists
  const dir = join(destPath, "..");
  await ensureDir(dir);

  // Write to file
  const arrayBuffer = await response.arrayBuffer();
  await Bun.write(destPath, new Uint8Array(arrayBuffer));
}

// ============================================================================
// Archive Extraction Functions
// ============================================================================

/**
 * Extract a tar.gz archive to a directory
 */
export async function extractTarGz(archivePath: string, destDir: string): Promise<number> {
  const tarball = await Bun.file(archivePath).bytes();
  const archive = new Bun.Archive(tarball);
  
  await ensureDir(destDir);
  return await archive.extract(destDir);
}

/**
 * Extract a zip archive to a directory (using system unzip)
 */
export async function extractZip(archivePath: string, destDir: string): Promise<void> {
  const { spawn } = await import("node:child_process");
  
  await ensureDir(destDir);
  
  return new Promise((resolve, reject) => {
    const unzip = spawn("unzip", ["-o", archivePath, "-d", destDir], {
      stdio: "ignore",
    });
    
    unzip.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`unzip exited with code ${code}`));
      }
    });
    
    unzip.on("error", reject);
  });
}

/**
 * Auto-detect and extract an archive based on extension
 */
export async function extractArchive(archivePath: string, destDir: string): Promise<number> {
  if (archivePath.endsWith(".tar.gz") || archivePath.endsWith(".tgz")) {
    return await extractTarGz(archivePath, destDir);
  } else if (archivePath.endsWith(".zip")) {
    await extractZip(archivePath, destDir);
    // Return 0 since zip extraction doesn't return count
    return 0;
  } else {
    throw new Error(`Unsupported archive format: ${archivePath}`);
  }
}

// ============================================================================
// Plugin Installation Functions
// ============================================================================

/**
 * Download and install a plugin from GitHub release
 */
export async function installFromGitHub(
  options: PluginDownloadOptions
): Promise<PluginInstallResult> {
  const { repo, version, assetName, headers } = options;
  
  try {
    // Fetch release information
    let release: GitHubRelease;
    if (version) {
      release = await fetchReleaseByTag(repo, version, { headers });
    } else {
      release = await fetchLatestRelease(repo, { headers });
    }

    // Find the asset to download
    let asset: GitHubAsset | undefined;
    
    if (assetName) {
      asset = findAssetInRelease(release, assetName);
      if (!asset) {
        // Try common patterns
        const patterns = [
          assetName,
          `${assetName}.zip`,
          `${assetName}.tar.gz`,
          `${assetName}-${release.tag_name}.zip`,
          `${assetName}-${release.tag_name}.tar.gz`,
        ];
        
        for (const pattern of patterns) {
          asset = findAssetInRelease(release, pattern);
          if (asset) break;
        }
      }
    } else {
      // Try common plugin archive patterns
      const patterns = [
        /\.zip$/,
        /\.tar\.gz$/,
        /\.tgz$/,
        /plugin.*\.zip$/i,
        /plugin.*\.tar\.gz$/i,
      ];
      
      for (const pattern of patterns) {
        asset = findAssetInRelease(release, pattern);
        if (asset) break;
      }
    }

    if (!asset) {
      return {
        success: false,
        error: `No suitable asset found in release ${release.tag_name}`,
      };
    }

    // Determine plugin name from asset or repo
    const pluginName = asset.name
      .replace(/\.zip$/, "")
      .replace(/\.tar\.gz$/, "")
      .replace(/\.tgz$/, "")
      .replace(/-[0-9]+\.[0-9]+\.[0-9]+.*$/, ""); // Remove version suffix

    // Create temporary download path
    const pluginsDir = getPluginsDir();
    await ensureDir(pluginsDir);
    
    const tempPath = join(pluginsDir, ".temp", asset.name);
    await ensureDir(join(pluginsDir, ".temp"));

    // Download the asset
    console.log(`[PluginInstaller] Downloading ${asset.name}...`);
    await downloadReleaseAsset(asset, tempPath, headers);

    // Extract to plugins directory
    const pluginPath = join(pluginsDir, pluginName);
    console.log(`[PluginInstaller] Extracting to ${pluginPath}...`);
    
    // Remove existing plugin if exists
    if (fs.existsSync(pluginPath)) {
      fs.rmSync(pluginPath, { recursive: true, force: true });
    }
    
    await extractArchive(tempPath, pluginPath);

    // Clean up temp file
    fs.rmSync(join(pluginsDir, ".temp"), { recursive: true, force: true });

    // Handle nested directory (common in zip files)
    const extractedDirs = fs.readdirSync(pluginPath).filter(f => {
      const stat = fs.statSync(join(pluginPath, f));
      return stat.isDirectory();
    });

    let finalPluginPath = pluginPath;
    if (extractedDirs.length === 1) {
      // Move contents up one level
      const nestedPath = join(pluginPath, extractedDirs[0]);
      const tempMovePath = join(pluginsDir, ".temp_move");
      
      fs.renameSync(pluginPath, tempMovePath);
      fs.renameSync(tempMovePath, pluginPath);
      finalPluginPath = join(pluginPath, extractedDirs[0]);
    }

    return {
      success: true,
      pluginPath: finalPluginPath,
      pluginName,
      version: release.tag_name,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Install a plugin from a local zip file
 */
export async function installFromZip(
  zipPath: string,
  pluginName?: string
): Promise<PluginInstallResult> {
  try {
    const pluginsDir = getPluginsDir();
    await ensureDir(pluginsDir);

    // Determine plugin name
    const name = pluginName || 
      zipPath.split("/").pop()?.replace(/\.zip$/, "") || 
      "unknown-plugin";

    const pluginPath = join(pluginsDir, name);

    // Remove existing plugin if exists
    if (fs.existsSync(pluginPath)) {
      fs.rmSync(pluginPath, { recursive: true, force: true });
    }

    // Extract the archive
    console.log(`[PluginInstaller] Extracting ${zipPath} to ${pluginPath}...`);
    await extractArchive(zipPath, pluginPath);

    // Handle nested directory
    const extractedItems = fs.readdirSync(pluginPath);
    const extractedDirs = extractedItems.filter(f => {
      const stat = fs.statSync(join(pluginPath, f));
      return stat.isDirectory();
    });

    let finalPluginPath = pluginPath;
    if (extractedDirs.length === 1) {
      // Move contents up one level
      const nestedPath = join(pluginPath, extractedDirs[0]);
      const tempMovePath = join(pluginsDir, ".temp_move");
      
      fs.renameSync(pluginPath, tempMovePath);
      fs.renameSync(tempMovePath, pluginPath);
      finalPluginPath = join(pluginPath, extractedDirs[0]);
    }

    // Try to read package.json for version info
    let version: string | undefined;
    const packageJsonPath = join(pluginPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        version = pkg.version;
      } catch {
        // Ignore package.json parse errors
      }
    }

    return {
      success: true,
      pluginPath: finalPluginPath,
      pluginName: name,
      version,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Plugin Management Functions
// ============================================================================

/**
 * List all installed plugins
 */
export function listInstalledPlugins(): LocalPluginInfo[] {
  const pluginsDir = getPluginsDir();
  
  if (!fs.existsSync(pluginsDir)) {
    return [];
  }

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  
  return entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith("."))
    .map(entry => {
      const pluginPath = join(pluginsDir, entry.name);
      const packageJsonPath = join(pluginPath, "package.json");
      
      let hasPackageJson = false;
      let packageJson: LocalPluginInfo["packageJson"] = undefined;
      
      if (fs.existsSync(packageJsonPath)) {
        hasPackageJson = true;
        try {
          packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        } catch {
          // Ignore parse errors
        }
      }

      return {
        name: packageJson?.name || entry.name,
        path: pluginPath,
        hasPackageJson,
        packageJson,
      };
    });
}

/**
 * Remove a plugin
 */
export function removePlugin(pluginName: string): { success: boolean; error?: string } {
  const pluginsDir = getPluginsDir();
  const pluginPath = join(pluginsDir, pluginName);
  
  if (!fs.existsSync(pluginPath)) {
    return { success: false, error: `Plugin not found: ${pluginName}` };
  }

  try {
    fs.rmSync(pluginPath, { recursive: true, force: true });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if a plugin is installed
 */
export function isPluginInstalled(pluginName: string): boolean {
  const pluginsDir = getPluginsDir();
  const pluginPath = join(pluginsDir, pluginName);
  return fs.existsSync(pluginPath);
}

// ============================================================================
// Export all functions
// ============================================================================

export const PluginInstaller = {
  // GitHub API
  fetchGitHubReleases,
  fetchLatestRelease,
  fetchReleaseByTag,
  findAssetInRelease,
  
  // Download
  downloadFile,
  downloadReleaseAsset,
  
  // Extraction
  extractTarGz,
  extractZip,
  extractArchive,
  
  // Installation
  installFromGitHub,
  installFromZip,
  
  // Management
  listInstalledPlugins,
  removePlugin,
  isPluginInstalled,
  
  // Utilities
  getPluginsDir,
};

export default PluginInstaller;
