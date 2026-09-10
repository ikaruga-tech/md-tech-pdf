export interface DiagramRenderErrorOptions {
  cause?: unknown;
}

/**
 * Error thrown when rendering a diagram fails.
 */
export class DiagramRenderError extends Error {
  constructor(message: string, options?: DiagramRenderErrorOptions) {
    super(message, options);
    this.name = 'DiagramRenderError';
  }
}
