/**
 * md-tech-pdf Core Library
 * Core PDF generation engine decoupled from CLI and editor extensions.
 */

export * from './types/diagram.js';
export * from './parser/error.js';
export * from './parser/attributes-parser.js';
export * from './parser/markdown-parser.js';
export * from './renderer/diagram-renderer.js';
export * from './renderer/mermaid-renderer.js';
export * from './renderer/mermaid-executor.js';
export * from './renderer/plantuml-renderer.js';
export * from './renderer/plantuml-executor.js';
export * from './renderer/error.js';
export * from './html/default-style.js';
export * from './html/google-fonts.js';
export * from './html/html-builder.js';
export * from './html/html-renderer.js';
export * from './pdf/types.js';
export * from './pdf/default-options.js';
export * from './pdf/error.js';
export * from './pdf/pdf-generator.js';
export * from './config/document-options.js';
export * from './config/error.js';
export * from './config/frontmatter-parser.js';
export * from './config/config-resolver.js';
export * from './core/converter.js';

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
