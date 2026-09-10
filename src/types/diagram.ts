export type DiagramType = 'mermaid' | 'plantuml';

export type DiagramFit = 'contain' | 'fill';

export type DiagramAlign = 'left' | 'center' | 'right';

export interface DiagramOptions {
  width?: string;
  height?: string;
  fit: DiagramFit;
  align: DiagramAlign;
}

export interface DiagramBlock {
  type: DiagramType;
  source: string;
  options: DiagramOptions;
  line?: number;
}
