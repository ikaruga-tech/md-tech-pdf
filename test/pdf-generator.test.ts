import fs from 'node:fs/promises';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { PdfGenerateError } from '../src/pdf/error.js';
import { PdfGenerator } from '../src/pdf/pdf-generator.js';

describe('PdfGenerator', () => {
  const generator = new PdfGenerator();
  const testOutputDir = path.resolve(process.cwd(), 'test-output-pdf');

  afterAll(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore errors in cleanup
    }
  });

  it('1, 2, 3, 4. should generate a valid PDF file with non-zero size and correct PDF header', async () => {
    const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>Test</title></head>
<body><h1>Hello PDF</h1><p>This is a test document.</p></body>
</html>`;
    const outputPath = path.join(testOutputDir, 'basic-test.pdf');

    await generator.generate(html, outputPath);

    // Verify existence
    const stats = await fs.stat(outputPath);
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(0);

    // Verify PDF header magic bytes "%PDF-"
    const fileHandle = await fs.open(outputPath, 'r');
    try {
      const buffer = Buffer.alloc(5);
      await fileHandle.read(buffer, 0, 5, 0);
      expect(buffer.toString('utf-8')).toBe('%PDF-');
    } finally {
      await fileHandle.close();
    }
  });

  it('5. should generate PDF from HTML containing Japanese characters', async () => {
    const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>日本語テスト</title></head>
<body>
  <h1>日本語ドキュメント見出し</h1>
  <p>こんにちは、世界。技術文書向けPDF生成の検証です。</p>
  <ul>
    <li>項目一</li>
    <li>項目二</li>
  </ul>
</body>
</html>`;
    const outputPath = path.join(testOutputDir, 'japanese-test.pdf');

    await generator.generate(html, outputPath);

    const stats = await fs.stat(outputPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('6. should generate PDF from HTML containing inline SVG diagram', async () => {
    const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>SVGテスト</title></head>
<body>
  <h1>SVGダイアグラム検証</h1>
  <div class="md-tech-diagram" style="width: 100mm; height: 50mm;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100%" height="100%">
      <rect width="100" height="50" fill="#4a90e2" rx="5" />
      <text x="50" y="28" font-size="12" fill="#ffffff" text-anchor="middle">SVG In PDF</text>
    </svg>
  </div>
</body>
</html>`;
    const outputPath = path.join(testOutputDir, 'svg-test.pdf');

    await generator.generate(html, outputPath);

    const stats = await fs.stat(outputPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('7. should throw PdfGenerateError on invalid input (empty or whitespace HTML)', async () => {
    const outputPath = path.join(testOutputDir, 'empty.pdf');

    await expect(generator.generate('', outputPath)).rejects.toThrow(PdfGenerateError);
    await expect(generator.generate('   \n  \t  ', outputPath)).rejects.toThrow(PdfGenerateError);
    await expect(generator.generate('<h1>Test</h1>', '')).rejects.toThrow(PdfGenerateError);
  });

  it('8. should automatically create output directory if it does not exist', async () => {
    const deepOutputDir = path.join(testOutputDir, 'nested', 'deep', 'folder');
    const outputPath = path.join(deepOutputDir, 'deep-test.pdf');
    const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body><p>Deep directory test</p></body>
</html>`;

    await generator.generate(html, outputPath);

    const stats = await fs.stat(outputPath);
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should accept custom margin and orientation options', async () => {
    const outputPath = path.join(testOutputDir, 'custom-options.pdf');
    const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body><p>Custom landscape test</p></body>
</html>`;

    await generator.generate(html, outputPath, {
      landscape: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
      printBackground: false,
    });

    const stats = await fs.stat(outputPath);
    expect(stats.size).toBeGreaterThan(0);
  });
});
