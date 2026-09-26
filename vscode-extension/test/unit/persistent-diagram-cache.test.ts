import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { PersistentDiagramCache } from '../../src/preview/persistent-diagram-cache.js';

describe('PersistentDiagramCache', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-tech-cache-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('should store and retrieve from in-memory L1 cache', () => {
    const cache = new PersistentDiagramCache();
    cache.set('key1', '<svg>test1</svg>');

    assert.strictEqual(cache.get('key1'), '<svg>test1</svg>');
    assert.strictEqual(cache.has('key1'), true);
    assert.strictEqual(cache.size, 1);
  });

  it('should persist to L2 disk cache and restore after memory clear', async () => {
    const cache = new PersistentDiagramCache({ storageDir: tmpDir });
    cache.set('diagram_hash_1', '<svg>persisted</svg>');

    // Wait a brief moment for async disk write
    await new Promise((resolve) => setTimeout(resolve, 50));

    const expectedFile = path.join(tmpDir, 'diagram_hash_1.svg');
    assert.strictEqual(fs.existsSync(expectedFile), true);
    assert.strictEqual(fs.readFileSync(expectedFile, 'utf-8'), '<svg>persisted</svg>');

    // Create a new instance pointing to same storageDir (simulating restart)
    const newCache = new PersistentDiagramCache({ storageDir: tmpDir });
    assert.strictEqual(newCache.size, 0); // Not in memory yet

    const restored = newCache.get('diagram_hash_1');
    assert.strictEqual(restored, '<svg>persisted</svg>');
    assert.strictEqual(newCache.size, 1); // Promoted to memory
  });

  it('should not read from or write to disk when disabled', async () => {
    const cache = new PersistentDiagramCache({ storageDir: tmpDir, enabled: false });
    cache.set('key_disabled', '<svg>disabled</svg>');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const file = path.join(tmpDir, 'key_disabled.svg');
    assert.strictEqual(fs.existsSync(file), false);

    // Write a dummy file directly to disk
    fs.writeFileSync(path.join(tmpDir, 'external.svg'), '<svg>ext</svg>');
    assert.strictEqual(cache.get('external'), undefined);
  });

  it('should delete from both memory and disk', async () => {
    const cache = new PersistentDiagramCache({ storageDir: tmpDir });
    cache.set('key_del', '<svg>del</svg>');

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.strictEqual(fs.existsSync(path.join(tmpDir, 'key_del.svg')), true);

    const deleted = cache.delete('key_del');
    assert.strictEqual(deleted, true);
    assert.strictEqual(cache.get('key_del'), undefined);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, 'key_del.svg')), false);
  });

  it('should clear all svg files from disk on clear()', async () => {
    const cache = new PersistentDiagramCache({ storageDir: tmpDir });
    cache.set('d1', '<svg>1</svg>');
    cache.set('d2', '<svg>2</svg>');

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.strictEqual(fs.existsSync(path.join(tmpDir, 'd1.svg')), true);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, 'd2.svg')), true);

    cache.clear();
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.strictEqual(cache.size, 0);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, 'd1.svg')), false);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, 'd2.svg')), false);
  });
});
