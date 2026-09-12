import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('md-tech-pdf.exportPdf', async () => {
    await vscode.window.showInformationMessage('md-tech-pdf: Export to PDF command is ready.');
  });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  // Clean-up logic when extension is deactivated
}
