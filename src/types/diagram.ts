export type DiagramType = 'mermaid' | 'plantuml';

export type DiagramFit = 'contain' | 'fill';

export type DiagramAlign = 'left' | 'center' | 'right';

/**
 * Raw diagram options parsed directly from block fence attributes.
 * Properties are undefined if not explicitly specified.
 */
export interface RawDiagramOptions {
  width?: string;
  height?: string;
  fit?: DiagramFit;
  align?: DiagramAlign;
}

/**
 * Resolved diagram options after merging defaults and document-level options.
 */
export interface ResolvedDiagramOptions {
  width?: string;
  height?: string;
  fit: DiagramFit;
  align: DiagramAlign;
}

/**
 * Backward compatibility alias for ResolvedDiagramOptions.
 */
export type DiagramOptions = ResolvedDiagramOptions;

export interface DiagramBlock {
  type: DiagramType;
  source: string;
  options: ResolvedDiagramOptions;
  rawOptions?: RawDiagramOptions;
  line?: number;
}
