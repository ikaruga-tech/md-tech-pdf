import type { DiagramType } from '../types/diagram.js';

export interface DiagramErrorDetails {
  line?: number;
  diagramType?: DiagramType;
  attributeName?: string;
  invalidValue?: string;
}

export class DiagramParseError extends Error {
  readonly line?: number;
  readonly diagramType?: DiagramType;
  readonly attributeName?: string;
  readonly invalidValue?: string;

  constructor(message: string, details?: DiagramErrorDetails) {
    super(message);
    this.name = 'DiagramParseError';
    this.line = details?.line;
    this.diagramType = details?.diagramType;
    this.attributeName = details?.attributeName;
    this.invalidValue = details?.invalidValue;
  }
}
