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
    browser: {
      executablePath: config.get<string>('browser.executablePath'),
    },
    plantuml: {
      javaPath: config.get<string>('plantuml.javaPath'),
      jarPath: config.get<string>('plantuml.jarPath'),
    },
    export: {
      outputDirectory: config.get<string>('export.outputDirectory'),
      afterExport: config.get<string>('export.afterExport'),
    },
    preview: {
      refresh: config.get<string>('preview.refresh'),
      debounceDelay: config.get<number>('preview.debounceDelay'),
      cache: {
        persistent: config.get<boolean>('preview.cache.persistent'),
      },
      scrollSync: {
        enabled: config.get<boolean>('preview.scrollSync.enabled'),
        behavior: config.get<string>('preview.scrollSync.behavior'),
        delay: config.get<number>('preview.scrollSync.delay'),
      },
      zoom: config.get<string>('preview.zoom'),
      defaultViewMode: config.get<string>('preview.defaultViewMode'),
    },
    styles: config.get<unknown>('styles'),
    default: {
      pdf: {
        format: config.get<string>('default.pdf.format'),
        landscape: config.get<boolean>('default.pdf.landscape'),
        margin: {
          top: config.get<string>('default.pdf.margin.top'),
          bottom: config.get<string>('default.pdf.margin.bottom'),
          left: config.get<string>('default.pdf.margin.left'),
          right: config.get<string>('default.pdf.margin.right'),
        },
      },
      diagram: {
        width: config.get<string>('default.diagram.width'),
        height: config.get<string>('default.diagram.height'),
        fit: config.get<string>('default.diagram.fit'),
        align: config.get<string>('default.diagram.align'),
      },
      style: {
        font: {
          family: config.get<string>('default.style.font.family'),
          codeFamily: config.get<string>('default.style.font.codeFamily'),
          google: {
            families: config.get<unknown>('default.style.font.google.families'),
          },
        },
      },
    },
  });
}
