import * as path from 'node:path';
import * as vscode from 'vscode';
import { type ExtensionSettings, getExtensionSettings } from '../config/extension-settings.js';
import { getErrorMessage } from '../utils/error-utils.js';
import { buildPreviewCsp } from './csp-builder.js';
import { buildPageDimensionStyle, getPreviewBaseStyle } from './preview-style.js';
import { createResourceUrlTransformer } from './resource-resolver.js';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Resolves local resource roots according to Least Privilege principle.
 * Limits file access to the directory containing the Markdown document,
 * plus the workspace folder root if the document belongs to a workspace (allowing relative parent assets within workspace).
 */
export function resolveLocalResourceRoots(documentUri: vscode.Uri): vscode.Uri[] {
  const docDirUri = vscode.Uri.file(path.dirname(documentUri.fsPath));
  if (documentUri.scheme === 'file') {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
    if (workspaceFolder) {
      return [docDirUri, workspaceFolder.uri];
    }
  }
  return [docDirUri];
}

let previewOutputChannel: vscode.OutputChannel | undefined;

export function getPreviewOutputChannel(): vscode.OutputChannel {
  if (!previewOutputChannel) {
    previewOutputChannel = vscode.window.createOutputChannel('md-tech-pdf');
  }
  return previewOutputChannel;
}

export interface IDiagramRenderCache {
  get(key: string): string | undefined;
  set(key: string, svg: string): void;
  has?(key: string): boolean;
  delete?(key: string): boolean;
  clear?(): void;
  readonly size?: number;
}

export interface PreviewRenderOptions {
  settings?: ExtensionSettings;
  diagramCache?: IDiagramRenderCache;
  isBackgroundRefresh?: boolean;
}

/**
 * Manages an individual WebviewPanel for a Markdown document preview.
 * Encapsulates Core HtmlRenderer invocation, error handling, and lifecycle.
 */
export class PreviewPanel implements vscode.Disposable {
  public static readonly viewType = 'md-tech-pdf.preview';

  private readonly panel: vscode.WebviewPanel;
  private readonly documentUri: vscode.Uri;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly onDisposeEmitter = new vscode.EventEmitter<void>();
  private readonly outputChannel: vscode.OutputChannel;
  private hasWarnedDiagramError = false;
  private renderGeneration = 0;

  public readonly onDidDispose = this.onDisposeEmitter.event;

  private constructor(
    panel: vscode.WebviewPanel,
    documentUri: vscode.Uri,
    outputChannel?: vscode.OutputChannel
  ) {
    this.panel = panel;
    this.documentUri = documentUri;
    this.outputChannel = outputChannel ?? getPreviewOutputChannel();

    this.panel.onDidDispose(
      () => {
        this.dispose();
      },
      null,
      this.disposables
    );
  }

  /**
   * Creates a new PreviewPanel instance and triggers initial rendering.
   */
  public static create(
    documentUri: vscode.Uri,
    viewColumn: vscode.ViewColumn = vscode.ViewColumn.Beside,
    settingsOrOptions?: ExtensionSettings | PreviewRenderOptions
  ): PreviewPanel {
    const fileName = path.basename(documentUri.fsPath);
    const localResourceRoots = resolveLocalResourceRoots(documentUri);

    const panel = vscode.window.createWebviewPanel(
      PreviewPanel.viewType,
      `Preview: ${fileName}`,
      viewColumn,
      {
        enableScripts: false,
        localResourceRoots,
      }
    );

    const instance = new PreviewPanel(panel, documentUri);
    instance.showLoading();
    void instance.render(settingsOrOptions);

    return instance;
  }

  /**
   * Reveals the existing webview panel in the specified column.
   */
  public reveal(viewColumn?: vscode.ViewColumn): void {
    this.panel.reveal(viewColumn ?? this.panel.viewColumn ?? vscode.ViewColumn.Beside);
  }

  /**
   * Triggers an automatic or background refresh of the preview.
   * Does not replace existing content with a loading indicator to avoid flickering.
   */
  public async refresh(options?: PreviewRenderOptions): Promise<void> {
    return this.render({
      ...options,
      isBackgroundRefresh: true,
    });
  }

