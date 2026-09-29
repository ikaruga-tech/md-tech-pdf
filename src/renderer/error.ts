/**
 * Machine-readable classification of diagram rendering failures.
 * Consumers (e.g. editor extensions) map these codes to localized guidance.
 */
export type DiagramRenderErrorCode =
  | 'BROWSER_NOT_FOUND'
  | 'PLANTUML_JAR_NOT_CONFIGURED'
  | 'PLANTUML_JAR_NOT_FOUND'
  | 'JAVA_NOT_FOUND'
  | 'RENDER_FAILED';

export interface DiagramRenderErrorOptions {
  cause?: unknown;
  code?: DiagramRenderErrorCode;
}

/**
 * Error thrown when rendering a diagram fails.
 */
export class DiagramRenderError extends Error {
  readonly code: DiagramRenderErrorCode;

  constructor(message: string, options?: DiagramRenderErrorOptions) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'DiagramRenderError';
    this.code = options?.code ?? 'RENDER_FAILED';
  }
}
