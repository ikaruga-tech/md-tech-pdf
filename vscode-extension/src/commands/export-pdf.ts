import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  type ExtensionSettings,
  getExtensionSettings,
  resolveCustomOutputPath,
} from '../config/extension-settings.js';
import { getErrorMessage } from '../utils/error-utils.js';
import { createPdfOutputPath, ensurePdfExtension, isMarkdownPath } from '../utils/path-utils.js';

export {
  createPdfOutputPath,
  ensurePdfExtension,
  isMarkdownPath,
  getErrorMessage,
  resolveCustomOutputPath,
};

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
 * Displays export success notification with interactive actions:
 * "Open PDF" and "Reveal in Finder".
 */
export async function showExportSuccess(outputPath: string): Promise<void> {
  const fileName = path.basename(outputPath);
  const action = await vscode.window.showInformationMessage(
    `md-tech-pdf: Exported ${fileName}`,
    'Open PDF',
    'Reveal in Finder'
  );

  if (action === 'Open PDF') {
    try {
      await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(outputPath));
    } catch (err: unknown) {
      console.error('[md-tech-pdf] Failed to open PDF', err);
      await vscode.window.showWarningMessage(
        'md-tech-pdf: PDF was exported, but it could not be opened.'
      );
    }
  } else if (action === 'Reveal in Finder') {
    try {
      await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
    } catch (err: unknown) {
      console.error('[md-tech-pdf] Failed to reveal PDF in OS', err);
      await vscode.window.showWarningMessage(
        'md-tech-pdf: PDF was exported, but it could not be revealed.'
      );
    }
  }
}

/**
 * Prepares the currently active Markdown document for export.
 * Validates editor presence, markdown language, and saves untitled / dirty documents.
 */
export async function prepareActiveMarkdownDocument(): Promise<vscode.TextDocument | undefined> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    await vscode.window.showWarningMessage('md-tech-pdf: Open a Markdown file before exporting.');
    return undefined;
  }

  const document = editor.document;
  if (!isMarkdownDocument(document)) {
    await vscode.window.showWarningMessage('md-tech-pdf: Open a Markdown file before exporting.');
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
      await vscode.window.showErrorMessage('md-tech-pdf: Could not save the Markdown file.');
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

    // If the resource is currently open in an editor with unsaved changes, save it first
    const openDoc = vscode.workspace.textDocuments.find(
      (doc) => doc.uri.fsPath === resource.fsPath
    );
    if (openDoc && openDoc.isDirty) {
      const saved = await openDoc.save();
      if (!saved) {
        await vscode.window.showErrorMessage('md-tech-pdf: Could not save the Markdown file.');
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
export async function executePdfExport(
  inputPath: string,
  outputPath: string,
  settings?: ExtensionSettings
): Promise<void> {
  const extSettings = settings ?? getExtensionSettings();

  try {
    const { convertMarkdownToPdf } = await import('md-tech-pdf');

    const docDir = path.dirname(inputPath);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(inputPath));
    const resolvedStyles = extSettings.styles.map((s) => {
      if (path.isAbsolute(s)) {
        return s;
      }
      if (workspaceFolder) {
        return path.resolve(workspaceFolder.uri.fsPath, s);
      }
      return path.resolve(docDir, s);
    });

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
          config: {
            plantuml: extSettings.plantuml,
            style: {
              css: resolvedStyles.length > 0 ? resolvedStyles : undefined,
            },
          },
        });
      }
    );

    // Automatically perform post-export action if configured
    if (extSettings.export.afterExport === 'open') {
      try {
        await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(outputPath));
      } catch (err: unknown) {
        console.error('[md-tech-pdf] Failed to open PDF automatically', err);
      }
    } else if (extSettings.export.afterExport === 'reveal') {
      try {
        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
      } catch (err: unknown) {
        console.error('[md-tech-pdf] Failed to reveal PDF in OS automatically', err);
      }
    }

    await showExportSuccess(outputPath);
  } catch (error: unknown) {
    console.error('[md-tech-pdf] PDF export failed', error);
    await vscode.window.showErrorMessage(`md-tech-pdf: ${getErrorMessage(error)}`);
  }
}

/**
 * Command handler for "md-tech-pdf: Export to PDF".
 * Exports specified Markdown file (from Explorer context menu) or currently active file
 * to a vector PDF in the configured directory or same directory.
 */
export async function exportPdfCommand(resource?: vscode.Uri): Promise<void> {
  const settings = getExtensionSettings();
  const inputPath = await resolveTargetInputPath(resource);
  if (!inputPath) {
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(inputPath))?.uri
    .fsPath;
  const outputPath = resolveCustomOutputPath(
    inputPath,
    settings.export.outputDirectory,
    workspaceFolder
  );

  await executePdfExport(inputPath, outputPath, settings);
}

/**
 * Command handler for "md-tech-pdf: Export to PDF As...".
 * Prompts user with a standard Save Dialog to choose destination path and filename.
 */
export async function exportPdfAsCommand(): Promise<void> {
  const settings = getExtensionSettings();
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
  await executePdfExport(inputPath, outputPath, settings);
}
