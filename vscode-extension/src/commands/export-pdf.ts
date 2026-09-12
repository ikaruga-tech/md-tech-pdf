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
 * Checks if the text document is a Markdown file.
 */
export function isMarkdownDocument(document: vscode.TextDocument): boolean {
  if (document.languageId === 'markdown') {
    return true;
  }
  const ext = path.extname(document.fileName).toLowerCase();
  return ext === '.md' || ext === '.markdown';
}

/**
 * Command handler for "md-tech-pdf: Export to PDF".
 * Exports currently active Markdown file to a vector PDF in the same directory.
 */
export async function exportPdfCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    await vscode.window.showInformationMessage('md-tech-pdf: No active Markdown file.');
    return;
  }

  const document = editor.document;
  if (!isMarkdownDocument(document)) {
    await vscode.window.showWarningMessage(
      'md-tech-pdf: The active file is not a Markdown document.'
    );
    return;
  }

  // Handle untitled or unsaved files
  if (document.isUntitled) {
    const saved = await document.save();
    if (!saved || document.isUntitled) {
      return;
    }
  } else if (document.isDirty) {
    const saved = await document.save();
    if (!saved) {
      return;
    }
  }

  const inputPath = document.uri.fsPath;
  const outputPath = createPdfOutputPath(inputPath);

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
