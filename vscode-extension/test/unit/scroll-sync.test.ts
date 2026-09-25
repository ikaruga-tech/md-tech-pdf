import * as assert from 'node:assert/strict';
import './mock-vscode.js';
import * as vscode from 'vscode';
import { type IPreviewPanelInstance, PreviewManager } from '../../src/preview/preview-manager.js';

class MockScrollSyncPanel implements IPreviewPanelInstance {
  public scrolledLines: number[] = [];
  public isDisposed = false;
  private disposeListeners: Array<() => void> = [];
  private previewScrollListeners: Array<(line: number) => void> = [];

  public reveal(_viewColumn?: vscode.ViewColumn): void {}
  public async refresh(): Promise<void> {}

  public scrollToLine(line: number): void {
    this.scrolledLines.push(line);
  }

  public onDidPreviewScroll(listener: (line: number) => void): vscode.Disposable {
    this.previewScrollListeners.push(listener);
    return {
      dispose: () => {
        this.previewScrollListeners = this.previewScrollListeners.filter((l) => l !== listener);
      },
    };
  }

  public triggerPreviewScroll(line: number): void {
    for (const listener of this.previewScrollListeners) {
      listener(line);
    }
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

function createVisibleRangeEventMock(
  uriString: string,
  startLine: number,
  endLine: number
): vscode.TextEditorVisibleRangesChangeEvent {
  return {
    textEditor: {
      document: {
        uri: vscode.Uri.file(uriString),
        fileName: uriString,
      } as vscode.TextDocument,
    } as vscode.TextEditor,
    visibleRanges: [
      new vscode.Range(new vscode.Position(startLine, 0), new vscode.Position(endLine, 0)),
    ],
  };
}

describe('Editor to Preview Scroll Synchronization', () => {
  let createdPanels: MockScrollSyncPanel[];
  let manager: PreviewManager;

  beforeEach(() => {
    createdPanels = [];
    manager = new PreviewManager((_uri, _col, _options) => {
      const panel = new MockScrollSyncPanel();
      createdPanels.push(panel);
      return panel;
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  it('should trigger scrollToLine on panel with 1-indexed line after debounce', async () => {
    const docPath = '/workspace/docs/guide.md';
    const docUri = vscode.Uri.file(docPath);
    await manager.openPreview(docUri);

    const event = createVisibleRangeEventMock(docPath, 9, 25); // 0-indexed line 9 -> line 10
    manager.handleVisibleRangesChange(event);

    assert.strictEqual(createdPanels[0].scrolledLines.length, 0);

    await new Promise((resolve) => setTimeout(resolve, 80));

    assert.strictEqual(createdPanels[0].scrolledLines.length, 1);
    assert.strictEqual(createdPanels[0].scrolledLines[0], 10);
  });

  it('should debounce rapid visible range changes and call scrollToLine only with latest line', async () => {
    const docPath = '/workspace/docs/guide.md';
    const docUri = vscode.Uri.file(docPath);
    await manager.openPreview(docUri);

    manager.handleVisibleRangesChange(createVisibleRangeEventMock(docPath, 5, 20));
    manager.handleVisibleRangesChange(createVisibleRangeEventMock(docPath, 15, 30));
    manager.handleVisibleRangesChange(createVisibleRangeEventMock(docPath, 24, 40));

    await new Promise((resolve) => setTimeout(resolve, 80));

    assert.strictEqual(createdPanels[0].scrolledLines.length, 1);
    assert.strictEqual(createdPanels[0].scrolledLines[0], 25); // line 24 + 1
  });

  it('should ignore visible range events for documents without an active preview panel', async () => {
    const docPath = '/workspace/docs/other.md';
    const event = createVisibleRangeEventMock(docPath, 10, 30);

    manager.handleVisibleRangesChange(event);

    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.strictEqual(createdPanels.length, 0);
  });

  it('should cancel pending scroll sync timer when panel is disposed before debounce fires', async () => {
    const docPath = '/workspace/docs/guide.md';
    const docUri = vscode.Uri.file(docPath);
    const panel = await manager.openPreview(docUri);

    manager.handleVisibleRangesChange(createVisibleRangeEventMock(docPath, 19, 35));
    panel.dispose();

    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.strictEqual(createdPanels[0].scrolledLines.length, 0);
  });

  it('should reveal corresponding line in editor when preview is scrolled (Preview -> Editor)', async () => {
    const docPath = '/workspace/docs/guide.md';
    const docUri = vscode.Uri.file(docPath);
    const panel = (await manager.openPreview(docUri)) as MockScrollSyncPanel;

    let revealedRange: vscode.Range | undefined;
    let revealType: number | undefined;

    const mockEditor = {
      document: {
        uri: docUri,
        fileName: docPath,
      },
      revealRange: (range: vscode.Range, type: number) => {
        revealedRange = range;
        revealType = type;
      },
    };

    (vscode.window as any).visibleTextEditors = [mockEditor];

    panel.triggerPreviewScroll(15);

    assert.ok(revealedRange);
    assert.strictEqual(revealedRange.start.line, 14); // 0-indexed line 14 for line 15
    assert.strictEqual(revealType, (vscode as any).TextEditorRevealType.AtTop);

    (vscode.window as any).visibleTextEditors = [];
  });
});
