import type { DiagramFit, DiagramOptions } from '../types/diagram.js';
import { DEFAULT_DOCUMENT_STYLE } from './default-style.js';

export interface DocumentBuildOptions {
  title?: string;
  customCss?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Adjusts the SVG attributes according to the diagram fit mode.
 */
export function adaptSvgForFit(svg: string, fit: DiagramFit): string {
  const targetAspect =
    fit === 'fill' ? 'preserveAspectRatio="none"' : 'preserveAspectRatio="xMidYMid meet"';

  if (/preserveAspectRatio="[^"]*"/.test(svg)) {
    return svg.replace(/preserveAspectRatio="[^"]*"/, targetAspect);
  }

  return svg.replace(/<svg\b([^>]*)>/, `<svg$1 ${targetAspect}>`);
}

/**
 * Builds HTML container structure for a rendered diagram with applied DiagramOptions.
 */
export function buildDiagramContainer(svg: string, options: DiagramOptions): string {
  const styles: string[] = [];

  if (options.width) {
    styles.push(`width: ${options.width};`);
  }

  if (options.height) {
    styles.push(`height: ${options.height};`);
  }

  const inlineStyle = styles.length > 0 ? ` style="${styles.join(' ')}"` : '';
  const alignClass = `md-tech-diagram-align-${options.align}`;
  const fitClass = `md-tech-diagram-fit-${options.fit}`;

  const adjustedSvg = adaptSvgForFit(svg, options.fit);

  return [
    `<div class="md-tech-diagram ${alignClass} ${fitClass}"${inlineStyle}>`,
    '  <div class="md-tech-diagram-content">',
    `    ${adjustedSvg}`,
    '  </div>',
    '</div>',
  ].join('\n');
}

/**
 * Wraps rendered HTML body into a complete HTML5 document.
 */
export function buildCompleteHtml(bodyContent: string, options?: DocumentBuildOptions): string {
  const title = options?.title ?? 'md-tech-pdf';
  const customCss = options?.customCss ?? '';

  return [
    '<!DOCTYPE html>',
    '<html lang="ja">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `  <title>${escapeHtml(title)}</title>`,
    '  <style>',
    DEFAULT_DOCUMENT_STYLE,
    customCss,
    '  </style>',
    '</head>',
    '<body>',
    bodyContent,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}
