import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => {
  const window = {
    activeTextEditor: undefined as unknown,
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showSaveDialog: vi.fn(),
    withProgress: vi.fn(),
  };
  const workspace = {
    textDocuments: [] as unknown[],
  };
  const commands = {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  };
  const Uri = {
    file: (fsPath: string) => ({
      scheme: 'file',
      fsPath,
    }),
  };
  return {
    window,
    workspace,
    commands,
    Uri,
    ProgressLocation: {
      Notification: 15,
    },
  };
});

import {
  createPdfOutputPath,
  ensurePdfExtension,
  getErrorMessage,
  isMarkdownDocument,
  isMarkdownPath,
  prepareActiveMarkdownDocument,
  resolveTargetInputPath,
  showExportSuccess,
} from '../vscode-extension/src/commands/export-pdf.js';

describe('VS Code Extension export-pdf helper functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = undefined;
    (vscode.workspace as { textDocuments: unknown[] }).textDocuments = [];
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error instance', () => {
      expect(getErrorMessage(new Error('Syntax error'))).toBe('Syntax error');
    });

    it('should return string directly when error is a string', () => {
      expect(getErrorMessage('Custom error string')).toBe('Custom error string');
    });

    it('should convert number, null, and other types to string', () => {
      expect(getErrorMessage(500)).toBe('500');
      expect(getErrorMessage(null)).toBe('null');
      expect(getErrorMessage(undefined)).toBe('undefined');
    });
  });

  describe('ensurePdfExtension', () => {
    it('should append .pdf when path has no extension', () => {
      expect(ensurePdfExtension('output')).toBe('output.pdf');
    });

    it('should preserve existing .pdf extension without duplicating', () => {
      expect(ensurePdfExtension('output.pdf')).toBe('output.pdf');
    });

    it('should preserve existing uppercase .PDF extension', () => {
      expect(ensurePdfExtension('output.PDF')).toBe('output.PDF');
    });

    it('should append .pdf when path has multiple dots', () => {
      expect(ensurePdfExtension('my.file')).toBe('my.file.pdf');
    });

    it('should handle nested directory paths with and without extension', () => {
      expect(ensurePdfExtension('/path/to/my-document')).toBe('/path/to/my-document.pdf');
      expect(ensurePdfExtension('/path/to/my-document.pdf')).toBe('/path/to/my-document.pdf');
    });
  });

  describe('createPdfOutputPath', () => {
    it('should convert document.md to document.pdf in the same directory', () => {
      expect(createPdfOutputPath('document.md')).toBe('document.pdf');
    });

    it('should convert document.markdown to document.pdf in the same directory', () => {
      expect(createPdfOutputPath('document.markdown')).toBe('document.pdf');
    });

    it('should convert /path/to/design.md to /path/to/design.pdf', () => {
      expect(createPdfOutputPath('/path/to/design.md')).toBe('/path/to/design.pdf');
    });

    it('should convert relative nested path docs/architecture.md to docs/architecture.pdf', () => {
      expect(createPdfOutputPath('docs/architecture.md')).toBe('docs/architecture.pdf');
    });
  });

  describe('isMarkdownPath', () => {
    it('should return true for .md extension', () => {
      expect(isMarkdownPath('document.md')).toBe(true);
      expect(isMarkdownPath('/path/to/file.md')).toBe(true);
    });

    it('should return true for .markdown extension', () => {
      expect(isMarkdownPath('notes.markdown')).toBe(true);
      expect(isMarkdownPath('/path/to/notes.markdown')).toBe(true);
    });

    it('should return true regardless of uppercase letters', () => {
      expect(isMarkdownPath('README.MD')).toBe(true);
      expect(isMarkdownPath('DOC.MARKDOWN')).toBe(true);
    });

    it('should return false for non-markdown extensions', () => {
      expect(isMarkdownPath('index.ts')).toBe(false);
      expect(isMarkdownPath('package.json')).toBe(false);
      expect(isMarkdownPath('output.pdf')).toBe(false);
      expect(isMarkdownPath('notes.txt')).toBe(false);
    });

    it('should return false for paths without extension', () => {
      expect(isMarkdownPath('Makefile')).toBe(false);
      expect(isMarkdownPath('/path/to/LICENSE')).toBe(false);
    });
  });

  describe('isMarkdownDocument', () => {
    it('should return true when languageId is markdown', () => {
      const doc = {
        languageId: 'markdown',
        fileName: 'untitled-1',
      } as unknown as Parameters<typeof isMarkdownDocument>[0];
      expect(isMarkdownDocument(doc)).toBe(true);
    });

    it('should return true when fileName ends with .md regardless of languageId', () => {
      const doc = {
        languageId: 'plaintext',
        fileName: '/path/to/notes.md',
      } as unknown as Parameters<typeof isMarkdownDocument>[0];
      expect(isMarkdownDocument(doc)).toBe(true);
    });

    it('should return true when fileName ends with .markdown', () => {
      const doc = {
        languageId: 'plaintext',
        fileName: '/path/to/notes.markdown',
      } as unknown as Parameters<typeof isMarkdownDocument>[0];
      expect(isMarkdownDocument(doc)).toBe(true);
    });

    it('should return false for non-markdown files such as .ts', () => {
      const doc = {
        languageId: 'typescript',
        fileName: '/path/to/index.ts',
      } as unknown as Parameters<typeof isMarkdownDocument>[0];
      expect(isMarkdownDocument(doc)).toBe(false);
    });
  });

  describe('prepareActiveMarkdownDocument', () => {
    it('should warn with unified guidance when active editor is missing', async () => {
      (vscode.window as { activeTextEditor: unknown }).activeTextEditor = undefined;

      const doc = await prepareActiveMarkdownDocument();
      expect(doc).toBeUndefined();
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'md-tech-pdf: Open a Markdown file before exporting.'
      );
    });

    it('should warn with unified guidance when active file is not markdown', async () => {
      const nonMdDoc = {
        languageId: 'typescript',
        fileName: '/workspace/index.ts',
        isUntitled: false,
        isDirty: false,
        uri: { scheme: 'file', fsPath: '/workspace/index.ts' },
      };
      (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
        document: nonMdDoc,
      };

      const doc = await prepareActiveMarkdownDocument();
      expect(doc).toBeUndefined();
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'md-tech-pdf: Open a Markdown file before exporting.'
      );
    });

    it('should error when saving dirty document fails', async () => {
      const saveMock = vi.fn().mockResolvedValue(false);
      const dirtyDoc = {
        languageId: 'markdown',
        fileName: '/workspace/doc.md',
        isUntitled: false,
        isDirty: true,
        save: saveMock,
        uri: { scheme: 'file', fsPath: '/workspace/doc.md' },
      };
      (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
        document: dirtyDoc,
      };

      const doc = await prepareActiveMarkdownDocument();
      expect(doc).toBeUndefined();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'md-tech-pdf: Could not save the Markdown file.'
      );
    });
  });

  describe('showExportSuccess', () => {
    it('should show success notification with Open PDF and Reveal in Finder actions', async () => {
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue(undefined);

      await showExportSuccess('/path/to/document.pdf');

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'md-tech-pdf: Exported document.pdf',
        'Open PDF',
        'Reveal in Finder'
      );
    });

    it('should execute vscode.open command when user selects Open PDF', async () => {
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue(
        'Open PDF' as unknown as undefined
      );

      await showExportSuccess('/path/to/document.pdf');

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'vscode.open',
        expect.objectContaining({ scheme: 'file', fsPath: '/path/to/document.pdf' })
      );
    });

    it('should warn when Open PDF command execution throws an error', async () => {
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue(
        'Open PDF' as unknown as undefined
      );
      vi.mocked(vscode.commands.executeCommand).mockRejectedValueOnce(
        new Error('Cannot open file')
      );

      await showExportSuccess('/path/to/document.pdf');

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'md-tech-pdf: PDF was exported, but it could not be opened.'
      );
    });

    it('should execute revealFileInOS command when user selects Reveal in Finder', async () => {
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue(
        'Reveal in Finder' as unknown as undefined
      );

      await showExportSuccess('/path/to/document.pdf');

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'revealFileInOS',
        expect.objectContaining({ scheme: 'file', fsPath: '/path/to/document.pdf' })
      );
    });

    it('should warn when revealFileInOS command execution throws an error', async () => {
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue(
        'Reveal in Finder' as unknown as undefined
      );
      vi.mocked(vscode.commands.executeCommand).mockRejectedValueOnce(
        new Error('Cannot reveal file')
      );

      await showExportSuccess('/path/to/document.pdf');

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'md-tech-pdf: PDF was exported, but it could not be revealed.'
      );
    });
  });

  describe('resolveTargetInputPath', () => {
    it('should prioritize resource URI over active text editor', async () => {
      // Setup active editor with A.md
      const activeDoc = {
        languageId: 'markdown',
        fileName: '/workspace/A.md',
        isUntitled: false,
        isDirty: false,
        uri: { scheme: 'file', fsPath: '/workspace/A.md' },
      };
      (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
        document: activeDoc,
      };

      // Pass resource pointing to B.md
      const resourceUri = vscode.Uri.file('/workspace/B.md');
      const resolved = await resolveTargetInputPath(
        resourceUri as unknown as Parameters<typeof resolveTargetInputPath>[0]
      );

      expect(resolved).toBe('/workspace/B.md');
    });

    it('should warn and return undefined when resource scheme is not file', async () => {
      const nonFileUri = {
        scheme: 'untitled',
        fsPath: 'untitled:Untitled-1',
      };
      const resolved = await resolveTargetInputPath(
        nonFileUri as unknown as Parameters<typeof resolveTargetInputPath>[0]
      );

      expect(resolved).toBeUndefined();
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'md-tech-pdf: Only local Markdown files are supported.'
      );
    });

    it('should warn and return undefined when resource is not a markdown file', async () => {
      const resourceUri = vscode.Uri.file('/workspace/index.ts');
      const resolved = await resolveTargetInputPath(
        resourceUri as unknown as Parameters<typeof resolveTargetInputPath>[0]
      );

      expect(resolved).toBeUndefined();
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'md-tech-pdf: The selected file is not a Markdown document.'
      );
    });

    it('should automatically save matching open document if dirty', async () => {
      const saveMock = vi.fn().mockResolvedValue(true);
      const openDoc = {
        languageId: 'markdown',
        fileName: '/workspace/doc.md',
        isUntitled: false,
        isDirty: true,
        save: saveMock,
        uri: { scheme: 'file', fsPath: '/workspace/doc.md' },
      };
      (vscode.workspace as { textDocuments: unknown[] }).textDocuments = [openDoc];

      const resourceUri = vscode.Uri.file('/workspace/doc.md');
      const resolved = await resolveTargetInputPath(
        resourceUri as unknown as Parameters<typeof resolveTargetInputPath>[0]
      );

      expect(saveMock).toHaveBeenCalled();
      expect(resolved).toBe('/workspace/doc.md');
    });

    it('should return undefined and error if saving dirty matching document fails', async () => {
      const saveMock = vi.fn().mockResolvedValue(false);
      const openDoc = {
        languageId: 'markdown',
        fileName: '/workspace/doc.md',
        isUntitled: false,
        isDirty: true,
        save: saveMock,
        uri: { scheme: 'file', fsPath: '/workspace/doc.md' },
      };
      (vscode.workspace as { textDocuments: unknown[] }).textDocuments = [openDoc];

      const resourceUri = vscode.Uri.file('/workspace/doc.md');
      const resolved = await resolveTargetInputPath(
        resourceUri as unknown as Parameters<typeof resolveTargetInputPath>[0]
      );

      expect(saveMock).toHaveBeenCalled();
      expect(resolved).toBeUndefined();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'md-tech-pdf: Could not save the Markdown file.'
      );
    });

    it('should fallback to active editor when resource is not provided', async () => {
      const activeDoc = {
        languageId: 'markdown',
        fileName: '/workspace/active.md',
        isUntitled: false,
        isDirty: false,
        uri: { scheme: 'file', fsPath: '/workspace/active.md' },
      };
      (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
        document: activeDoc,
      };

      const resolved = await resolveTargetInputPath(undefined);
      expect(resolved).toBe('/workspace/active.md');
    });

    it('should return undefined and inform user when resource is undefined and no active editor exists', async () => {
      (vscode.window as { activeTextEditor: unknown }).activeTextEditor = undefined;

      const resolved = await resolveTargetInputPath(undefined);
      expect(resolved).toBeUndefined();
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'md-tech-pdf: Open a Markdown file before exporting.'
      );
    });
  });
});
