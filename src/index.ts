/**
 * md-tech-pdf Core Library
 * Core PDF generation engine decoupled from CLI and editor extensions.
 */

export * from './types/diagram.js';
export * from './parser/error.js';
export * from './parser/attributes-parser.js';
export * from './parser/markdown-parser.js';

export interface GeneratorOptions {
  inputPath?: string;
  outputPath?: string;
}

export interface GeneratorResult {
  success: boolean;
  message: string;
}

/**
 * Entry point for document generation in Core.
 * PDF generation logic and diagram processing will be implemented here.
 */
export async function generatePdf(_options: GeneratorOptions = {}): Promise<GeneratorResult> {
  return {
    success: true,
    message: 'Core generator initialized.',
  };
}
