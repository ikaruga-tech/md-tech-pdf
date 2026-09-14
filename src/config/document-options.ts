import type { DiagramAlign, DiagramFit, ResolvedDiagramOptions } from '../types/diagram.js';

export interface PdfMarginOptions {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface PdfDocumentOptions {
  format?: 'A4';
  landscape?: boolean;
  margin?: PdfMarginOptions;
}

export interface DiagramDefaultOptions {
  width?: string;
  height?: string;
  fit?: DiagramFit;
  align?: DiagramAlign;
}

export interface MermaidDocumentOptions {
  theme?: string;
}

export interface PlantUmlDocumentOptions {
  javaPath?: string;
  jarPath?: string;
}

export interface GoogleFontFamily {
  name: string;
  weights?: number[];
}

export interface GoogleFontsOptions {
  families: GoogleFontFamily[];
}

export interface FontOptions {
  family?: string;
  codeFamily?: string;
  google?: GoogleFontsOptions;
}

export interface StyleDocumentOptions {
  font?: FontOptions;
}

export interface DocumentOptions {
  pdf?: PdfDocumentOptions;
  diagram?: DiagramDefaultOptions;
  mermaid?: MermaidDocumentOptions;
  plantuml?: PlantUmlDocumentOptions;
  style?: StyleDocumentOptions;
}

/**
 * Built-in default options for diagrams.
 */
export const BUILTIN_DEFAULT_DIAGRAM_OPTIONS: Readonly<ResolvedDiagramOptions> = {
  fit: 'contain',
  align: 'center',
};

/**
 * Standard page format dimensions in physical units (mm).
 */
export const PAGE_FORMAT_DIMENSIONS: Record<string, { width: string; height: string }> = {
  A4: {
    width: '210mm',
    height: '297mm',
  },
} as const;
