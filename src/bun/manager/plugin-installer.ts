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

    // Create hidden temporary download and extraction paths
    const pluginsDir = getPluginsDir();
    await ensureDir(pluginsDir);
    
    const tempBaseDir = join(pluginsDir, ".temp");
    await ensureDir(tempBaseDir);
    
    const tempDownloadPath = join(tempBaseDir, `download_${Date.now()}_${asset.name}`);
    const tempExtractPath = join(tempBaseDir, `extract_${Date.now()}_${pluginName}`);
    await ensureDir(tempExtractPath);

    // Download the asset
    console.log(`[PluginInstaller] Downloading ${asset.name}...`);
    await downloadReleaseAsset(asset, tempDownloadPath, headers);

    // Extract to temporary directory
    console.log(`[PluginInstaller] Extracting ${asset.name} to ${pluginsDir}...`);
    await extractArchive(tempDownloadPath, tempExtractPath);

    // Clean up temp download file
    if (fs.existsSync(tempDownloadPath)) {
      fs.rmSync(tempDownloadPath, { force: true });
    }

    // Determine the root folder from extraction
    const extractedItems = fs.readdirSync(tempExtractPath);
    const extractedDirs = extractedItems.filter(f => {
      const stat = fs.statSync(join(tempExtractPath, f));
      return stat.isDirectory();
    });

    let sourcePath = tempExtractPath;
    let folderToMove = "";

    if (extractedItems.length === 1 && extractedDirs.length === 1) {
      // Everything is inside one root folder, move only that folder
      folderToMove = extractedDirs[0];
      sourcePath = join(tempExtractPath, folderToMove);
    }

    // Determine initial plugin path
    const initialName = folderToMove || pluginName;
    let pluginPath = join(pluginsDir, initialName);
    
    // Remove existing plugin if exists
    if (fs.existsSync(pluginPath)) {
      fs.rmSync(pluginPath, { recursive: true, force: true });
    }
    
    // Move to plugins directory
    fs.renameSync(sourcePath, pluginPath);

    // Clean up temp extraction dir if it still exists (it will be empty or have metadata)
    if (fs.existsSync(tempExtractPath)) {
      fs.rmSync(tempExtractPath, { recursive: true, force: true });
    }

    let finalName = pluginName;
    let finalPath = pluginPath;
    const packageJsonPath = join(finalPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        if (pkg.name && pkg.name !== pluginName) {
          const newPath = join(pluginsDir, pkg.name);
          if (fs.existsSync(newPath)) {
            fs.rmSync(newPath, { recursive: true, force: true });
          }
          fs.renameSync(finalPath, newPath);
          finalPath = newPath;
          finalName = pkg.name;
        }
      } catch {
        // Ignore parse errors
      }
    }

    return {
      success: true,
      pluginPath: finalPath,
      pluginName: finalName,
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

    // Determine default name
    const defaultName = zipPath.split("/").pop()?.replace(/\.zip$/, "") || "unknown-plugin";
    const initialName = pluginName || defaultName;

    // Create a temporary hidden extraction directory
    const tempExtractPath = join(pluginsDir, `.temp_extract_${Date.now()}`);
    await ensureDir(tempExtractPath);

    // Extract the archive
    console.log(`[PluginInstaller] Extracting ${zipPath} to ${pluginsDir}...`);
    await extractArchive(zipPath, tempExtractPath);

    // Handle nested directory
    const extractedItems = fs.readdirSync(tempExtractPath);
    const extractedDirs = extractedItems.filter(f => {
      const stat = fs.statSync(join(tempExtractPath, f));
      return stat.isDirectory();
    });

    let sourcePath = tempExtractPath;
    let finalInitialName = initialName;

    if (extractedItems.length === 1 && extractedDirs.length === 1) {
      // Move contents up one level if everything is wrapped in a single root folder
      const rootFolder = extractedDirs[0];
      sourcePath = join(tempExtractPath, rootFolder);
      // If no name was provided, use the root folder name
      if (!pluginName) finalInitialName = rootFolder;
    }

    const pluginPath = join(pluginsDir, finalInitialName);

    // Remove existing plugin if exists
    if (fs.existsSync(pluginPath)) {
      fs.rmSync(pluginPath, { recursive: true, force: true });
    }

    // Move to final location
    fs.renameSync(sourcePath, pluginPath);

    // Clean up temp dir if it still exists
    if (fs.existsSync(tempExtractPath)) {
      fs.rmSync(tempExtractPath, { recursive: true, force: true });
    }

    let version: string | undefined;
    let finalName = finalInitialName;
    let finalPath = pluginPath;
    
    const packageJsonPath = join(finalPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        version = pkg.version;
        if (pkg.name && pkg.name !== name) {
          const newPath = join(pluginsDir, pkg.name);
          if (fs.existsSync(newPath)) {
            fs.rmSync(newPath, { recursive: true, force: true });
          }
          fs.renameSync(finalPath, newPath);
          finalPath = newPath;
          finalName = pkg.name;
        }
      } catch {
        // Ignore package.json parse errors
      }
    }

    return {
      success: true,
      pluginPath: finalPath,
      pluginName: finalName,
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
  
  removePlugin,
  isPluginInstalled,
  
  // Utilities
  getPluginsDir,
};

export default PluginInstaller;
