import * as assert from 'node:assert/strict';
import type * as vscode from 'vscode';
import {
  type IPreviewPanelInstance,
  PreviewManager,
} from '../../src/preview/preview-manager.js';

class MockPreviewPanel implements IPreviewPanelInstance {
  public isRevealed = false;
  public revealedColumn?: vscode.ViewColumn;
  public isDisposed = false;
  private disposeListeners: Array<() => void> = [];

  public reveal(viewColumn?: vscode.ViewColumn): void {
    this.isRevealed = true;
    this.revealedColumn = viewColumn;
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

function createDummyUri(pathStr: string): vscode.Uri {
  return {
    toString: () => `file://${pathStr}`,
    fsPath: pathStr,
    scheme: 'file',
  } as unknown as vscode.Uri;
}

describe('preview-manager', () => {
  let createdPanels: MockPreviewPanel[];
  let manager: PreviewManager;

  beforeEach(() => {
    createdPanels = [];
    manager = new PreviewManager((_uri, _col, _settings) => {
      const panel = new MockPreviewPanel();
      createdPanels.push(panel);
      return panel;
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should create a new panel when openPreview is called for a new document', async () => {
    const uri = createDummyUri('/workspace/test.md');
    const panel = await manager.openPreview(uri);

    assert.strictEqual(manager.panelCount, 1);
    assert.strictEqual(createdPanels.length, 1);
    assert.strictEqual(panel, createdPanels[0]);
    assert.strictEqual(manager.getPanel(uri), panel);
  });

  it('should reuse and reveal the existing panel when openPreview is called for the same document', async () => {
    const uri = createDummyUri('/workspace/test.md');
    const panel1 = await manager.openPreview(uri);

    assert.strictEqual(createdPanels.length, 1);
    assert.strictEqual((panel1 as MockPreviewPanel).isRevealed, false);

    const panel2 = await manager.openPreview(uri);

    assert.strictEqual(createdPanels.length, 1);
    assert.strictEqual(panel1, panel2);
    assert.strictEqual((panel1 as MockPreviewPanel).isRevealed, true);
    assert.strictEqual(manager.panelCount, 1);
  });

  it('should create separate panels for different documents', async () => {
    const uri1 = createDummyUri('/workspace/doc1.md');
    const uri2 = createDummyUri('/workspace/doc2.md');

    const panel1 = await manager.openPreview(uri1);
    const panel2 = await manager.openPreview(uri2);

    assert.strictEqual(createdPanels.length, 2);
    assert.notStrictEqual(panel1, panel2);
    assert.strictEqual(manager.panelCount, 2);
  });

  it('should remove the panel from manager when panel is disposed', async () => {
    const uri = createDummyUri('/workspace/test.md');
    const panel = (await manager.openPreview(uri)) as MockPreviewPanel;

    assert.strictEqual(manager.panelCount, 1);

    panel.triggerDispose();

    assert.strictEqual(manager.panelCount, 0);
    assert.strictEqual(manager.getPanel(uri), undefined);

    // Opening preview again should create a new panel
    const newPanel = await manager.openPreview(uri);
    assert.strictEqual(createdPanels.length, 2);
    assert.notStrictEqual(panel, newPanel);
  });

  it('should dispose all panels when manager.dispose is called', async () => {
    const uri1 = createDummyUri('/workspace/doc1.md');
    const uri2 = createDummyUri('/workspace/doc2.md');

    const panel1 = (await manager.openPreview(uri1)) as MockPreviewPanel;
    const panel2 = (await manager.openPreview(uri2)) as MockPreviewPanel;

    assert.strictEqual(manager.panelCount, 2);

    manager.dispose();

    assert.strictEqual(manager.panelCount, 0);
    assert.strictEqual(panel1.isDisposed, true);
    assert.strictEqual(panel2.isDisposed, true);
  });
});
