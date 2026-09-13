import * as vscode from 'vscode';
import {
  type AfterExportAction,
  type ExtensionSettings,
  type RawExtensionSettings,
  parseExtensionSettings,
  resolveCustomOutputPath,
} from './settings.js';

export type { AfterExportAction, ExtensionSettings, RawExtensionSettings };
export { parseExtensionSettings, resolveCustomOutputPath };

/**
 * Reads extension settings from VS Code workspace configuration.
 * Trims strings and falls back to safe defaults when empty or invalid.
 */
export function getExtensionSettings(): ExtensionSettings {
  const config = vscode.workspace.getConfiguration('md-tech-pdf');

  return parseExtensionSettings({
    plantuml: {
      javaPath: config.get<string>('plantuml.javaPath'),
      jarPath: config.get<string>('plantuml.jarPath'),
    },
    export: {
      outputDirectory: config.get<string>('export.outputDirectory'),
      afterExport: config.get<string>('export.afterExport'),
    },
  });
}
