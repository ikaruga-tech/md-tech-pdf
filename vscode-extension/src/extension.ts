import * as path from 'node:path';
import * as vscode from 'vscode';
import { createDownloadPlantUmlJarCommand } from './commands/download-plantuml.js';
import { createExportPdfAsCommand, createExportPdfCommand } from './commands/export-pdf.js';
import { DOWNLOAD_PLANTUML_JAR_COMMAND, RUN_DOCTOR_COMMAND } from './commands/guidance-actions.js';
import { createOpenPreviewCommand } from './commands/open-preview.js';
import { createRunDoctorCommand } from './commands/run-doctor.js';
import { getExtensionSettings } from './config/extension-settings.js';
import { PersistentDiagramCache, PreviewManager } from './preview/preview-manager.js';

export function activate(context: vscode.ExtensionContext): void {
  const globalStorageDir = context.globalStorageUri.fsPath;
  const storageDir = path.join(globalStorageDir, 'diagram-cache');
  const settings = getExtensionSettings();
  const diagramCache = new PersistentDiagramCache({
    storageDir,
    enabled: settings.preview.cache.persistent,
  });

  const previewManager = new PreviewManager(
    undefined,
    context.extensionUri,
    diagramCache,
    globalStorageDir
  );
  context.subscriptions.push(previewManager);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'md-tech-pdf.exportPdf',
      createExportPdfCommand(globalStorageDir)
    ),
    vscode.commands.registerCommand(
      'md-tech-pdf.exportPdfAs',
      createExportPdfAsCommand(globalStorageDir)
    ),
    vscode.commands.registerCommand(
      'md-tech-pdf.openPreview',
      createOpenPreviewCommand(previewManager)
    ),
    vscode.commands.registerCommand('md-tech-pdf.clearDiagramCache', async () => {
      await previewManager.clearCache();
      void vscode.window.showInformationMessage('md-tech-pdf: Diagram cache cleared.');
    }),
    vscode.commands.registerCommand(
      DOWNLOAD_PLANTUML_JAR_COMMAND,
      createDownloadPlantUmlJarCommand(globalStorageDir, () => previewManager.refreshAll())
    ),
    vscode.commands.registerCommand(RUN_DOCTOR_COMMAND, createRunDoctorCommand(globalStorageDir)),
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
