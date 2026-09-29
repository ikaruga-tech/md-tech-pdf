/**
 * Machine-readable classification of PDF generation failures.
 */
export type PdfGenerateErrorCode = 'BROWSER_NOT_FOUND' | 'GENERATION_FAILED';

/**
 * Thrown when an error occurs during PDF generation.
 */
export class PdfGenerateError extends Error {
  readonly code: PdfGenerateErrorCode;

  constructor(message: string, options?: { cause?: unknown; code?: PdfGenerateErrorCode }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'PdfGenerateError';
    this.code = options?.code ?? 'GENERATION_FAILED';
  }
}
