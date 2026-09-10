import MarkdownIt from 'markdown-it';
import { parseAttributes } from '../parser/attributes-parser.js';
import { MermaidRenderer } from '../renderer/mermaid-renderer.js';
import type { DiagramBlock, DiagramType } from '../types/diagram.js';
import { buildCompleteHtml, buildDiagramContainer } from './html-builder.js';

export interface HtmlRenderOptions {
  title?: string;
  customCss?: string;
}

/**
 * Converts Markdown technical documents into complete HTML documents,
 * rendering Mermaid diagram blocks into styled SVG containers.
 */
export class HtmlRenderer {
  private readonly mermaidRenderer: MermaidRenderer;
  private readonly md: InstanceType<typeof MarkdownIt>;

  constructor(mermaidRenderer?: MermaidRenderer) {
    this.mermaidRenderer = mermaidRenderer ?? new MermaidRenderer();
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: false,
    });
  }

  /**
   * Renders Markdown source into a complete HTML5 document.
   */
  async render(markdown: string, options?: HtmlRenderOptions): Promise<string> {
    const tokens = this.md.parse(markdown, {});

    // Collect all Mermaid fence tokens to render asynchronously
    const pendingRenders: Array<{
      index: number;
      block: DiagramBlock;
    }> = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type !== 'fence') {
        continue;
      }

      const info = token.info.trim();
      if (!info) {
        continue;
      }

      const match = info.match(/^([a-zA-Z0-9_-]+)(.*)$/);
      if (!match) {
        continue;
      }

      const lang = match[1].toLowerCase() as DiagramType;
      if (lang !== 'mermaid') {
        continue;
      }

      const line = token.map ? token.map[0] + 1 : undefined;
      const rawRest = match[2].trim();
      let attributesString: string | undefined;

      if (rawRest !== '') {
        if (rawRest.startsWith('{') && rawRest.endsWith('}')) {
          attributesString = rawRest.slice(1, -1).trim();
        }
      }

      const diagramOptions = parseAttributes(attributesString);
      const cleanSource = token.content.replace(/\r?\n$/, '');

      pendingRenders.push({
        index: i,
        block: {
          type: 'mermaid',
          source: cleanSource,
          options: diagramOptions,
          line,
        },
      });
    }

    // Render all Mermaid diagrams
    for (const item of pendingRenders) {
      const svg = await this.mermaidRenderer.render(item.block.source);
      const containerHtml = buildDiagramContainer(svg, item.block.options);

      const targetToken = tokens[item.index];
      targetToken.type = 'html_block';
      targetToken.content = containerHtml;
      targetToken.children = null;
    }

    // Render Markdown AST with transformed diagram tokens to HTML body
    const bodyHtml = this.md.renderer.render(tokens, this.md.options, {});

    // Wrap in full HTML document
    return buildCompleteHtml(bodyHtml, options);
  }
}
