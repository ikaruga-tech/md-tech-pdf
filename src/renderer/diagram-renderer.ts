export interface DiagramRenderOptions {
  theme?: string;
  backgroundColor?: string;
}

/**
 * Common interface for diagram renderers (e.g. Mermaid, PlantUML, Graphviz).
 */
export interface DiagramRenderer {
  render(source: string, options?: DiagramRenderOptions): Promise<string>;
}
