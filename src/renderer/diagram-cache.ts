import * as crypto from 'node:crypto';
import type { DiagramType } from '../types/diagram.js';

export interface DiagramCacheKeyOptions {
  theme?: string;
  javaPath?: string;
  jarPath?: string;
  jarMtime?: number;
}

export interface DiagramCacheEntry {
  svg: string;
}

/**
 * Computes a deterministic SHA-256 cache key for a diagram based on its type, source,
 * and options that directly impact SVG output (e.g. mermaid theme or plantuml paths).
 * Container layout options (width, height, fit, align) are intentionally excluded
 * so CSS changes do not cause unnecessary diagram re-renders.
 */
export function computeDiagramCacheKey(
  type: DiagramType,
  source: string,
  options?: DiagramCacheKeyOptions
): string {
  const hash = crypto.createHash('sha256');
  hash.update(type);
  hash.update('\n');
  hash.update(source);
  hash.update('\n');

  if (type === 'mermaid') {
    if (options?.theme) {
      hash.update(`theme:${options.theme}\n`);
    }
  } else if (type === 'plantuml') {
    if (options?.javaPath) {
      hash.update(`javaPath:${options.javaPath}\n`);
    }
    if (options?.jarPath) {
      hash.update(`jarPath:${options.jarPath}\n`);
    }
    if (options?.jarMtime !== undefined) {
      hash.update(`jarMtime:${options.jarMtime}\n`);
    }
  }

  return hash.digest('hex');
}

/**
 * Common cache interface for diagram SVG storage.
 */
export interface IDiagramRenderCache {
  get(key: string): string | undefined;
  set(key: string, svg: string): void;
  has?(key: string): boolean;
  delete?(key: string): boolean;
  clear?(): void;
  readonly size?: number;
}

/**
 * In-memory cache for rendered diagram SVGs.
 */
export class DiagramRenderCache implements IDiagramRenderCache {
  private readonly entries = new Map<string, DiagramCacheEntry>();

  public get(key: string): string | undefined {
    return this.entries.get(key)?.svg;
  }

  public set(key: string, svg: string): void {
    this.entries.set(key, { svg });
  }

  public has(key: string): boolean {
    return this.entries.has(key);
  }

  public delete(key: string): boolean {
    return this.entries.delete(key);
  }

  public clear(): void {
    this.entries.clear();
  }

  public get size(): number {
    return this.entries.size;
  }
}
