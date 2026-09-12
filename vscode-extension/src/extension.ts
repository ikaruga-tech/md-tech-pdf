import * as vscode from 'vscode';
import { exportPdfCommand, exportPdfAsCommand } from './commands/export-pdf.js';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('md-tech-pdf.exportPdf', exportPdfCommand),
    vscode.commands.registerCommand('md-tech-pdf.exportPdfAs', exportPdfAsCommand)
  );
}

export function deactivate(): void {
  // Clean-up logic when extension is deactivated
}
