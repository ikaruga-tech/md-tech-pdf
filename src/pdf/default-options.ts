import type { PdfMargin, PdfOptions } from './types.js';

export interface DefaultPdfOptions extends Required<Omit<PdfOptions, 'margin'>> {
  margin: Required<PdfMargin>;
}

export const DEFAULT_PDF_OPTIONS: Readonly<DefaultPdfOptions> = {
  format: 'A4',
  landscape: false,
  margin: {
    top: '15mm',
    right: '15mm',
    bottom: '15mm',
    left: '15mm',
  },
  printBackground: true,
};
