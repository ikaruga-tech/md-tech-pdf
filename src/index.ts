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
export * from './renderer/diagram-cache.js';
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

import {
  convertMarkdownToPdf,
  resolveOutputPath,
  type ConvertOptions,
  type ConvertResult,
  type ConvertProgressEvent,
  type ConvertProgressStep,
  type ConvertAppConfig,
} from './core/converter.js';

/**
 * Primary high-level API to convert Markdown technical documents to vector PDF.
 */
export {
  convertMarkdownToPdf,
  resolveOutputPath,
  type ConvertOptions,
  type ConvertResult,
  type ConvertProgressEvent,
  type ConvertProgressStep,
  type ConvertAppConfig,
};

export interface GeneratorOptions {
  inputPath?: string;
  outputPath?: string;
  config?: ConvertAppConfig;
}

export interface GeneratorResult {
  success: boolean;
  message: string;
  outputPath?: string;
  bytes?: number;
}

/**
 * Entry point for document generation in Core.
 * If inputPath is provided, delegates to convertMarkdownToPdf.
 */
export async function generatePdf(options: GeneratorOptions = {}): Promise<GeneratorResult> {
  if (options.inputPath) {
    const result = await convertMarkdownToPdf(options.inputPath, {
      output: options.outputPath,
      config: options.config,
    });
    return {
      success: true,
      message: `Generated PDF at ${result.outputPath}`,
      outputPath: result.outputPath,
      bytes: result.bytes,
    };
  }

  return {
    success: true,
    message: 'Core generator initialized.',
  };
}
