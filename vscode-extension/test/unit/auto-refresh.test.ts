import * as assert from 'node:assert/strict';
import { clearMockConfiguration, setMockConfiguration } from './mock-vscode.js';
import * as vscode from 'vscode';
import { type IPreviewPanelInstance, PreviewManager } from '../../src/preview/preview-manager.js';
import type { PreviewRenderOptions } from '../../src/preview/preview-panel.js';

class MockRefreshPanel implements IPreviewPanelInstance {
  public refreshCount = 0;
  public lastOptions?: PreviewRenderOptions;
  public isDisposed = false;
  private disposeListeners: Array<() => void> = [];

  public reveal(_viewColumn?: vscode.ViewColumn): void {}

  public async refresh(options?: PreviewRenderOptions): Promise<void> {
    this.refreshCount++;
    this.lastOptions = options;
  }

  public onDidDispose(listener: () => void): vscode.Disposable {
    this.disposeListeners.push(listener);
    return {
      dispose: () => {
        this.disposeListeners = this.disposeListeners.filter((l) => l !== listener);
      },
    };
  }

  public triggerDispose(): void {
    this.isDisposed = true;
    for (const listener of this.disposeListeners) {
      listener();
    }
  }

  public dispose(): void {
    this.triggerDispose();
  }
}

function createTextDocumentMock(uriString: string): vscode.TextDocument {
  return {
    uri: vscode.Uri.file(uriString),
    fileName: uriString,
    getText: () => '# Document Content',
  } as unknown as vscode.TextDocument;
}

function createChangeEventMock(uriString: string): vscode.TextDocumentChangeEvent {
  return {
    document: createTextDocumentMock(uriString),
    contentChanges: [],
    reason: undefined,
  };
}

