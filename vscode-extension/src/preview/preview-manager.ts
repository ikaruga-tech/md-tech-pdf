import * as vscode from 'vscode';
import { getExtensionSettings } from '../config/extension-settings.js';
import type { ExtensionSettings } from '../config/settings.js';
import type { IDiagramRenderCache, PreviewRenderOptions } from './preview-panel.js';

import { PersistentDiagramCache } from './persistent-diagram-cache.js';

export { PersistentDiagramCache };

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
  onDidPreviewScroll?(listener: (line: number) => void): vscode.Disposable;
  onDidUpdateScrollSyncConfig?(
    listener: (config: { delay?: number; behavior?: 'smooth' | 'instant' }) => void
  ): vscode.Disposable;
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
  private readonly diagramCache: IDiagramRenderCache;
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly scrollSyncTimers = new Map<string, NodeJS.Timeout>();
  private readonly documentSyncDelays = new Map<string, number>();
  private readonly disposables: vscode.Disposable[] = [];
  private isDisposed = false;
  private isMutedFromPreviewSync = false;
  private mutePreviewSyncTimer: NodeJS.Timeout | undefined;
  private isMutedFromEditorSync = false;
  private muteEditorSyncTimer: NodeJS.Timeout | undefined;

  constructor(
    panelFactory?: PreviewPanelFactory,
    private readonly extensionUri?: vscode.Uri,
    diagramCache?: IDiagramRenderCache
  ) {
    this.diagramCache = diagramCache ?? new PersistentDiagramCache();
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
      }, settings.preview.debounceDelay);
      this.debounceTimers.set(key, timer);
    }
  }

  /**
   * Handles editor visible range changes for real-time scroll synchronization (Editor -> Preview).
   */
  public handleVisibleRangesChange(e: vscode.TextEditorVisibleRangesChangeEvent): void {
    if (
      this.isDisposed ||
      this.isMutedFromPreviewSync ||
      !e.visibleRanges ||
      e.visibleRanges.length === 0
    ) {
      return;
    }

    const key = e.textEditor.document.uri.toString();
    const panel = this.panels.get(key);
    if (!panel || !panel.scrollToLine) {
      return;
    }

    const topVisibleLine = e.visibleRanges[0].start.line + 1;

    const docSyncDelay =
      this.documentSyncDelays.get(key) ?? getExtensionSettings().preview.scrollSync?.delay ?? 50;
    const muteDuration = Math.max(150, docSyncDelay * 3);

    this.clearScrollSyncTimer(key);
    const timer = setTimeout(() => {
      this.scrollSyncTimers.delete(key);

      this.isMutedFromEditorSync = true;
      if (this.muteEditorSyncTimer) {
        clearTimeout(this.muteEditorSyncTimer);
      }
      this.muteEditorSyncTimer = setTimeout(() => {
        this.isMutedFromEditorSync = false;
      }, muteDuration);

      panel.scrollToLine?.(topVisibleLine);
    }, docSyncDelay);
    this.scrollSyncTimers.set(key, timer);
  }

  /**
   * Handles preview scroll events for real-time scroll synchronization (Preview -> Editor).
   */
  public handlePreviewScroll(documentUri: vscode.Uri, line: number): void {
    if (this.isDisposed || this.isMutedFromEditorSync) {
      return;
    }

    const docUriStr = documentUri.toString();
    const editor = vscode.window.visibleTextEditors?.find(
      (ed) => ed.document.uri.toString() === docUriStr
    );
    if (!editor) {
      return;
    }

    this.isMutedFromPreviewSync = true;
    if (this.mutePreviewSyncTimer) {
      clearTimeout(this.mutePreviewSyncTimer);
    }

    const targetLine = Math.max(0, line - 1);
    const range = new vscode.Range(targetLine, 0, targetLine, 0);
    editor.revealRange(range, vscode.TextEditorRevealType.AtTop);

    this.mutePreviewSyncTimer = setTimeout(() => {
      this.isMutedFromPreviewSync = false;
    }, 400);
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

    if (panel.onDidPreviewScroll) {
      const scrollSub = panel.onDidPreviewScroll((line) => {
        this.handlePreviewScroll(documentUri, line);
      });
      panel.onDidDispose(() => {
        scrollSub.dispose();
      });
    }

    if (panel.onDidUpdateScrollSyncConfig) {
      const configSub = panel.onDidUpdateScrollSyncConfig((config) => {
        if (typeof config.delay === 'number') {
          this.documentSyncDelays.set(key, config.delay);
        }
      });
      panel.onDidDispose(() => {
        configSub.dispose();
      });
    }

    panel.onDidDispose(() => {
      this.clearDebounceTimer(key);
      this.clearScrollSyncTimer(key);
      this.documentSyncDelays.delete(key);
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
  public get cache(): IDiagramRenderCache {
    return this.diagramCache;
  }

  /**
   * Clears in-memory diagram cache and deletes persisted SVG cache files from disk.
   */
  public async clearCache(): Promise<void> {
    if (this.diagramCache instanceof PersistentDiagramCache) {
      await this.diagramCache.clearDisk();
    }
    this.diagramCache.clear?.();
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

    if (this.mutePreviewSyncTimer) {
      clearTimeout(this.mutePreviewSyncTimer);
    }
    if (this.muteEditorSyncTimer) {
      clearTimeout(this.muteEditorSyncTimer);
    }

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
    this.diagramCache.clear?.();
  }
}
