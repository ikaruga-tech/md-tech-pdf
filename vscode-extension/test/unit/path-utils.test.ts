import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import {
  createPdfOutputPath,
  ensurePdfExtension,
  isMarkdownPath,
} from '../../src/utils/path-utils.js';

describe('path-utils', () => {
  describe('createPdfOutputPath', () => {
    it('should derive .pdf path from .md file in the same directory', () => {
      const input = path.join('/document', 'sample.md');
      const expected = path.join('/document', 'sample.pdf');
      assert.strictEqual(createPdfOutputPath(input), expected);
    });

    it('should derive .pdf path from .markdown file in the same directory', () => {
      const input = path.join('/document', 'sample.markdown');
      const expected = path.join('/document', 'sample.pdf');
      assert.strictEqual(createPdfOutputPath(input), expected);
    });

    it('should preserve base name when replacing extension', () => {
      const input = path.join('workspace', 'deep', 'nested', 'guide.tech.md');
      const expected = path.join('workspace', 'deep', 'nested', 'guide.tech.pdf');
      assert.strictEqual(createPdfOutputPath(input), expected);
    });
  });

  describe('ensurePdfExtension', () => {
    it('should append .pdf if file has no extension', () => {
      assert.strictEqual(ensurePdfExtension('output'), 'output.pdf');
    });

    it('should keep existing lowercase .pdf extension without duplicating', () => {
      assert.strictEqual(ensurePdfExtension('output.pdf'), 'output.pdf');
    });

    it('should preserve uppercase PDF extension', () => {
      assert.strictEqual(ensurePdfExtension('output.PDF'), 'output.PDF');
    });

    it('should append .pdf if path has a non-pdf extension', () => {
      assert.strictEqual(ensurePdfExtension('report.txt'), 'report.txt.pdf');
    });
  });

  describe('isMarkdownPath', () => {
    it('should return true for .md files', () => {
      assert.strictEqual(isMarkdownPath('sample.md'), true);
      assert.strictEqual(isMarkdownPath('/path/to/sample.md'), true);
    });

    it('should return true for .markdown files', () => {
      assert.strictEqual(isMarkdownPath('sample.markdown'), true);
    });

    it('should return true for uppercase .MD or .MARKDOWN files', () => {
      assert.strictEqual(isMarkdownPath('README.MD'), true);
      assert.strictEqual(isMarkdownPath('DOCS.MARKDOWN'), true);
    });

    it('should return false for non-markdown extensions', () => {
      assert.strictEqual(isMarkdownPath('sample.ts'), false);
      assert.strictEqual(isMarkdownPath('sample.pdf'), false);
      assert.strictEqual(isMarkdownPath('sample.html'), false);
      assert.strictEqual(isMarkdownPath('sample.json'), false);
    });

    it('should return false for files without extension', () => {
      assert.strictEqual(isMarkdownPath('sample'), false);
    });
  });
});
