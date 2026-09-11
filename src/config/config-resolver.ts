import { DEFAULT_PDF_OPTIONS } from '../pdf/default-options.js';
import type { PdfOptions } from '../pdf/types.js';
import type { RawDiagramOptions, ResolvedDiagramOptions } from '../types/diagram.js';
import {
  BUILTIN_DEFAULT_DIAGRAM_OPTIONS,
  type DiagramDefaultOptions,
  type PdfDocumentOptions,
} from './document-options.js';

/**
 * Resolves diagram options following the strict precedence hierarchy:
 * 1. Code block individual attribute (RawDiagramOptions)
 * 2. Document Front Matter (DiagramDefaultOptions)
 * 3. Application default (DiagramDefaultOptions)
 * 4. Built-in system default (fit: 'contain', align: 'center')
 */
export function resolveDiagramOptions(
  raw: RawDiagramOptions,
  docDefault?: DiagramDefaultOptions,
  appDefault?: DiagramDefaultOptions
): ResolvedDiagramOptions {
  const width = raw.width ?? docDefault?.width ?? appDefault?.width ?? undefined;
  const height = raw.height ?? docDefault?.height ?? appDefault?.height ?? undefined;
  const fit = raw.fit ?? docDefault?.fit ?? appDefault?.fit ?? BUILTIN_DEFAULT_DIAGRAM_OPTIONS.fit;
  const align =
    raw.align ?? docDefault?.align ?? appDefault?.align ?? BUILTIN_DEFAULT_DIAGRAM_OPTIONS.align;

  return {
    width,
    height,
    fit,
    align,
  };
}

/**
 * Resolves PDF rendering options following the precedence hierarchy:
 * 1. Application-level options (e.g. CLI flag / API argument)
 * 2. Document Front Matter (PdfDocumentOptions)
 * 3. Built-in system default (A4, portrait, 15mm margins, printBackground: true)
 */
export function resolvePdfOptions(docPdf?: PdfDocumentOptions, appPdf?: PdfOptions): PdfOptions {
  return {
    format: appPdf?.format ?? docPdf?.format ?? DEFAULT_PDF_OPTIONS.format,
    landscape: appPdf?.landscape ?? docPdf?.landscape ?? DEFAULT_PDF_OPTIONS.landscape,
    printBackground: appPdf?.printBackground ?? DEFAULT_PDF_OPTIONS.printBackground,
    margin: {
      top: appPdf?.margin?.top ?? docPdf?.margin?.top ?? DEFAULT_PDF_OPTIONS.margin.top,
      right: appPdf?.margin?.right ?? docPdf?.margin?.right ?? DEFAULT_PDF_OPTIONS.margin.right,
      bottom: appPdf?.margin?.bottom ?? docPdf?.margin?.bottom ?? DEFAULT_PDF_OPTIONS.margin.bottom,
      left: appPdf?.margin?.left ?? docPdf?.margin?.left ?? DEFAULT_PDF_OPTIONS.margin.left,
    },
  };
}
