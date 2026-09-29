import * as fs from 'node:fs';
import * as path from 'node:path';

export type BrowserSource = 'setting' | 'auto';

export interface BrowserCandidate {
  name: string;
  path: string;
}

export interface ResolvedBrowser extends BrowserCandidate {
  source: BrowserSource;
}

export interface ResolveBrowserOptions {
  configuredPath?: string;
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  exists?: (filePath: string) => boolean;
}

const MAC_CANDIDATES: BrowserCandidate[] = [
  {
    name: 'Google Chrome',
    path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  },
  {
    name: 'Microsoft Edge',
    path: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  },
  {
    name: 'Brave Browser',
    path: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  },
  { name: 'Chromium', path: '/Applications/Chromium.app/Contents/MacOS/Chromium' },
];

const WINDOWS_FIXED_CANDIDATES: BrowserCandidate[] = [
  { name: 'Google Chrome', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
  {
    name: 'Google Chrome',
    path: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  },
  {
    name: 'Microsoft Edge',
    path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  },
  { name: 'Microsoft Edge', path: 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' },
];

const LINUX_CANDIDATES: BrowserCandidate[] = [
  { name: 'Google Chrome', path: '/usr/bin/google-chrome' },
  { name: 'Microsoft Edge', path: '/usr/bin/microsoft-edge' },
  { name: 'Brave Browser', path: '/usr/bin/brave-browser' },
  { name: 'Chromium', path: '/usr/bin/chromium' },
  { name: 'Chromium', path: '/usr/bin/chromium-browser' },
];

/**
 * Lists browser executable candidates for the platform, in search priority order.
 */
export function getBrowserCandidates(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv
): BrowserCandidate[] {
  if (platform === 'darwin') {
    return MAC_CANDIDATES;
  }

  if (platform === 'win32') {
    const localAppData = env.LOCALAPPDATA;
    const userCandidates: BrowserCandidate[] = localAppData
      ? [
          {
            name: 'Google Chrome',
            path: path.win32.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
          },
          {
            name: 'Microsoft Edge',
            path: path.win32.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
          },
        ]
      : [];
    return [...WINDOWS_FIXED_CANDIDATES, ...userCandidates];
  }

  if (platform === 'linux') {
    return LINUX_CANDIDATES;
  }

  return [];
}

/**
 * Infers a human-readable browser name from its executable path.
 */
export function detectBrowserName(executablePath: string): string {
  if (/edge/i.test(executablePath)) {
    return 'Microsoft Edge';
  }
  if (/brave/i.test(executablePath)) {
    return 'Brave Browser';
  }
  if (/chromium/i.test(executablePath)) {
    return 'Chromium';
  }
  if (/chrome/i.test(executablePath)) {
    return 'Google Chrome';
  }
  return path.basename(executablePath);
}

/**
 * Resolves the browser used for Mermaid rendering and PDF export.
 * An existing configured path always wins; otherwise the first installed candidate is used.
 */
export function resolveBrowserPath(
  options: ResolveBrowserOptions = {}
): ResolvedBrowser | undefined {
  const exists = options.exists ?? fs.existsSync;
  const configuredPath = options.configuredPath?.trim();

  if (configuredPath && exists(configuredPath)) {
    return {
      name: detectBrowserName(configuredPath),
      path: configuredPath,
      source: 'setting',
    };
  }

  const candidates = getBrowserCandidates(
    options.platform ?? process.platform,
    options.env ?? process.env
  );
  const found = candidates.find((candidate) => exists(candidate.path));
  return found ? { ...found, source: 'auto' } : undefined;
}
