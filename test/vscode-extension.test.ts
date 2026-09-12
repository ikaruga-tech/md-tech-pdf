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
  isMarkdownDocument,
} from '../vscode-extension/src/commands/export-pdf.js';

describe('VS Code Extension export-pdf helper functions', () => {
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
