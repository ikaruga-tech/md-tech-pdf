import type * as vscode from 'vscode';
import type { ExtensionSettings } from '../config/settings.js';

export interface IPreviewPanelInstance {
  reveal(viewColumn?: vscode.ViewColumn): void;
  onDidDispose(listener: () => void): vscode.Disposable;
  dispose(): void;
}

export type PreviewPanelFactory = (
  documentUri: vscode.Uri,
  viewColumn?: vscode.ViewColumn,
  settings?: ExtensionSettings
) => IPreviewPanelInstance;

/**
 * Manages the lifecycle and singleton guarantee of PreviewPanel instances.
 * Ensures at most one preview panel per Markdown document URI.
 */
export class PreviewManager implements vscode.Disposable {
  private readonly panels = new Map<string, IPreviewPanelInstance>();
  private readonly panelFactory: PreviewPanelFactory;
  private isDisposed = false;

  constructor(panelFactory?: PreviewPanelFactory) {
    this.panelFactory =
      panelFactory ??
      ((documentUri, viewColumn, settings) => {
        // Lazy-require PreviewPanel and getExtensionSettings to prevent vscode runtime import in unit tests
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PreviewPanel } = require('./preview-panel.js');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getExtensionSettings } = require('../config/extension-settings.js');
        const extSettings = settings ?? getExtensionSettings();
        return PreviewPanel.create(documentUri, viewColumn, extSettings);
      });
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

    const panel = this.panelFactory(documentUri, viewColumn, settings);

    this.panels.set(key, panel);

    panel.onDidDispose(() => {
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
   * Disposes all active preview panels and clears internal state.
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;

    for (const panel of this.panels.values()) {
      panel.dispose();
    }

    this.panels.clear();
  }
}
