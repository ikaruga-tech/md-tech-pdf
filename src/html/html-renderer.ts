import MarkdownIt from 'markdown-it';
import { resolveDiagramOptions } from '../config/config-resolver.js';
import type { DocumentOptions } from '../config/document-options.js';
import { parseFrontMatter } from '../config/frontmatter-parser.js';
import { parseRawAttributes } from '../parser/attributes-parser.js';
import type { DiagramRenderer } from '../renderer/diagram-renderer.js';
import { MermaidRenderer } from '../renderer/mermaid-renderer.js';
import { PlantUmlRenderer } from '../renderer/plantuml-renderer.js';
import { type IDiagramRenderCache, computeDiagramCacheKey } from '../renderer/diagram-cache.js';
import type { DiagramBlock, DiagramType } from '../types/diagram.js';
import {
  buildCompleteHtml,
  buildDiagramContainer,
  buildDiagramErrorContainer,
  type RenderTarget,
} from './html-builder.js';

export type { RenderTarget };

/**
 * Replaces image src attributes within raw HTML snippets safely.
 */
function replaceImgSrc(html: string, transform: (url: string) => string): string {
  return html.replace(
    /(<img\b[^>]*?\bsrc\s*=\s*)(['"])(.*?)\2/gi,
    (_match, prefix, quote, src) => `${prefix}${quote}${transform(src)}${quote}`
  );
}

export interface DiagramErrorEvent {
  type: DiagramType;
  index: number;
  line?: number;
  message: string;
  source: string;
  cause?: unknown;
}

export interface DiagramCacheEvent {
  type: DiagramType;
  index: number;
  hit: boolean;
  key: string;
}

export interface HtmlRenderOptions {
  title?: string;
  customCss?: string;
  documentOptions?: DocumentOptions;
  defaultOptions?: DocumentOptions;
  target?: RenderTarget;
  extraHeadHtml?: string;
  onDiagramError?: (event: DiagramErrorEvent) => void;
  onCacheEvent?: (event: DiagramCacheEvent) => void;
  resourceUrlTransformer?: (url: string) => string;
  diagramCache?: IDiagramRenderCache;
}

export interface HtmlRendererConfig {
  mermaidRenderer?: DiagramRenderer;
  plantumlRenderer?: DiagramRenderer;
  diagramCache?: IDiagramRenderCache;
}

/**
 * Converts Markdown technical documents into complete HTML documents,
 * extracting Front Matter and rendering Mermaid and PlantUML diagram blocks into styled SVG containers.
 */
export class HtmlRenderer {
  private readonly renderers: Map<DiagramType, DiagramRenderer>;
  private readonly md: InstanceType<typeof MarkdownIt>;
  private readonly defaultCache?: IDiagramRenderCache;

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
      this.defaultCache = mermaidRendererOrConfig.diagramCache;
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

    // Transform resource URLs (e.g. local image src) if a transformer hook is provided
    if (options?.resourceUrlTransformer) {
      const transformUrl = options.resourceUrlTransformer;
      for (const token of tokens) {
        if (token.type === 'inline' && token.children) {
          for (const child of token.children) {
            if (child.type === 'image') {
              const src = child.attrGet('src');
              if (typeof src === 'string') {
                child.attrSet('src', transformUrl(src));
              }
            } else if (child.type === 'html_inline') {
              child.content = replaceImgSrc(child.content, transformUrl);
            }
          }
        } else if (token.type === 'html_block') {
          token.content = replaceImgSrc(token.content, transformUrl);
        }
      }
    }

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

    const cache = options?.diagramCache ?? this.defaultCache;

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

      let svg: string | undefined;
      let cacheKey: string | undefined;

      if (cache) {
        cacheKey = computeDiagramCacheKey(item.block.type, item.block.source, {
          theme: docOptions.mermaid?.theme,
          javaPath: docOptions.plantuml?.javaPath,
          jarPath: docOptions.plantuml?.jarPath,
        });
        svg = cache.get(cacheKey);
        if (options?.onCacheEvent) {
          options.onCacheEvent({
            type: item.block.type,
            index: currentDiagramIndex,
            hit: !!svg,
            key: cacheKey,
          });
        }
      }

      try {
        if (!svg) {
          svg = await renderer.render(item.block.source, renderOptions);
          if (cache && cacheKey) {
            cache.set(cacheKey, svg);
          }
        }
        let containerHtml = buildDiagramContainer(svg, item.block.options);
        if (options?.target === 'preview' && item.block.line) {
          containerHtml = containerHtml.replace(/^<div\b/, `<div data-line="${item.block.line}"`);
        }

        const targetToken = tokens[item.index];
        targetToken.type = 'html_block';
        targetToken.content = containerHtml;
        targetToken.children = null;
      } catch (err: unknown) {
        if (options?.target === 'preview') {
          const rawMsg = err instanceof Error ? err.message : String(err);
          // Strip verbose/stack details for preview UI
          const userMsg = rawMsg.split('\n')[0].replace(/^Error:\s*/, '');
          let errorHtml = buildDiagramErrorContainer(item.block.type, userMsg, item.block.options);
          if (item.block.line) {
            errorHtml = errorHtml.replace(/^<div\b/, `<div data-line="${item.block.line}"`);
          }

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

    // In target === 'preview', inject data-line attribute into block elements
    if (options?.target === 'preview') {
      for (const token of tokens) {
        if (token.map && token.map.length >= 1) {
          const line = token.map[0] + 1;
          if (
            token.type.endsWith('_open') ||
            token.type === 'fence' ||
            token.type === 'code_block' ||
            token.type === 'hr'
          ) {
            token.attrSet('data-line', String(line));
          }
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
