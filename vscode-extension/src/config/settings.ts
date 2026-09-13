import * as path from 'node:path';

export type AfterExportAction = 'none' | 'open' | 'reveal';

export interface ExtensionSettings {
  plantuml: {
    javaPath: string;
    jarPath?: string;
  };
  export: {
    outputDirectory?: string;
    afterExport: AfterExportAction;
  };
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

  return {
    plantuml: {
      javaPath,
      jarPath,
    },
    export: {
      outputDirectory,
      afterExport,
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
