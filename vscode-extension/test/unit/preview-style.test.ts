import * as assert from 'node:assert/strict';
import {
  buildPageDimensionStyle,
  getPreviewBaseStyle,
  getPreviewToolbarHtml,
  resolvePagePadding,
  resolvePaperDimensions,
} from '../../src/preview/preview-style.js';

describe('preview-style', () => {
  describe('resolvePaperDimensions', () => {
    it('should default to A4 portrait dimensions (210mm x 297mm)', () => {
      const dims = resolvePaperDimensions();
      assert.strictEqual(dims.width, '210mm');
      assert.strictEqual(dims.minHeight, '297mm');
    });

    it('should return landscape dimensions when landscape is true (297mm x 210mm)', () => {
      const dims = resolvePaperDimensions({ landscape: true });
      assert.strictEqual(dims.width, '297mm');
      assert.strictEqual(dims.minHeight, '210mm');
    });
  });

  describe('resolvePagePadding', () => {
    it('should fall back to 15mm for all sides when margin is undefined', () => {
      const padding = resolvePagePadding();
      assert.strictEqual(padding, '15mm 15mm 15mm 15mm');
    });

    it('should apply custom margins when provided in Front Matter', () => {
      const padding = resolvePagePadding({
        margin: {
          top: '20mm',
          right: '25mm',
          bottom: '10mm',
          left: '30mm',
        },
      });
      assert.strictEqual(padding, '20mm 25mm 10mm 30mm');
    });
  });

  describe('getPreviewBaseStyle', () => {
    it('should include preview canvas and paper page class selectors with narrow viewport and safe center support', () => {
      const style = getPreviewBaseStyle();
      assert.match(style, /\.md-tech-pdf-preview-canvas/);
      assert.match(style, /\.md-tech-pdf-preview-page/);
      assert.match(style, /var\(--vscode-editor-background/);
      assert.match(style, /box-shadow/);
      assert.match(style, /overflow-x:\s*auto;/);
      assert.match(style, /flex-shrink:\s*0;/);
      assert.match(style, /justify-content:\s*safe center;/);
    });
  });

  describe('buildPageDimensionStyle', () => {
    it('should generate page dimension rules matching A4 portrait with default margin', () => {
      const css = buildPageDimensionStyle();
      assert.match(css, /width:\s*210mm;/);
      assert.match(css, /min-height:\s*297mm;/);
      assert.match(css, /padding:\s*15mm 15mm 15mm 15mm;/);
    });

    it('should generate page dimension rules matching landscape with custom margins', () => {
      const css = buildPageDimensionStyle({
        landscape: true,
        margin: { top: '10mm', right: '15mm', bottom: '10mm', left: '15mm' },
      });
      assert.match(css, /width:\s*297mm;/);
      assert.match(css, /min-height:\s*210mm;/);
      assert.match(css, /padding:\s*10mm 15mm 10mm 15mm;/);
    });
  });

  describe('getPreviewToolbarHtml', () => {
    it('should return HTML containing toolbar buttons and accessible elements', () => {
      const html = getPreviewToolbarHtml();
      assert.match(html, /class="preview-toolbar"/);
      assert.match(html, /role="toolbar"/);
      assert.match(html, /id="btn-toolbar-reload"/);
      assert.match(html, /id="select-toolbar-zoom"/);
      assert.match(html, /id="btn-toolbar-export"/);
    });
  });

  describe('toolbar styles and print exclusion', () => {
    it('should include preview-toolbar CSS and exclude it under @media print', () => {
      const style = getPreviewBaseStyle();
      assert.match(style, /\.preview-toolbar\s*\{/);
      assert.match(style, /position:\s*sticky;/);
      assert.match(style, /@media\s+print\s*\{[\s\S]*\.preview-toolbar\s*\{\s*display:\s*none\s*!important;/);
    });
  });
});
