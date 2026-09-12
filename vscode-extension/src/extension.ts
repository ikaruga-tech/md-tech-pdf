import * as vscode from 'vscode';
import { exportPdfCommand } from './commands/export-pdf.js';

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('md-tech-pdf.exportPdf', exportPdfCommand);

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  // Clean-up logic when extension is deactivated
}
