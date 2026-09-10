import MarkdownIt from 'markdown-it';
import type { DiagramBlock, DiagramType } from '../types/diagram.js';
import { parseAttributes } from './attributes-parser.js';
import { DiagramParseError } from './error.js';

export interface ParsedMarkdown {
  diagrams: DiagramBlock[];
}

const SUPPORTED_DIAGRAM_TYPES: readonly DiagramType[] = ['mermaid', 'plantuml'];

/**
 * Extracts Mermaid and PlantUML diagram blocks from a Markdown string.
 */
export function extractDiagramBlocks(source: string): DiagramBlock[] {
  const md = new MarkdownIt();
  const tokens = md.parse(source, {});
  const diagrams: DiagramBlock[] = [];

  for (const token of tokens) {
    if (token.type !== 'fence') {
      continue;
    }

    const info = token.info.trim();
    if (!info) {
      continue;
    }

    // Match language tag and optional attributes block inside {...}
    const match = info.match(/^([a-zA-Z0-9_-]+)(.*)$/);
    if (!match) {
      continue;
    }

    const lang = match[1].toLowerCase() as DiagramType;
    if (!SUPPORTED_DIAGRAM_TYPES.includes(lang)) {
      continue;
    }

    const line = token.map ? token.map[0] + 1 : undefined;
    const rawRest = match[2].trim();

    let attributesString: string | undefined;

    if (rawRest !== '') {
      if (rawRest.startsWith('{') && rawRest.endsWith('}')) {
        attributesString = rawRest.slice(1, -1).trim();
      } else {
        throw new DiagramParseError(
          `Invalid attribute syntax for ${lang} diagram. Expected {...} block, got: "${rawRest}"`,
          {
            line,
            diagramType: lang,
            invalidValue: rawRest,
          }
        );
      }
    }

    try {
      const options = parseAttributes(attributesString);
      // Remove trailing single newline if present while preserving internal newlines and indentations
      const cleanSource = token.content.replace(/\r?\n$/, '');

      diagrams.push({
        type: lang,
        source: cleanSource,
        options,
        line,
      });
    } catch (err: unknown) {
      if (err instanceof DiagramParseError) {
        throw new DiagramParseError(err.message, {
          line,
          diagramType: lang,
          attributeName: err.attributeName,
          invalidValue: err.invalidValue,
        });
      }
      throw err;
    }
  }

  return diagrams;
}

/**
 * Parses Markdown source and returns structured document information.
 */
export function parseMarkdown(source: string): ParsedMarkdown {
  const diagrams = extractDiagramBlocks(source);
  return { diagrams };
}
