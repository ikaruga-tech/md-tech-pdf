import * as vscode from 'vscode';
import type { PreviewManager } from '../preview/preview-manager.js';
import { isMarkdownPath } from '../utils/path-utils.js';

/**
 * Checks if the text document is a Markdown file.
 */
export function isMarkdownDocument(document: vscode.TextDocument): boolean {
  if (document.languageId === 'markdown') {
    return true;
  }
  return isMarkdownPath(document.fileName);
}

/**
 * Resolves the target Markdown URI for preview.
 * Prioritizes the provided resource URI (e.g. from Explorer context menu)
 * and falls back to activeTextEditor.
 */
export async function resolvePreviewTargetUri(
  resource?: vscode.Uri
): Promise<vscode.Uri | undefined> {
  if (resource) {
    if (resource.scheme !== 'file') {
      await vscode.window.showWarningMessage(
        'md-tech-pdf: Only local Markdown files are supported.'
      );
      return undefined;
    }

    if (!isMarkdownPath(resource.fsPath)) {
      await vscode.window.showWarningMessage(
        'md-tech-pdf: The selected file is not a Markdown document.'
      );
      return undefined;
    }

    return resource;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor || !isMarkdownDocument(editor.document)) {
    await vscode.window.showWarningMessage('md-tech-pdf: Open a Markdown file before previewing.');
    return undefined;
  }

  return editor.document.uri;
}

/**
 * Creates the command handler for "md-tech-pdf.openPreview".
 */
export function createOpenPreviewCommand(previewManager: PreviewManager) {
  return async function openPreviewCommand(resource?: vscode.Uri): Promise<void> {
    const targetUri = await resolvePreviewTargetUri(resource);
    if (!targetUri) {
      return;
    }

    try {
      await previewManager.openPreview(targetUri, vscode.ViewColumn.Beside);
    } catch (err: unknown) {
      console.error('[md-tech-pdf] Failed to open preview', err);
      const msg = err instanceof Error ? err.message : String(err);
      await vscode.window.showErrorMessage(`md-tech-pdf Preview: ${msg}`);
    }
  };
}