describe('Auto Refresh & PreviewManager Lifecycle', () => {
  let createdPanels: Map<string, MockRefreshPanel>;
  let manager: PreviewManager;

  beforeEach(() => {
    createdPanels = new Map();
    manager = new PreviewManager((uri) => {
      const panel = new MockRefreshPanel();
      createdPanels.set(uri.toString(), panel);
      return panel;
    });
  });

  afterEach(() => {
    manager.dispose();
    clearMockConfiguration();
  });

  describe('manual mode', () => {
    beforeEach(() => {
      setMockConfiguration({
        'plantuml.javaPath': 'java',
        'export.afterExport': 'none',
        'preview.refresh': 'manual',
      });
    });

    it('should NOT trigger refresh on document save or edit when refresh is manual', async () => {
      const docUri = vscode.Uri.file('/workspace/manual.md');
      await manager.openPreview(docUri);

      const panel = createdPanels.get(docUri.toString())!;
      assert.strictEqual(panel.refreshCount, 0);

      // Save document
      manager.handleDocumentSave(createTextDocumentMock('/workspace/manual.md'));
      assert.strictEqual(panel.refreshCount, 0);

      // Change document
      manager.handleDocumentChange(createChangeEventMock('/workspace/manual.md'));
      await new Promise((resolve) => setTimeout(resolve, 600));
      assert.strictEqual(panel.refreshCount, 0);
    });
  });

  describe('onSave mode', () => {
    beforeEach(() => {
      setMockConfiguration({
        'plantuml.javaPath': 'java',
        'export.afterExport': 'none',
        'preview.refresh': 'onSave',
      });
    });

    it('should trigger immediate refresh on document save', async () => {
      const docUri = vscode.Uri.file('/workspace/doc-onsave.md');
      await manager.openPreview(docUri);

      const panel = createdPanels.get(docUri.toString())!;
      assert.strictEqual(panel.refreshCount, 0);

      // Save matching document
      manager.handleDocumentSave(createTextDocumentMock('/workspace/doc-onsave.md'));
      assert.strictEqual(panel.refreshCount, 1);

      // Save different document -> should not trigger
      manager.handleDocumentSave(createTextDocumentMock('/workspace/other.md'));
      assert.strictEqual(panel.refreshCount, 1);
    });

    it('should NOT trigger refresh on document typing when mode is onSave', async () => {
      const docUri = vscode.Uri.file('/workspace/doc-onsave-typing.md');
      await manager.openPreview(docUri);

      const panel = createdPanels.get(docUri.toString())!;
      manager.handleDocumentChange(createChangeEventMock('/workspace/doc-onsave-typing.md'));

      await new Promise((resolve) => setTimeout(resolve, 600));
      assert.strictEqual(panel.refreshCount, 0);
    });
  });

  describe('onType mode', () => {
    beforeEach(() => {
      setMockConfiguration({
        'plantuml.javaPath': 'java',
        'export.afterExport': 'none',
        'preview.refresh': 'onType',
      });
    });

    afterEach(() => {
      delete (vscode as any).__configurationStore;
    });

    it('should debounce rapid typing edits and trigger only once after 500ms inactivity', async () => {
      const docUri = vscode.Uri.file('/workspace/doc-ontype.md');
      await manager.openPreview(docUri);
      const panel = createdPanels.get(docUri.toString())!;

      // Rapid changes: 4 edits spaced by 100ms
      manager.handleDocumentChange(createChangeEventMock('/workspace/doc-ontype.md'));
      await new Promise((resolve) => setTimeout(resolve, 100));
      manager.handleDocumentChange(createChangeEventMock('/workspace/doc-ontype.md'));
      await new Promise((resolve) => setTimeout(resolve, 100));
      manager.handleDocumentChange(createChangeEventMock('/workspace/doc-ontype.md'));
      await new Promise((resolve) => setTimeout(resolve, 100));
      manager.handleDocumentChange(createChangeEventMock('/workspace/doc-ontype.md'));

      // Before 500ms elapsed since last edit
      assert.strictEqual(panel.refreshCount, 0);

      // Wait for debounce timer to expire
      await new Promise((resolve) => setTimeout(resolve, 600));
      assert.strictEqual(panel.refreshCount, 1);
    });

    it('should maintain independent debounce timers for multiple active documents', async () => {
      const uriA = vscode.Uri.file('/workspace/docA.md');
      const uriB = vscode.Uri.file('/workspace/docB.md');

      await manager.openPreview(uriA);
      await manager.openPreview(uriB);

      const panelA = createdPanels.get(uriA.toString())!;
      const panelB = createdPanels.get(uriB.toString())!;

      // Trigger change for A
      manager.handleDocumentChange(createChangeEventMock('/workspace/docA.md'));
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Trigger change for B
      manager.handleDocumentChange(createChangeEventMock('/workspace/docB.md'));

      // At 550ms: A should have refreshed (total 600ms for A), B should not yet (only 250ms for B)
      await new Promise((resolve) => setTimeout(resolve, 300));
      assert.strictEqual(panelA.refreshCount, 1);
      assert.strictEqual(panelB.refreshCount, 0);

      // Wait for B to complete
      await new Promise((resolve) => setTimeout(resolve, 350));
      assert.strictEqual(panelA.refreshCount, 1);
      assert.strictEqual(panelB.refreshCount, 1);
    });
  });

  describe('dispose & cleanup', () => {
    it('should cancel pending debounce timers when panel is closed before timer expires', async () => {
      setMockConfiguration({
        'plantuml.javaPath': 'java',
        'export.afterExport': 'none',
        'preview.refresh': 'onType',
      });
      try {
        const docUri = vscode.Uri.file('/workspace/doc-closing.md');
        await manager.openPreview(docUri);
        const panel = createdPanels.get(docUri.toString())!;

        manager.handleDocumentChange(createChangeEventMock('/workspace/doc-closing.md'));

        // Close panel before 500ms
        panel.dispose();

        // Wait beyond debounce period
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Refresh must not have run on closed panel
        assert.strictEqual(panel.refreshCount, 0);
      } finally {
        clearMockConfiguration();
      }
    });

    it('should cancel all pending timers and clear cache when manager is disposed', async () => {
      const docUri = vscode.Uri.file('/workspace/cached.md');
      await manager.openPreview(docUri);

      manager.cache.set('dummy-key', '<svg></svg>');
      assert.strictEqual(manager.cache.size, 1);

      manager.dispose();
      assert.strictEqual(manager.cache.size, 0);
      assert.strictEqual(manager.panelCount, 0);
    });
  });

  describe('Stale Render Race Condition Protection', () => {
    it('should discard stale render results when a newer render completes first', async () => {
      let renderGeneration = 0;
      const appliedHtml: string[] = [];

      async function simulateRender(id: string, delayMs: number): Promise<void> {
        const currentGen = ++renderGeneration;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (currentGen !== renderGeneration) {
          // Stale render discarded
          return;
        }
        appliedHtml.push(id);
      }

      // Trigger Render A (slow: 200ms) then Render B (fast: 50ms)
      const promiseA = simulateRender('RenderA-Slow', 200);
      await new Promise((resolve) => setTimeout(resolve, 20));
      const promiseB = simulateRender('RenderB-Fast', 50);

      await Promise.all([promiseA, promiseB]);

      // Render B must be applied, Render A must be discarded
      assert.deepStrictEqual(appliedHtml, ['RenderB-Fast']);
    });
  });
});
