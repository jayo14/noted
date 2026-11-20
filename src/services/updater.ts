/**
 * Over-The-Air (OTA) Update Service for Noted
 *
 * Checks GitHub Releases API for new signed releases (APKs for Android, packages for Desktop),
 * handles semver comparisons, manages update prompts, and triggers downloads.
 */

export const CURRENT_APP_VERSION = "0.1.2";
export const GITHUB_REPO = "jayo14/noted";

export interface UpdateAsset {
  name: string;
  size: number;
  downloadUrl: string;
  contentType: string;
}

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  tagName: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl: string;
  releaseUrl: string;
  assetName?: string;
  assetSize?: number;
}

const STORAGE_LAST_CHECK_KEY = "noted_last_update_check";
const STORAGE_DISMISSED_KEY = "noted_dismissed_update";
// Check at most every 2 hours on automatic startup checks to respect rate limits
const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000;

/**
 * Compare two semver strings (e.g., "0.1.0" and "v0.1.1").
 * Returns:
 *   1 if latest is newer than current (update available)
 *  -1 if current is newer than latest
 *   0 if equal
 */
export function compareSemver(current: string, latest: string): number {
  const cleanCurrent = current.replace(/^[vV]/, "").trim();
  const cleanLatest = latest.replace(/^[vV]/, "").trim();

  // Strip pre-release suffixes for basic numeric comparison
  const [currBase] = cleanCurrent.split("-");
  const [latestBase] = cleanLatest.split("-");

  const cParts = currBase.split(".").map((p) => parseInt(p, 10) || 0);
  const lParts = latestBase.split(".").map((p) => parseInt(p, 10) || 0);

  const len = Math.max(cParts.length, lParts.length);
  for (let i = 0; i < len; i++) {
    const c = cParts[i] ?? 0;
    const l = lParts[i] ?? 0;
    if (l > c) return 1;
    if (l < c) return -1;
  }

  return 0;
}

/**
 * Detect current platform / OS
 */
export function detectPlatform(): "android" | "windows" | "linux" | "macos" | "web" {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux")) return "linux";
  if (ua.includes("mac")) return "macos";
  return "web";
}

/**
 * Find the most suitable download asset for the current platform
 */
function findPlatformAsset(
  assets: Array<{
    name: string;
    size: number;
    browser_download_url: string;
    content_type: string;
  }>,
  platform = detectPlatform()
): { url: string; name?: string; size?: number } | null {
  if (!assets || assets.length === 0) return null;

  if (platform === "android") {
    // Prefer universal release APK
    const universal = assets.find((a) => a.name === "app-universal-release.apk");
    if (universal) {
      return { url: universal.browser_download_url, name: universal.name, size: universal.size };
    }
    const anyApk = assets.find((a) => a.name.endsWith(".apk"));
    if (anyApk) {
      return { url: anyApk.browser_download_url, name: anyApk.name, size: anyApk.size };
    }
  }

  if (platform === "windows") {
    const setupExe = assets.find((a) => a.name.includes("setup.exe") || a.name.endsWith(".exe"));
    if (setupExe) {
      return { url: setupExe.browser_download_url, name: setupExe.name, size: setupExe.size };
    }
    const msi = assets.find((a) => a.name.endsWith(".msi"));
    if (msi) {
      return { url: msi.browser_download_url, name: msi.name, size: msi.size };
    }
  }

  if (platform === "linux") {
    const appImage = assets.find((a) => a.name.endsWith(".AppImage"));
    if (appImage) {
      return { url: appImage.browser_download_url, name: appImage.name, size: appImage.size };
    }
    const deb = assets.find((a) => a.name.endsWith(".deb"));
    if (deb) {
      return { url: deb.browser_download_url, name: deb.name, size: deb.size };
    }
  }

  // Fallback to first available asset if any
  return {
    url: assets[0].browser_download_url,
    name: assets[0].name,
    size: assets[0].size,
  };
}

/**
 * Format bytes to readable string (e.g. "48.8 MB")
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

/**
 * Format ISO date string to human readable
 */
export function formatReleaseDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Check GitHub Releases for available updates
 */
export async function checkForUpdates(options: { force?: boolean } = {}): Promise<UpdateInfo | null> {
  const { force = false } = options;

  if (!force && typeof localStorage !== "undefined") {
    const lastCheckStr = localStorage.getItem(STORAGE_LAST_CHECK_KEY);
    if (lastCheckStr) {
      const lastCheck = parseInt(lastCheckStr, 10);
      if (!isNaN(lastCheck) && Date.now() - lastCheck < CHECK_INTERVAL_MS) {
        // Return null to avoid spamming the GitHub API
        return null;
      }
    }
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_LAST_CHECK_KEY, Date.now().toString());
    }

    if (!response.ok) {
      console.warn(`[Updater] GitHub release check returned status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const tagName: string = data.tag_name || "";
    const cleanVersion = tagName.replace(/^[vV]/, "").trim();

    const isAvailable = compareSemver(CURRENT_APP_VERSION, cleanVersion) > 0;
    const targetAsset = findPlatformAsset(data.assets || []);

    const updateInfo: UpdateInfo = {
      available: isAvailable,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: cleanVersion,
      tagName,
      releaseName: data.name || `Release ${tagName}`,
      releaseNotes: data.body || "A new update for Noted is available.",
      publishedAt: data.published_at || new Date().toISOString(),
      downloadUrl: targetAsset?.url || data.html_url,
      releaseUrl: data.html_url,
      assetName: targetAsset?.name,
      assetSize: targetAsset?.size,
    };

    return updateInfo;
  } catch (err) {
    console.error("[Updater] Failed to check for updates:", err);
    return null;
  }
}

/**
 * Record a version as dismissed by the user so we do not repeatedly prompt
 */
export function dismissUpdate(version: string): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_DISMISSED_KEY, version);
  }
}

/**
 * Check if this version was previously dismissed
 */
export function isUpdateDismissed(version: string): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(STORAGE_DISMISSED_KEY) === version;
}

/**
 * Trigger download or opening of the update package
 */
export async function openUpdate(updateInfo: UpdateInfo): Promise<void> {
  const url = updateInfo.downloadUrl || updateInfo.releaseUrl;
  try {
    // Dynamic import to support both Tauri native and browser environments
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }
}
