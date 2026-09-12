import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    withProgress: vi.fn(),
  },
  commands: {
    registerCommand: vi.fn(),
  },
  ProgressLocation: {
    Notification: 15,
  },
}));

import {
  createPdfOutputPath,
  ensurePdfExtension,
  isMarkdownDocument,
} from '../vscode-extension/src/commands/export-pdf.js';

describe('VS Code Extension export-pdf helper functions', () => {
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
});
