import * as vscode from 'vscode';
import { getExtensionSettings } from '../config/extension-settings.js';
import type { ExtensionSettings } from '../config/settings.js';
import type { IDiagramRenderCache, PreviewRenderOptions } from './preview-panel.js';

/**
 * In-memory diagram cache implementation for the VS Code extension session.
 */
export class ExtensionDiagramCache implements IDiagramRenderCache {
  private readonly entries = new Map<string, string>();

  public get(key: string): string | undefined {
    return this.entries.get(key);
  }

  public set(key: string, svg: string): void {
    this.entries.set(key, svg);
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

export interface IPreviewPanelInstance {
  reveal(viewColumn?: vscode.ViewColumn): void;
  refresh(options?: PreviewRenderOptions): Promise<void>;
  scrollToLine?(line: number): void;
  onDidDispose(listener: () => void): vscode.Disposable;
  dispose(): void;
}

export type PreviewPanelFactory = (
  documentUri: vscode.Uri,
  viewColumn?: vscode.ViewColumn,
  settingsOrOptions?: ExtensionSettings | PreviewRenderOptions
) => IPreviewPanelInstance;

/**
 * Manages the lifecycle, singleton guarantee, and automatic refresh of PreviewPanel instances.
 * Ensures at most one preview panel per Markdown document URI and maintains an in-memory diagram cache.
 */
export class PreviewManager implements vscode.Disposable {
  private readonly panels = new Map<string, IPreviewPanelInstance>();
  private readonly panelFactory: PreviewPanelFactory;
  private readonly diagramCache = new ExtensionDiagramCache();
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly scrollSyncTimers = new Map<string, NodeJS.Timeout>();
  private readonly disposables: vscode.Disposable[] = [];
  private isDisposed = false;

  constructor(
    panelFactory?: PreviewPanelFactory,
    private readonly extensionUri?: vscode.Uri
  ) {
    this.panelFactory =
      panelFactory ??
      ((documentUri, viewColumn, settingsOrOptions) => {
        // Lazy-require PreviewPanel to prevent circular references and runtime issues in unit tests
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PreviewPanel } = require('./preview-panel.js');
        const extSettings =
          settingsOrOptions && 'plantuml' in settingsOrOptions
            ? (settingsOrOptions as ExtensionSettings)
            : getExtensionSettings();

        return PreviewPanel.create(documentUri, viewColumn, {
          settings: extSettings,
          diagramCache: this.diagramCache,
          extensionUri: this.extensionUri,
        });
      });

    this.registerListeners();
  }

  /**
   * Registers VS Code workspace event listeners for onSave and onType automatic refresh.
   */
  private registerListeners(): void {
    if (vscode.workspace?.onDidSaveTextDocument) {
      this.disposables.push(
        vscode.workspace.onDidSaveTextDocument((doc) => this.handleDocumentSave(doc))
      );
    }
    if (vscode.workspace?.onDidChangeTextDocument) {
      this.disposables.push(
        vscode.workspace.onDidChangeTextDocument((e) => this.handleDocumentChange(e))
      );
    }
    if (vscode.window?.onDidChangeTextEditorVisibleRanges) {
      this.disposables.push(
        vscode.window.onDidChangeTextEditorVisibleRanges((e) => this.handleVisibleRangesChange(e))
      );
    }
  }

  /**
   * Handles document save events. Triggers immediate refresh if onSave or onType is configured.
   */
  public handleDocumentSave(doc: vscode.TextDocument): void {
    const key = doc.uri.toString();
    const panel = this.panels.get(key);
    if (!panel) {
      return;
    }

    const settings = getExtensionSettings();
    if (settings.preview.refresh === 'onSave' || settings.preview.refresh === 'onType') {
      this.clearDebounceTimer(key);
      void panel.refresh({
        settings,
        diagramCache: this.diagramCache,
      });
    }
  }

  /**
   * Handles document change events. Triggers debounced refresh if onType is configured.
   */
  public handleDocumentChange(e: vscode.TextDocumentChangeEvent): void {
    const key = e.document.uri.toString();
    const panel = this.panels.get(key);
    if (!panel) {
      return;
    }

    const settings = getExtensionSettings();
    if (settings.preview.refresh === 'onType') {
      this.clearDebounceTimer(key);
      const timer = setTimeout(() => {
        this.debounceTimers.delete(key);
        void panel.refresh({
          settings,
          diagramCache: this.diagramCache,
        });
      }, 500);
      this.debounceTimers.set(key, timer);
    }
  }

  /**
   * Handles editor visible range changes for real-time scroll synchronization.
   */
  public handleVisibleRangesChange(e: vscode.TextEditorVisibleRangesChangeEvent): void {
    if (this.isDisposed || !e.visibleRanges || e.visibleRanges.length === 0) {
      return;
    }

    const key = e.textEditor.document.uri.toString();
    const panel = this.panels.get(key);
    if (!panel || !panel.scrollToLine) {
      return;
    }

    const topVisibleLine = e.visibleRanges[0].start.line + 1;

    this.clearScrollSyncTimer(key);
    const timer = setTimeout(() => {
      this.scrollSyncTimers.delete(key);
      panel.scrollToLine?.(topVisibleLine);
    }, 50);
    this.scrollSyncTimers.set(key, timer);
  }

  /**
   * Clears any active debounce timer for a specific document.
   */
  private clearDebounceTimer(key: string): void {
    const timer = this.debounceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(key);
    }
  }

  /**
   * Clears any active scroll sync timer for a specific document.
   */
  private clearScrollSyncTimer(key: string): void {
    const timer = this.scrollSyncTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.scrollSyncTimers.delete(key);
    }
  }

  /**
   * Opens a preview panel for the specified document URI.
   * If a panel already exists for the document, reveals it; otherwise, creates a new one.
   */
  public async openPreview(
    documentUri: vscode.Uri,
    viewColumn?: vscode.ViewColumn,
    settings?: ExtensionSettings
  ): Promise<IPreviewPanelInstance> {
    if (this.isDisposed) {
      throw new Error('PreviewManager has been disposed.');
    }

    const key = documentUri.toString();
    const existing = this.panels.get(key);

    if (existing) {
      existing.reveal(viewColumn);
      return existing;
    }

    const panel = this.panelFactory(documentUri, viewColumn, {
      settings: settings ?? getExtensionSettings(),
      diagramCache: this.diagramCache,
    });

    this.panels.set(key, panel);

    panel.onDidDispose(() => {
      this.clearDebounceTimer(key);
      this.clearScrollSyncTimer(key);
      this.panels.delete(key);
    });

    return panel;
  }

  /**
   * Retrieves an existing panel for the document URI, if any.
   */
  public getPanel(documentUri: vscode.Uri): IPreviewPanelInstance | undefined {
    return this.panels.get(documentUri.toString());
  }

  /**
   * Number of currently active preview panels.
   */
  public get panelCount(): number {
    return this.panels.size;
  }

  /**
   * Access to the underlying DiagramRenderCache instance (for testing/diagnostics).
   */
  public get cache(): ExtensionDiagramCache {
    return this.diagramCache;
  }

  /**
   * Disposes all active preview panels, timers, listeners, and clears cache.
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    for (const timer of this.scrollSyncTimers.values()) {
      clearTimeout(timer);
    }
    this.scrollSyncTimers.clear();

    while (this.disposables.length) {
      const item = this.disposables.pop();
      if (item) {
        item.dispose();
      }
    }

    for (const panel of this.panels.values()) {
      panel.dispose();
    }

    this.panels.clear();
    this.diagramCache.clear();
  }
}
