import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { DEFAULT_PDF_OPTIONS } from './default-options.js';
import { PdfGenerateError } from './error.js';
import type { PdfGeneratorInterface, PdfOptions } from './types.js';

/**
 * Generates PDF documents from HTML strings using Playwright Chromium.
 */
export class PdfGenerator implements PdfGeneratorInterface {
  /**
   * Generates a PDF file from an HTML string.
   *
   * @param html HTML string to render
   * @param outputPath Path where the generated PDF will be saved
   * @param options PDF rendering options
   * @throws {PdfGenerateError} When validation fails or PDF generation fails
   */
  async generate(html: string, outputPath: string, options?: PdfOptions): Promise<void> {
    if (!html || html.trim() === '') {
      throw new PdfGenerateError('HTML content must not be empty.');
    }

    if (!outputPath || outputPath.trim() === '') {
      throw new PdfGenerateError('Output path must not be empty.');
    }

    const resolvedOutputPath = path.resolve(outputPath);
    const outputDir = path.dirname(resolvedOutputPath);

    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (err) {
      throw new PdfGenerateError(`Failed to create output directory: ${outputDir}`, {
        cause: err,
      });
    }

    const mergedOptions = {
      format: options?.format ?? DEFAULT_PDF_OPTIONS.format,
      landscape: options?.landscape ?? DEFAULT_PDF_OPTIONS.landscape,
      printBackground: options?.printBackground ?? DEFAULT_PDF_OPTIONS.printBackground,
      margin: {
        top: options?.margin?.top ?? DEFAULT_PDF_OPTIONS.margin.top,
        right: options?.margin?.right ?? DEFAULT_PDF_OPTIONS.margin.right,
        bottom: options?.margin?.bottom ?? DEFAULT_PDF_OPTIONS.margin.bottom,
        left: options?.margin?.left ?? DEFAULT_PDF_OPTIONS.margin.left,
      },
    };

    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
      });
    } catch (err) {
      throw new PdfGenerateError('Failed to launch Chromium browser.', { cause: err });
    }

    try {
      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'load',
      });

      await page.pdf({
        path: resolvedOutputPath,
        format: mergedOptions.format,
        landscape: mergedOptions.landscape,
        printBackground: mergedOptions.printBackground,
        margin: mergedOptions.margin,
      });
    } catch (err) {
      throw new PdfGenerateError(`Failed to generate PDF at ${resolvedOutputPath}`, {
        cause: err,
      });
    } finally {
      await browser.close().catch(() => {
        // Suppress errors during cleanup
      });
    }
  }
}
