import * as path from 'node:path';

export type AfterExportAction = 'none' | 'open' | 'reveal';
export type PreviewRefreshMode = 'manual' | 'onSave' | 'onType';
export type ScrollSyncBehavior = 'smooth' | 'instant';
export type PreviewZoomLevel = 'fit' | '50%' | '75%' | '100%' | '125%' | '150%';
export type PreviewViewMode = 'paged' | 'continuous';

export interface DefaultPdfMarginSettings {
  top: string;
  bottom: string;
  left: string;
  right: string;
}

export interface DefaultPdfSettings {
  format: 'A4';
  landscape: boolean;
  margin: DefaultPdfMarginSettings;
}

export interface DefaultDiagramSettings {
  width?: string;
  height?: string;
  fit: 'contain' | 'fill';
  align: 'center' | 'left' | 'right';
}

export interface DefaultGoogleFontFamilySetting {
  name: string;
  weights?: number[];
}

export interface DefaultStyleFontSettings {
  family?: string;
  codeFamily?: string;
  google: {
    families: DefaultGoogleFontFamilySetting[];
  };
}

export interface DefaultStyleSettings {
  font: DefaultStyleFontSettings;
}

export interface DefaultDocumentSettings {
  pdf: DefaultPdfSettings;
  diagram: DefaultDiagramSettings;
  style: DefaultStyleSettings;
}

export interface ExtensionSettings {
  browser: {
    executablePath?: string;
  };
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
    defaultViewMode: PreviewViewMode;
  };
  styles: string[];
  default: DefaultDocumentSettings;
}

export interface RawExtensionSettings {
  browser?: {
    executablePath?: string;
  };
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
    defaultViewMode?: string;
  };
  styles?: unknown;
  default?: {
    pdf?: {
      format?: string;
      landscape?: boolean;
      margin?: {
        top?: string;
        bottom?: string;
        left?: string;
        right?: string;
      };
    };
    diagram?: {
      width?: string;
      height?: string;
      fit?: string;
      align?: string;
    };
    style?: {
      font?: {
        family?: string;
        codeFamily?: string;
        google?: {
          families?: unknown;
        };
      };
    };
  };
}

/**
 * Pure parser for extension settings.
 * Normalizes empty strings and whitespace to undefined / defaults.
 */
export function parseExtensionSettings(raw?: RawExtensionSettings): ExtensionSettings {
  const rawBrowserPath = raw?.browser?.executablePath;
  const browserExecutablePath =
    rawBrowserPath && rawBrowserPath.trim() ? rawBrowserPath.trim() : undefined;

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

  const rawViewMode = raw?.preview?.defaultViewMode;
  const defaultViewMode: PreviewViewMode = rawViewMode === 'continuous' ? 'continuous' : 'paged';

  let styles: string[] = [];
  if (Array.isArray(raw?.styles)) {
    styles = raw.styles
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // Parse default document options (pdf, diagram, style.font)
  const defaultRaw = raw?.default;

  const defaultPdfFormat = defaultRaw?.pdf?.format === 'A4' ? 'A4' : 'A4';
  const defaultPdfLandscape = Boolean(defaultRaw?.pdf?.landscape);
  const defaultPdfMarginTop = defaultRaw?.pdf?.margin?.top?.trim() || '15mm';
  const defaultPdfMarginBottom = defaultRaw?.pdf?.margin?.bottom?.trim() || '15mm';
  const defaultPdfMarginLeft = defaultRaw?.pdf?.margin?.left?.trim() || '15mm';
  const defaultPdfMarginRight = defaultRaw?.pdf?.margin?.right?.trim() || '15mm';

  const defaultDiagramWidth = defaultRaw?.diagram?.width?.trim() || undefined;
  const defaultDiagramHeight = defaultRaw?.diagram?.height?.trim() || undefined;
  const defaultDiagramFit = defaultRaw?.diagram?.fit === 'fill' ? 'fill' : 'contain';
  const defaultDiagramAlign =
    defaultRaw?.diagram?.align === 'left' || defaultRaw?.diagram?.align === 'right'
      ? defaultRaw.diagram.align
      : 'center';

  const defaultFontFamily = defaultRaw?.style?.font?.family?.trim() || undefined;
  const defaultCodeFontFamily = defaultRaw?.style?.font?.codeFamily?.trim() || undefined;

  const defaultGoogleFamilies: DefaultGoogleFontFamilySetting[] = [];
  if (Array.isArray(defaultRaw?.style?.font?.google?.families)) {
    for (const item of defaultRaw.style.font.google.families) {
      if (item && typeof item === 'object' && 'name' in item && typeof item.name === 'string') {
        const name = item.name.trim();
        if (name) {
          const rawWeights = (item as { weights?: unknown }).weights;
          const weights =
            Array.isArray(rawWeights) && rawWeights.every((w) => typeof w === 'number')
              ? rawWeights.map((w) => Math.floor(w))
              : undefined;
          defaultGoogleFamilies.push({ name, weights });
        }
      }
    }
  }

  return {
    browser: {
      executablePath: browserExecutablePath,
    },
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
      defaultViewMode,
    },
    styles,
    default: {
      pdf: {
        format: defaultPdfFormat,
        landscape: defaultPdfLandscape,
        margin: {
          top: defaultPdfMarginTop,
          bottom: defaultPdfMarginBottom,
          left: defaultPdfMarginLeft,
          right: defaultPdfMarginRight,
        },
      },
      diagram: {
        width: defaultDiagramWidth,
        height: defaultDiagramHeight,
        fit: defaultDiagramFit,
        align: defaultDiagramAlign,
      },
      style: {
        font: {
          family: defaultFontFamily,
          codeFamily: defaultCodeFontFamily,
          google: {
            families: defaultGoogleFamilies,
          },
        },
      },
    },
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
