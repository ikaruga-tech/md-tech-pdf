import type { DiagramRenderer, DiagramRenderOptions } from './diagram-renderer.js';
import { DiagramRenderError } from './error.js';
import { executeMermaidCli } from './mermaid-executor.js';

export interface MermaidRendererOptions {
  defaultTheme?: string;
  defaultBackgroundColor?: string;
}

/**
 * Renders Mermaid diagram source code into SVG vector markup.
 * Note: PDF layout options (width, height, fit, align) are decoupled
 * and must be handled downstream by the HTML/CSS layout renderer.
 */
export class MermaidRenderer implements DiagramRenderer {
  private readonly defaultTheme?: string;
  private readonly defaultBackgroundColor?: string;

  constructor(options?: MermaidRendererOptions) {
    this.defaultTheme = options?.defaultTheme;
    this.defaultBackgroundColor = options?.defaultBackgroundColor;
  }

  /**
   * Converts Mermaid diagram definition source code into an SVG string.
   *
   * @param source Mermaid diagram definition text
   * @param options Optional diagram render options (e.g. theme, background)
   * @returns Pure vector SVG string
   * @throws DiagramRenderError on empty input or syntax/rendering errors
   */
  async render(source: string, options?: DiagramRenderOptions): Promise<string> {
    if (!source || source.trim() === '') {
      throw new DiagramRenderError(
        'Failed to render Mermaid diagram: Source is empty or whitespace only.'
      );
    }

    const theme = options?.theme ?? this.defaultTheme;
    const backgroundColor = options?.backgroundColor ?? this.defaultBackgroundColor;

    return executeMermaidCli(source, {
      theme,
      backgroundColor,
    });
  }
}
