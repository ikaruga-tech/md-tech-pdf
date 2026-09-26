import * as path from 'node:path';

export type AfterExportAction = 'none' | 'open' | 'reveal';
export type PreviewRefreshMode = 'manual' | 'onSave' | 'onType';
export type ScrollSyncBehavior = 'smooth' | 'instant';
export type PreviewZoomLevel = 'fit' | '50%' | '75%' | '100%' | '125%' | '150%';

export interface ExtensionSettings {
  plantuml: {
    javaPath: string;
    jarPath?: string;
  };
  export: {
    outputDirectory?: string;
    afterExport: AfterExportAction;
  };
  preview: {
    refresh: PreviewRefreshMode;
    debounceDelay: number;
    cache: {
      persistent: boolean;
    };
    scrollSync: {
      enabled: boolean;
      behavior: ScrollSyncBehavior;
      delay: number;
    };
    zoom: PreviewZoomLevel;
  };
  styles: string[];
}

export interface RawExtensionSettings {
  plantuml?: {
    javaPath?: string;
    jarPath?: string;
  };
  export?: {
    outputDirectory?: string;
    afterExport?: string;
  };
  preview?: {
    refresh?: string;
    debounceDelay?: number;
    cache?: {
      persistent?: boolean;
    };
    scrollSync?: {
      enabled?: boolean;
      behavior?: string;
      delay?: number;
    };
    zoom?: string;
  };
  styles?: unknown;
}

/**
 * Pure parser for extension settings.
 * Normalizes empty strings and whitespace to undefined / defaults.
 */
export function parseExtensionSettings(raw?: RawExtensionSettings): ExtensionSettings {
  const rawJavaPath = raw?.plantuml?.javaPath;
  const javaPath = rawJavaPath && rawJavaPath.trim() ? rawJavaPath.trim() : 'java';

  const rawJarPath = raw?.plantuml?.jarPath;
  const jarPath = rawJarPath && rawJarPath.trim() ? rawJarPath.trim() : undefined;

  const rawOutputDir = raw?.export?.outputDirectory;
  const outputDirectory = rawOutputDir && rawOutputDir.trim() ? rawOutputDir.trim() : undefined;

  const rawAfterExport = raw?.export?.afterExport;
  const afterExport: AfterExportAction =
    rawAfterExport === 'open' || rawAfterExport === 'reveal' ? rawAfterExport : 'none';

  const rawRefresh = raw?.preview?.refresh;
  const refresh: PreviewRefreshMode =
    rawRefresh === 'manual' || rawRefresh === 'onType' ? rawRefresh : 'onSave';

  const rawDebounceDelay = raw?.preview?.debounceDelay;
  const debounceDelay =
    typeof rawDebounceDelay === 'number' &&
    Number.isFinite(rawDebounceDelay) &&
    rawDebounceDelay >= 100
      ? Math.floor(rawDebounceDelay)
      : 500;

  const rawPersistent = raw?.preview?.cache?.persistent;
  const persistent = typeof rawPersistent === 'boolean' ? rawPersistent : true;

  const rawSyncEnabled = raw?.preview?.scrollSync?.enabled;
  const syncEnabled = typeof rawSyncEnabled === 'boolean' ? rawSyncEnabled : true;

  const rawSyncBehavior = raw?.preview?.scrollSync?.behavior;
  const syncBehavior: ScrollSyncBehavior = rawSyncBehavior === 'instant' ? 'instant' : 'smooth';

  const rawSyncDelay = raw?.preview?.scrollSync?.delay;
  const syncDelay =
    typeof rawSyncDelay === 'number' && Number.isFinite(rawSyncDelay) && rawSyncDelay >= 0
      ? Math.floor(rawSyncDelay)
      : 50;

  const rawZoom = raw?.preview?.zoom;
  const validZoomLevels: PreviewZoomLevel[] = ['fit', '50%', '75%', '100%', '125%', '150%'];
  const zoom: PreviewZoomLevel =
    typeof rawZoom === 'string' && validZoomLevels.includes(rawZoom as PreviewZoomLevel)
      ? (rawZoom as PreviewZoomLevel)
      : 'fit';

  let styles: string[] = [];
  if (Array.isArray(raw?.styles)) {
    styles = raw.styles
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  return {
    plantuml: {
      javaPath,
      jarPath,
    },
    export: {
      outputDirectory,
      afterExport,
    },
    preview: {
      refresh,
      debounceDelay,
      cache: {
        persistent,
      },
      scrollSync: {
        enabled: syncEnabled,
        behavior: syncBehavior,
        delay: syncDelay,
      },
      zoom,
    },
    styles,
  };
}

/**
 * Resolves the destination PDF output path based on optional outputDirectory setting.
 * - If outputDirectory is not specified, outputs to the same directory as the input Markdown file.
 * - If outputDirectory is an absolute path, resolves the destination relative to that absolute path.
 * - If outputDirectory is relative, resolves it relative to the workspace folder (or input directory if no workspace folder exists).
 */
export function resolveCustomOutputPath(
  inputPath: string,
  outputDirectory?: string,
  workspaceFolder?: string
): string {
  const parsed = path.parse(inputPath);
  const pdfFileName = `${parsed.name}.pdf`;

  if (!outputDirectory || !outputDirectory.trim()) {
    return path.join(parsed.dir, pdfFileName);
  }

  const trimmedOutputDir = outputDirectory.trim();

  if (path.isAbsolute(trimmedOutputDir)) {
    return path.join(trimmedOutputDir, pdfFileName);
  }

  const baseDir = workspaceFolder ?? parsed.dir;
  return path.resolve(baseDir, trimmedOutputDir, pdfFileName);
}
