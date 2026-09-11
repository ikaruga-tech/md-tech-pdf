import yaml from 'yaml';
import type { DiagramAlign, DiagramFit } from '../types/diagram.js';
import type {
  DiagramDefaultOptions,
  DocumentOptions,
  MermaidDocumentOptions,
  PdfDocumentOptions,
  PdfMarginOptions,
  PlantUmlDocumentOptions,
} from './document-options.js';
import { FrontMatterError } from './error.js';

const VALID_DIMENSION_REGEX = /^(\d+(?:\.\d+)?)(px|mm|cm|in|%)$/;
const VALID_FITS: readonly DiagramFit[] = ['contain', 'fill'];
const VALID_ALIGNS: readonly DiagramAlign[] = ['left', 'center', 'right'];

function validateDimension(path: string, val: unknown): string {
  if (typeof val !== 'string') {
    throw new FrontMatterError(
      `Invalid Front Matter setting: ${path} = ${JSON.stringify(val)}. Expected string with dimension unit.`,
      { path }
    );
  }
  const trimmed = val.trim();
  if (trimmed === 'auto') {
    return trimmed;
  }
  const match = trimmed.match(VALID_DIMENSION_REGEX);
  if (!match) {
    throw new FrontMatterError(
      `Invalid Front Matter setting: ${path} = ${JSON.stringify(val)}. Expected valid dimension (e.g. 100px, 150mm, 50%).`,
      { path }
    );
  }
  const num = parseFloat(match[1]);
  if (num <= 0) {
    throw new FrontMatterError(
      `Invalid Front Matter setting: ${path} = ${JSON.stringify(val)}. Value must be greater than 0.`,
      { path }
    );
  }
  return trimmed;
}

function validateFit(path: string, val: unknown): DiagramFit {
  if (typeof val !== 'string' || !VALID_FITS.includes(val.trim() as DiagramFit)) {
    throw new FrontMatterError(
      `Invalid Front Matter setting: ${path} = ${JSON.stringify(val)}. Expected "contain" or "fill".`,
      { path }
    );
  }
  return val.trim() as DiagramFit;
}

function validateAlign(path: string, val: unknown): DiagramAlign {
  if (typeof val !== 'string' || !VALID_ALIGNS.includes(val.trim() as DiagramAlign)) {
    throw new FrontMatterError(
      `Invalid Front Matter setting: ${path} = ${JSON.stringify(val)}. Expected "left", "center", or "right".`,
      { path }
    );
  }
  return val.trim() as DiagramAlign;
}

function validatePdfOptions(rawPdf: unknown): PdfDocumentOptions {
  if (typeof rawPdf !== 'object' || rawPdf === null || Array.isArray(rawPdf)) {
    throw new FrontMatterError(
      `Invalid Front Matter setting: pdf = ${JSON.stringify(rawPdf)}. Expected object.`,
      { path: 'pdf' }
    );
  }
  const record = rawPdf as Record<string, unknown>;
  const result: PdfDocumentOptions = {};

  if (record.format !== undefined) {
    if (record.format !== 'A4') {
      throw new FrontMatterError(
        `Invalid Front Matter setting: pdf.format = ${JSON.stringify(record.format)}. Only "A4" is currently supported.`,
        { path: 'pdf.format' }
      );
    }
    result.format = 'A4';
  }

  if (record.landscape !== undefined) {
    if (typeof record.landscape !== 'boolean') {
      throw new FrontMatterError(
        `Invalid Front Matter setting: pdf.landscape = ${JSON.stringify(record.landscape)}. Expected boolean.`,
        { path: 'pdf.landscape' }
      );
    }
    result.landscape = record.landscape;
  }

  if (record.margin !== undefined) {
    if (
      typeof record.margin !== 'object' ||
      record.margin === null ||
      Array.isArray(record.margin)
    ) {
      throw new FrontMatterError(
        `Invalid Front Matter setting: pdf.margin = ${JSON.stringify(record.margin)}. Expected object.`,
        { path: 'pdf.margin' }
      );
    }
    const marginRec = record.margin as Record<string, unknown>;
    const marginRes: PdfMarginOptions = {};

    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      if (marginRec[side] !== undefined) {
        marginRes[side] = validateDimension(`pdf.margin.${side}`, marginRec[side]);
      }
    }
    result.margin = marginRes;
  }

  return result;
}

function validateDiagramOptions(rawDiagram: unknown): DiagramDefaultOptions {
  if (typeof rawDiagram !== 'object' || rawDiagram === null || Array.isArray(rawDiagram)) {
    throw new FrontMatterError(
      `Invalid Front Matter setting: diagram = ${JSON.stringify(rawDiagram)}. Expected object.`,
      { path: 'diagram' }
    );
  }
  const record = rawDiagram as Record<string, unknown>;
  const result: DiagramDefaultOptions = {};

  if (record.width !== undefined) {
    result.width = validateDimension('diagram.width', record.width);
  }
  if (record.height !== undefined) {
    result.height = validateDimension('diagram.height', record.height);
  }
  if (record.fit !== undefined) {
    result.fit = validateFit('diagram.fit', record.fit);
  }
  if (record.align !== undefined) {
    result.align = validateAlign('diagram.align', record.align);
  }

  return result;
}

