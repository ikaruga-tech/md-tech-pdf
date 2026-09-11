export interface FrontMatterErrorOptions {
  path?: string;
  cause?: unknown;
}

/**
 * Thrown when YAML Front Matter has syntax errors or invalid configuration values.
 */
export class FrontMatterError extends Error {
  public readonly path?: string;

  constructor(message: string, options?: FrontMatterErrorOptions) {
    super(message, { cause: options?.cause });
    this.name = 'FrontMatterError';
    this.path = options?.path;
  }
}
