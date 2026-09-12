import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 * Derives destination PDF file path from input Markdown file path in the same directory.
 * Works with .md, .markdown, or other extensions.
 */
export function createPdfOutputPath(inputPath: string): string {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.pdf`);
}

/**
 * Ensures the target file path has a .pdf extension (case-insensitive).
 * Prevents duplicate extensions like .pdf.pdf.
 */
export function ensurePdfExtension(filePath: string): string {
  if (filePath.toLowerCase().endsWith('.pdf')) {
    return filePath;
  }
  return `${filePath}.pdf`;
}

/**
 * Checks if a given file path has a Markdown file extension (.md, .markdown), case-insensitively.
 */
export function isMarkdownPath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.md' || ext === '.markdown';
}

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
 * Prepares the currently active Markdown document for export.
 * Validates editor presence, markdown language, and saves untitled / dirty documents.
 */
export async function prepareActiveMarkdownDocument(): Promise<vscode.TextDocument | undefined> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    await vscode.window.showInformationMessage('md-tech-pdf: No active Markdown file.');
    return undefined;
  }

  const document = editor.document;
  if (!isMarkdownDocument(document)) {
    await vscode.window.showWarningMessage(
      'md-tech-pdf: The active file is not a Markdown document.'
    );
    return undefined;
  }

  // Handle untitled or unsaved files
  if (document.isUntitled) {
    const saved = await document.save();
    if (!saved || document.isUntitled) {
      return undefined;
    }
  } else if (document.isDirty) {
    const saved = await document.save();
    if (!saved) {
      return undefined;
    }
  }

  return document;
}

/**
 * Resolves the Markdown file path to export.
 * If resource is provided (e.g. from Explorer context menu), it takes precedence over activeTextEditor.
 * Also saves dirty documents if matching document is currently opened.
 * Falls back to active Markdown document if resource is omitted (e.g. from Command Palette).
 */
export async function resolveTargetInputPath(resource?: vscode.Uri): Promise<string | undefined> {
  if (resource && resource.scheme === 'file') {
    if (!isMarkdownPath(resource.fsPath)) {
      await vscode.window.showWarningMessage(
        'md-tech-pdf: The selected file is not a Markdown document.'
      );
      return undefined;
    }

    // If the resource is currently open in an editor with unsaved changes, save it first
    const openDoc = vscode.workspace.textDocuments.find(
      (doc) => doc.uri.fsPath === resource.fsPath
    );
    if (openDoc && openDoc.isDirty) {
      const saved = await openDoc.save();
      if (!saved) {
        return undefined;
      }
    }

    return resource.fsPath;
  }

  // Fallback to active editor document
  const document = await prepareActiveMarkdownDocument();
  if (!document) {
    return undefined;
  }

  return document.uri.fsPath;
}

/**
 * Shared executor for PDF export with progress reporting and error handling.
 */
export async function executePdfExport(inputPath: string, outputPath: string): Promise<void> {
  try {
    const { convertMarkdownToPdf } = await import('md-tech-pdf');

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'md-tech-pdf: Exporting PDF...',
        cancellable: false,
      },
      async (progress) => {
        await convertMarkdownToPdf(inputPath, {
          output: outputPath,
          onProgress: (event) => {
            progress.report({ message: event.message });
          },
        });
      }
    );

    await vscode.window.showInformationMessage(
      `md-tech-pdf: Exported ${path.basename(outputPath)}`
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('md-tech-pdf export error:', error);
    await vscode.window.showErrorMessage(`md-tech-pdf: ${message}`);
  }
}

/**
 * Command handler for "md-tech-pdf: Export to PDF".
 * Exports specified Markdown file (from Explorer context menu) or currently active file
 * to a vector PDF in the same directory.
 */
export async function exportPdfCommand(resource?: vscode.Uri): Promise<void> {
  const inputPath = await resolveTargetInputPath(resource);
  if (!inputPath) {
    return;
  }

  const outputPath = createPdfOutputPath(inputPath);
  await executePdfExport(inputPath, outputPath);
}

/**
 * Command handler for "md-tech-pdf: Export to PDF As...".
 * Prompts user with a standard Save Dialog to choose destination path and filename.
 */
export async function exportPdfAsCommand(): Promise<void> {
  const document = await prepareActiveMarkdownDocument();
  if (!document) {
    return;
  }

  const inputPath = document.uri.fsPath;
  const defaultUri = vscode.Uri.file(createPdfOutputPath(inputPath));

  const targetUri = await vscode.window.showSaveDialog({
    defaultUri,
    filters: {
      PDF: ['pdf'],
    },
    saveLabel: 'Export PDF',
  });

  // Clean exit on cancel without any error notification
  if (!targetUri) {
    return;
  }

  const outputPath = ensurePdfExtension(targetUri.fsPath);
  await executePdfExport(inputPath, outputPath);
}
