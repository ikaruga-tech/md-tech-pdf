import * as path from 'node:path';
import * as vscode from 'vscode';
import { exportPdfCommand, exportPdfAsCommand } from './commands/export-pdf.js';
import { createOpenPreviewCommand } from './commands/open-preview.js';
import { getExtensionSettings } from './config/extension-settings.js';
import { PersistentDiagramCache, PreviewManager } from './preview/preview-manager.js';

export function activate(context: vscode.ExtensionContext): void {
  const storageDir = path.join(context.globalStorageUri.fsPath, 'diagram-cache');
  const settings = getExtensionSettings();
  const diagramCache = new PersistentDiagramCache({
    storageDir,
    enabled: settings.preview.cache.persistent,
  });

  const previewManager = new PreviewManager(undefined, context.extensionUri, diagramCache);
  context.subscriptions.push(previewManager);

  context.subscriptions.push(
    vscode.commands.registerCommand('md-tech-pdf.exportPdf', exportPdfCommand),
    vscode.commands.registerCommand('md-tech-pdf.exportPdfAs', exportPdfAsCommand),
    vscode.commands.registerCommand(
      'md-tech-pdf.openPreview',
      createOpenPreviewCommand(previewManager)
    ),
    vscode.commands.registerCommand('md-tech-pdf.clearDiagramCache', async () => {
      await previewManager.clearCache();
      void vscode.window.showInformationMessage('md-tech-pdf: Diagram cache cleared.');
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('md-tech-pdf.preview.cache.persistent')) {
        const updated = getExtensionSettings();
        diagramCache.setEnabled(updated.preview.cache.persistent);
      }
    })
  );
}

export function deactivate(): void {
  // Clean-up logic when extension is deactivated
}
