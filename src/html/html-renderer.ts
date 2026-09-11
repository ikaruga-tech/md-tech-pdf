import MarkdownIt from 'markdown-it';
import { parseAttributes } from '../parser/attributes-parser.js';
import type { DiagramRenderer } from '../renderer/diagram-renderer.js';
import { MermaidRenderer } from '../renderer/mermaid-renderer.js';
import { PlantUmlRenderer } from '../renderer/plantuml-renderer.js';
import type { DiagramBlock, DiagramType } from '../types/diagram.js';
import { buildCompleteHtml, buildDiagramContainer } from './html-builder.js';

export interface HtmlRenderOptions {
  title?: string;
  customCss?: string;
}

export interface HtmlRendererConfig {
  mermaidRenderer?: DiagramRenderer;
  plantumlRenderer?: DiagramRenderer;
}

/**
 * Converts Markdown technical documents into complete HTML documents,
 * rendering Mermaid and PlantUML diagram blocks into styled SVG containers.
 */
export class HtmlRenderer {
  private readonly renderers: Map<DiagramType, DiagramRenderer>;
  private readonly md: InstanceType<typeof MarkdownIt>;

  constructor(
    mermaidRendererOrConfig?: DiagramRenderer | HtmlRendererConfig,
    plantumlRenderer?: DiagramRenderer
  ) {
    this.renderers = new Map();

    if (mermaidRendererOrConfig && 'render' in mermaidRendererOrConfig) {
      this.renderers.set('mermaid', mermaidRendererOrConfig);
      this.renderers.set('plantuml', plantumlRenderer ?? new PlantUmlRenderer());
    } else if (mermaidRendererOrConfig && typeof mermaidRendererOrConfig === 'object') {
      this.renderers.set(
        'mermaid',
        mermaidRendererOrConfig.mermaidRenderer ?? new MermaidRenderer()
      );
      this.renderers.set(
        'plantuml',
        mermaidRendererOrConfig.plantumlRenderer ?? new PlantUmlRenderer()
      );
    } else {
      this.renderers.set('mermaid', new MermaidRenderer());
      this.renderers.set('plantuml', plantumlRenderer ?? new PlantUmlRenderer());
    }

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

    // Collect all diagram fence tokens (mermaid, plantuml) to render asynchronously
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
      if (lang !== 'mermaid' && lang !== 'plantuml') {
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
          type: lang,
          source: cleanSource,
          options: diagramOptions,
          line,
        },
      });
    }

    // Render all diagrams asynchronously
    for (const item of pendingRenders) {
      const renderer = this.renderers.get(item.block.type);
      if (!renderer) {
        continue;
      }

      const svg = await renderer.render(item.block.source);
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
