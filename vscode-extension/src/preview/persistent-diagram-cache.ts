import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IDiagramRenderCache } from './preview-panel.js';

export interface PersistentDiagramCacheOptions {
  storageDir?: string;
  enabled?: boolean;
}

/**
 * Two-level diagram cache (L1 in-memory Map + L2 disk storage)
 * implementing IDiagramRenderCache for fast preview restores across sessions.
 */
export class PersistentDiagramCache implements IDiagramRenderCache {
  private readonly memoryEntries = new Map<string, string>();
  private readonly storageDir?: string;
  private isEnabled: boolean;

  constructor(options?: PersistentDiagramCacheOptions) {
    this.storageDir = options?.storageDir;
    this.isEnabled = options?.enabled ?? true;

    if (this.storageDir && this.isEnabled) {
      try {
        fs.mkdirSync(this.storageDir, { recursive: true });
      } catch (err: unknown) {
        console.error('[md-tech-pdf] Failed to create diagram cache directory:', err);
      }
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public get enabled(): boolean {
    return this.isEnabled;
  }

  private getFilePath(key: string): string | undefined {
    if (!this.storageDir) {
      return undefined;
    }
    // Key is a deterministic SHA-256 hex string, safe for file names
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.storageDir, `${safeKey}.svg`);
  }

  public get(key: string): string | undefined {
    // 1. Check L1 in-memory cache
    const memSvg = this.memoryEntries.get(key);
    if (memSvg !== undefined) {
      return memSvg;
    }

    // 2. Check L2 disk cache if enabled
    if (!this.isEnabled || !this.storageDir) {
      return undefined;
    }

    const filePath = this.getFilePath(key);
    if (!filePath) {
      return undefined;
    }

    try {
      if (fs.existsSync(filePath)) {
        const svg = fs.readFileSync(filePath, 'utf-8');
        // Promote to L1 memory
        this.memoryEntries.set(key, svg);
        return svg;
      }
    } catch (err: unknown) {
      console.warn(`[md-tech-pdf] Failed to read diagram cache for key ${key}:`, err);
    }

    return undefined;
  }

  public set(key: string, svg: string): void {
    // 1. Store in L1 in-memory cache
    this.memoryEntries.set(key, svg);

    // 2. Asynchronously persist to L2 disk cache if enabled
    if (!this.isEnabled || !this.storageDir) {
      return;
    }

    const filePath = this.getFilePath(key);
    if (!filePath) {
      return;
    }

    fs.promises.writeFile(filePath, svg, 'utf-8').catch((err: unknown) => {
      console.warn(`[md-tech-pdf] Failed to write diagram cache for key ${key}:`, err);
    });
  }

  public has(key: string): boolean {
    if (this.memoryEntries.has(key)) {
      return true;
    }

    if (!this.isEnabled || !this.storageDir) {
      return false;
    }

    const filePath = this.getFilePath(key);
    return Boolean(filePath && fs.existsSync(filePath));
  }

  public delete(key: string): boolean {
    const memoryDeleted = this.memoryEntries.delete(key);

    const filePath = this.getFilePath(key);
    if (filePath) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          return true;
        }
      } catch (err: unknown) {
        console.warn(`[md-tech-pdf] Failed to delete diagram cache file for key ${key}:`, err);
      }
    }

    return memoryDeleted;
  }

  public clear(): void {
    this.memoryEntries.clear();
    void this.clearDisk();
  }

  public async clearDisk(): Promise<void> {
    if (!this.storageDir) {
      return;
    }

    try {
      if (fs.existsSync(this.storageDir)) {
        const files = await fs.promises.readdir(this.storageDir);
        await Promise.all(
          files
            .filter((f) => f.endsWith('.svg'))
            .map((f) => fs.promises.unlink(path.join(this.storageDir!, f)).catch(() => {}))
        );
      }
    } catch (err: unknown) {
      console.error('[md-tech-pdf] Failed to clear diagram cache directory:', err);
    }
  }

  public get size(): number {
    return this.memoryEntries.size;
  }
}
