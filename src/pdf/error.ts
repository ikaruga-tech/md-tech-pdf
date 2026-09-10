/**
 * Thrown when an error occurs during PDF generation.
 */
export class PdfGenerateError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PdfGenerateError';
  }
}