  /**
   * Displays a lightweight loading state while rendering is in progress.
   */
  private showLoading(): void {
    const csp = buildPreviewCsp(this.panel.webview.cspSource);
    this.panel.webview.html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  ${csp}
  <meta charset="UTF-8">
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background-color: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-descriptionForeground, #888888);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div>Rendering preview...</div>
</body>
</html>
`;
  }

  /**
   * Reads Markdown content, parses Front Matter, and generates the preview HTML.
   * Tracks generation ID to discard stale render results from previous asynchronous requests.
   */
  public async render(
    settingsOrOptions?: ExtensionSettings | PreviewRenderOptions
  ): Promise<void> {
    const options: PreviewRenderOptions =
      settingsOrOptions && 'plantuml' in settingsOrOptions
        ? { settings: settingsOrOptions as ExtensionSettings }
        : ((settingsOrOptions as PreviewRenderOptions) ?? {});

    const extSettings = options.settings ?? getExtensionSettings();
    const isBackgroundRefresh = options.isBackgroundRefresh ?? false;
    const currentGeneration = ++this.renderGeneration;

    try {
      // Prefer current in-memory text if document is open in an editor
      let markdownContent: string;
      const openDoc = vscode.workspace.textDocuments.find(
        (doc) => doc.uri.toString() === this.documentUri.toString()
      );

      if (openDoc) {
        markdownContent = openDoc.getText();
      } else {
        const fileBytes = await vscode.workspace.fs.readFile(this.documentUri);
        markdownContent = Buffer.from(fileBytes).toString('utf-8');
      }

      // Check if a newer render request superseded this one while awaiting file reading
      if (currentGeneration !== this.renderGeneration) {
        return;
      }

      const { HtmlRenderer, parseFrontMatter } = await import('md-tech-pdf');
      const { options: docOptions } = parseFrontMatter(markdownContent);
      const baseName = path.basename(
        this.documentUri.fsPath,
        path.extname(this.documentUri.fsPath)
      );

      const cspTag = buildPreviewCsp(this.panel.webview.cspSource);
      const customCss = [
        getPreviewBaseStyle(),
        buildPageDimensionStyle(docOptions.pdf),
      ].join('\n');

      const resourceUrlTransformer = createResourceUrlTransformer(
        this.documentUri,
        this.panel.webview,
        this.outputChannel
      );

      let diagramErrorCount = 0;
      const renderer = new HtmlRenderer();
      const html = await renderer.render(markdownContent, {
        title: baseName,
        customCss,
        extraHeadHtml: cspTag,
        target: 'preview',
        resourceUrlTransformer,
        diagramCache: options.diagramCache,
        defaultOptions: {
          plantuml: extSettings.plantuml,
        },
        onDiagramError: (event) => {
          diagramErrorCount++;
          const typeName = event.type === 'plantuml' ? 'PlantUML' : 'Mermaid';
          const lineInfo = event.line ? ` (line ${event.line})` : '';
          this.outputChannel.appendLine(
            `[${typeName}] Document: ${path.basename(this.documentUri.fsPath)}${lineInfo}`
          );
          this.outputChannel.appendLine(`Diagram #${event.index} rendering error:`);
          this.outputChannel.appendLine(event.message.trim());
          this.outputChannel.appendLine('----------------------------------------');
        },
        onCacheEvent: (_event: any) => {
          // Suppressed in standard preview to avoid cluttering the Output channel during typing.
        },
      });

      // Discard stale render result if a newer render was triggered during async diagram processing
      if (currentGeneration !== this.renderGeneration) {
        return;
      }

      this.panel.webview.html = html;

      if (!isBackgroundRefresh && diagramErrorCount > 0 && !this.hasWarnedDiagramError) {
        this.hasWarnedDiagramError = true;
        void vscode.window.showWarningMessage(
          'md-tech-pdf: Some diagrams could not be rendered. See "md-tech-pdf" Output for details.'
        );
      }
    } catch (error: unknown) {
      if (currentGeneration !== this.renderGeneration) {
        return;
      }
      console.error('[md-tech-pdf] Preview rendering failed', error);
      this.showError(error);
    }
  }

  /**
   * Displays error notification in webview without disposing the panel.
   */
  private showError(error: unknown): void {
    const errorMessage = getErrorMessage(error);
    const csp = buildPreviewCsp(this.panel.webview.cspSource);

    this.panel.webview.html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  ${csp}
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family, sans-serif);
      background-color: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-foreground, #cccccc);
      padding: 2rem;
      margin: 0;
    }
    .error-card {
      background-color: var(--vscode-editorWidget-background, #252526);
      border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
      border-radius: 6px;
      padding: 1.5rem;
      max-width: 600px;
      margin: 2rem auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    h2 {
      margin-top: 0;
      color: var(--vscode-errorForeground, #f48771);
      font-size: 1.2rem;
    }
    p {
      margin-bottom: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 0.95rem;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="error-card">
    <h2>Preview generation failed</h2>
    <p>${escapeHtml(errorMessage)}</p>
  </div>
</body>
</html>
`;
    void vscode.window.showErrorMessage(`md-tech-pdf Preview: ${errorMessage}`);
  }

  public dispose(): void {
    this.onDisposeEmitter.fire();
    this.onDisposeEmitter.dispose();

    while (this.disposables.length) {
      const item = this.disposables.pop();
      if (item) {
        item.dispose();
      }
    }

    this.panel.dispose();
  }
}
