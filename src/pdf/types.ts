export interface PdfMargin {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface PdfOptions {
  format?: 'A4';
  landscape?: boolean;
  margin?: PdfMargin;
  printBackground?: boolean;
  /**
   * Absolute path to a Chromium-based browser (e.g. system Chrome / Edge).
   * When omitted, Playwright's bundled Chromium is used.
   */
  browserExecutablePath?: string;
}

export interface PdfGeneratorInterface {
  generate(html: string, outputPath: string, options?: PdfOptions): Promise<void>;
}