function validateMermaidOptions(rawMermaid: unknown): MermaidDocumentOptions {
  if (typeof rawMermaid !== 'object' || rawMermaid === null || Array.isArray(rawMermaid)) {
    throw new FrontMatterError(
      `Invalid Front Matter setting: mermaid = ${JSON.stringify(rawMermaid)}. Expected object.`,
      { path: 'mermaid' }
    );
  }
  const record = rawMermaid as Record<string, unknown>;
  const result: MermaidDocumentOptions = {};

  if (record.theme !== undefined) {
    if (typeof record.theme !== 'string' || record.theme.trim() === '') {
      throw new FrontMatterError(
        `Invalid Front Matter setting: mermaid.theme = ${JSON.stringify(record.theme)}. Expected non-empty string.`,
        { path: 'mermaid.theme' }
      );
    }
    result.theme = record.theme.trim();
  }

  return result;
}

function validatePlantUmlOptions(rawPlantUml: unknown): PlantUmlDocumentOptions {
  if (typeof rawPlantUml !== 'object' || rawPlantUml === null || Array.isArray(rawPlantUml)) {
    throw new FrontMatterError(
      `Invalid Front Matter setting: plantuml = ${JSON.stringify(rawPlantUml)}. Expected object.`,
      { path: 'plantuml' }
    );
  }
  const record = rawPlantUml as Record<string, unknown>;
  const result: PlantUmlDocumentOptions = {};

  if (record.javaPath !== undefined) {
    if (typeof record.javaPath !== 'string' || record.javaPath.trim() === '') {
      throw new FrontMatterError(
        `Invalid Front Matter setting: plantuml.javaPath = ${JSON.stringify(record.javaPath)}. Expected non-empty string.`,
        { path: 'plantuml.javaPath' }
      );
    }
    result.javaPath = record.javaPath.trim();
  }

  if (record.jarPath !== undefined) {
    if (typeof record.jarPath !== 'string' || record.jarPath.trim() === '') {
      throw new FrontMatterError(
        `Invalid Front Matter setting: plantuml.jarPath = ${JSON.stringify(record.jarPath)}. Expected non-empty string.`,
        { path: 'plantuml.jarPath' }
      );
    }
    result.jarPath = record.jarPath.trim();
  }

  return result;
}

const FRONT_MATTER_REGEX = /^---[ \t]*(?:\r?\n([\s\S]*?))?\r?\n---[ \t]*(?:\r?\n|$)/;

export interface ParsedFrontMatter {
  content: string;
  options: DocumentOptions;
  rawFrontMatter?: string;
}

/**
 * Extracts and validates YAML Front Matter from Markdown source text.
 * Strips the Front Matter block from the returned content.
 *
 * @param source Raw Markdown document text
 * @returns Parsed content and validated DocumentOptions
 * @throws {FrontMatterError} On YAML syntax errors or invalid configuration values
 */
export function parseFrontMatter(source: string): ParsedFrontMatter {
  // Front matter must start at line 1 with "---"
  const match = source.match(FRONT_MATTER_REGEX);
  if (!match) {
    return {
      content: source,
      options: {},
    };
  }

  const rawYaml = match[1] ?? '';
  const content = source.slice(match[0].length);

  if (rawYaml.trim() === '') {
    return {
      content,
      options: {},
      rawFrontMatter: rawYaml,
    };
  }

  let parsedYaml: unknown;
  try {
    parsedYaml = yaml.parse(rawYaml);
  } catch (err) {
    throw new FrontMatterError(
      `Failed to parse YAML Front Matter: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err }
    );
  }

  if (parsedYaml === null || parsedYaml === undefined) {
    return {
      content,
      options: {},
      rawFrontMatter: rawYaml,
    };
  }

  if (typeof parsedYaml !== 'object' || Array.isArray(parsedYaml)) {
    throw new FrontMatterError(
      `Invalid Front Matter structure: expected a YAML mapping/object, got ${typeof parsedYaml}.`
    );
  }

  const rawRecord = parsedYaml as Record<string, unknown>;
  const options: DocumentOptions = {};

  if (rawRecord.pdf !== undefined) {
    options.pdf = validatePdfOptions(rawRecord.pdf);
  }
  if (rawRecord.diagram !== undefined) {
    options.diagram = validateDiagramOptions(rawRecord.diagram);
  }
  if (rawRecord.mermaid !== undefined) {
    options.mermaid = validateMermaidOptions(rawRecord.mermaid);
  }
  if (rawRecord.plantuml !== undefined) {
    options.plantuml = validatePlantUmlOptions(rawRecord.plantuml);
  }

  return {
    content,
    options,
    rawFrontMatter: rawYaml,
  };
}
