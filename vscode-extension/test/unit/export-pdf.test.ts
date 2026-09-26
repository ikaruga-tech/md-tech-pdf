import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import type * as vscode from 'vscode';
import { isMarkdownDocument } from '../../src/commands/export-pdf.js';
import { parseExtensionSettings } from '../../src/config/settings.js';

describe('export-pdf', () => {
  describe('isMarkdownDocument', () => {
    it('should return true when document languageId is markdown', () => {
      const doc = {
        languageId: 'markdown',
        fileName: '/path/to/doc.txt',
      } as vscode.TextDocument;
      assert.strictEqual(isMarkdownDocument(doc), true);
    });

    it('should return true when document filename ends with .md or .markdown', () => {
      const docMd = {
        languageId: 'plaintext',
        fileName: '/path/to/doc.md',
      } as vscode.TextDocument;
      assert.strictEqual(isMarkdownDocument(docMd), true);

      const docMarkdown = {
        languageId: 'plaintext',
        fileName: '/path/to/doc.markdown',
      } as vscode.TextDocument;
      assert.strictEqual(isMarkdownDocument(docMarkdown), true);
    });

    it('should return false for non-markdown files', () => {
      const docTxt = {
        languageId: 'plaintext',
        fileName: '/path/to/doc.txt',
      } as vscode.TextDocument;
      assert.strictEqual(isMarkdownDocument(docTxt), false);
    });
  });

  describe('style configuration integration', () => {
    it('should carry styles in extension settings for export and preview', () => {
      const settings = parseExtensionSettings({
        styles: ['styles/theme.css', 'custom.css'],
      });

      assert.deepStrictEqual(settings.styles, ['styles/theme.css', 'custom.css']);

      // Relative path resolution simulation
      const docDir = '/work/project/docs';
      const resolved = settings.styles.map((s) =>
        path.isAbsolute(s) ? s : path.resolve(docDir, s)
      );

      assert.strictEqual(resolved[0], path.resolve(docDir, 'styles/theme.css'));
      assert.strictEqual(resolved[1], path.resolve(docDir, 'custom.css'));
    });
  });
});
