import MarkdownIt from 'markdown-it';
import { resolveDiagramOptions } from '../config/config-resolver.js';
import type { DocumentOptions } from '../config/document-options.js';
import { parseFrontMatter } from '../config/frontmatter-parser.js';
import { parseRawAttributes } from '../parser/attributes-parser.js';
import type { DiagramRenderer } from '../renderer/diagram-renderer.js';
import { MermaidRenderer } from '../renderer/mermaid-renderer.js';
import { PlantUmlRenderer } from '../renderer/plantuml-renderer.js';
import type { DiagramBlock, DiagramType } from '../types/diagram.js';
import {
  buildCompleteHtml,
  buildDiagramContainer,
  buildDiagramErrorContainer,
  type RenderTarget,
} from './html-builder.js';

export type { RenderTarget };

export interface DiagramErrorEvent {
  type: DiagramType;
  index: number;
  line?: number;
  message: string;
  source: string;
  cause?: unknown;
}

export interface HtmlRenderOptions {
  title?: string;
  customCss?: string;
  documentOptions?: DocumentOptions;
  defaultOptions?: DocumentOptions;
  target?: RenderTarget;
  extraHeadHtml?: string;
  onDiagramError?: (event: DiagramErrorEvent) => void;
}

export interface HtmlRendererConfig {
  mermaidRenderer?: DiagramRenderer;
  plantumlRenderer?: DiagramRenderer;
}

/**
 * Converts Markdown technical documents into complete HTML documents,
 * extracting Front Matter and rendering Mermaid and PlantUML diagram blocks into styled SVG containers.
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
    // 1. Extract Front Matter and separate body content
    const { content: markdownBody, options: parsedDocOptions } = parseFrontMatter(markdown);

    // Merge document options:
    // priority: options.documentOptions > parsedDocOptions (Front Matter) > options.defaultOptions (App/VS Code settings)
    const defaults = options?.defaultOptions;
    const overrides = options?.documentOptions;

    const docOptions: DocumentOptions = {
      ...defaults,
      ...parsedDocOptions,
      ...overrides,
      diagram: {
        ...defaults?.diagram,
        ...parsedDocOptions.diagram,
        ...overrides?.diagram,
      },
      pdf: {
        ...defaults?.pdf,
        ...parsedDocOptions.pdf,
        ...overrides?.pdf,
      },
      mermaid: {
        ...defaults?.mermaid,
        ...parsedDocOptions.mermaid,
        ...overrides?.mermaid,
      },
      plantuml: {
        ...defaults?.plantuml,
        ...parsedDocOptions.plantuml,
        ...overrides?.plantuml,
      },
      style: {
        ...defaults?.style,
        ...parsedDocOptions.style,
        ...overrides?.style,
        font: {
          ...defaults?.style?.font,
          ...parsedDocOptions.style?.font,
          ...overrides?.style?.font,
        },
      },
    };

    // If PlantUML options are configured in Front Matter, create an ad-hoc renderer if default was used
    let plantumlRenderer = this.renderers.get('plantuml');
    if (
      docOptions.plantuml &&
      (!plantumlRenderer || plantumlRenderer instanceof PlantUmlRenderer)
    ) {
      plantumlRenderer = new PlantUmlRenderer({
        javaPath: docOptions.plantuml.javaPath,
        jarPath: docOptions.plantuml.jarPath,
      });
    }

    const tokens = this.md.parse(markdownBody, {});

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

      const rawOptions = parseRawAttributes(attributesString);
      const diagramOptions = resolveDiagramOptions(rawOptions, docOptions.diagram);
      const cleanSource = token.content.replace(/\r?\n$/, '');

      pendingRenders.push({
        index: i,
        block: {
          type: lang,
          source: cleanSource,
          options: diagramOptions,
          rawOptions,
          line,
        },
      });
    }

    // Render all diagrams asynchronously
    let diagramCounter = 0;
    for (const item of pendingRenders) {
      diagramCounter++;
      const currentDiagramIndex = diagramCounter;
      const renderer =
        item.block.type === 'plantuml' && plantumlRenderer
          ? plantumlRenderer
          : this.renderers.get(item.block.type);

      if (!renderer) {
        continue;
      }

      const renderOptions =
        item.block.type === 'mermaid' && docOptions.mermaid?.theme
          ? { theme: docOptions.mermaid.theme }
          : undefined;

      try {
        const svg = await renderer.render(item.block.source, renderOptions);
        const containerHtml = buildDiagramContainer(svg, item.block.options);

        const targetToken = tokens[item.index];
        targetToken.type = 'html_block';
        targetToken.content = containerHtml;
        targetToken.children = null;
      } catch (err: unknown) {
        if (options?.target === 'preview') {
          const rawMsg = err instanceof Error ? err.message : String(err);
          // Strip verbose/stack details for preview UI
          const userMsg = rawMsg.split('\n')[0].replace(/^Error:\s*/, '');
          const errorHtml = buildDiagramErrorContainer(
            item.block.type,
            userMsg,
            item.block.options
          );

          const targetToken = tokens[item.index];
          targetToken.type = 'html_block';
          targetToken.content = errorHtml;
          targetToken.children = null;

          if (options?.onDiagramError) {
            options.onDiagramError({
              type: item.block.type,
              index: currentDiagramIndex,
              line: item.block.line,
              message: rawMsg,
              source: item.block.source,
              cause: err,
            });
          }
        } else {
          // For PDF generation, preserve strict behavior: throw error to fail document generation
          throw err;
        }
      }
    }

    // Render Markdown AST with transformed diagram tokens to HTML body
    const bodyHtml = this.md.renderer.render(tokens, this.md.options, {});

    // Wrap in full HTML document
    return buildCompleteHtml(bodyHtml, {
      ...options,
      fontOptions: docOptions.style?.font,
    });
  }
}
