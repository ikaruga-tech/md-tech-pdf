import * as vscode from 'vscode';
import { exportPdfCommand, exportPdfAsCommand } from './commands/export-pdf.js';
import { createOpenPreviewCommand } from './commands/open-preview.js';
import { PreviewManager } from './preview/preview-manager.js';

export function activate(context: vscode.ExtensionContext): void {
  const previewManager = new PreviewManager(undefined, context.extensionUri);
  context.subscriptions.push(previewManager);

  context.subscriptions.push(
    vscode.commands.registerCommand('md-tech-pdf.exportPdf', exportPdfCommand),
    vscode.commands.registerCommand('md-tech-pdf.exportPdfAs', exportPdfAsCommand),
    vscode.commands.registerCommand(
      'md-tech-pdf.openPreview',
      createOpenPreviewCommand(previewManager)
    )
  );
}

export function deactivate(): void {
  // Clean-up logic when extension is deactivated
}
