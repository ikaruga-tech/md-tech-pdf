import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { type ExtensionSettings, getExtensionSettings } from '../config/extension-settings.js';
import { getErrorMessage } from '../utils/error-utils.js';
import { buildPreviewCsp } from './csp-builder.js';
import {
  buildPageDimensionStyle,
  getPreviewBaseStyle,
  getPreviewToolbarHtml,
} from './preview-style.js';
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
 * the extension directory (for preview client scripts),
 * plus the workspace folder root if the document belongs to a workspace (allowing relative parent assets within workspace).
 */
export function resolveLocalResourceRoots(
  documentUri: vscode.Uri,
  extensionUri?: vscode.Uri
): vscode.Uri[] {
  const roots: vscode.Uri[] = [];
  const docDirUri = vscode.Uri.file(path.dirname(documentUri.fsPath));
  roots.push(docDirUri);

  if (documentUri.scheme === 'file') {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder?.(documentUri);
    if (workspaceFolder) {
      roots.push(workspaceFolder.uri);
    }
  }

  if (extensionUri) {
    roots.push(extensionUri);
  }

  return roots;
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
  bypassCache?: boolean;
  extensionUri?: vscode.Uri;
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
  private readonly onPreviewScrollEmitter = new vscode.EventEmitter<number>();
  private readonly outputChannel: vscode.OutputChannel;
  private readonly extensionUri?: vscode.Uri;
  private diagramCache?: IDiagramRenderCache;
  private hasWarnedDiagramError = false;
  private renderGeneration = 0;
  private lastScrollY = 0;
  private lastScrollRatio = 0;

  public readonly onDidDispose = this.onDisposeEmitter.event;
  public readonly onDidPreviewScroll = this.onPreviewScrollEmitter.event;

  private constructor(
    panel: vscode.WebviewPanel,
    documentUri: vscode.Uri,
    outputChannel?: vscode.OutputChannel,
    extensionUri?: vscode.Uri,
    diagramCache?: IDiagramRenderCache
  ) {
    this.panel = panel;
    this.documentUri = documentUri;
    this.outputChannel = outputChannel ?? getPreviewOutputChannel();
    this.extensionUri = extensionUri;
    this.diagramCache = diagramCache;

    this.panel.onDidDispose(
      () => {
        this.dispose();
      },
      null,
      this.disposables
    );

    this.panel.webview.onDidReceiveMessage(
      (message: unknown) => {
        if (!message || typeof message !== 'object') {
          return;
        }
        const msg = message as Record<string, unknown>;
        if (msg.type === 'didScroll') {
          if (typeof msg.scrollY === 'number') {
            this.lastScrollY = msg.scrollY;
          }
          if (typeof msg.scrollRatio === 'number') {
            this.lastScrollRatio = msg.scrollRatio;
          }
        } else if (msg.type === 'previewScroll') {
          if (typeof msg.line === 'number') {
            this.onPreviewScrollEmitter.fire(msg.line);
          }
        } else if (msg.type === 'reload') {
          void this.render({ bypassCache: true });
        } else if (msg.type === 'exportPdf') {
          void vscode.commands.executeCommand('md-tech-pdf.exportPdf', this.documentUri);
        }
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
    const options: PreviewRenderOptions =
      settingsOrOptions && 'plantuml' in settingsOrOptions
        ? { settings: settingsOrOptions as ExtensionSettings }
        : ((settingsOrOptions as PreviewRenderOptions) ?? {});

    const localResourceRoots = resolveLocalResourceRoots(documentUri, options.extensionUri);

    const panel = vscode.window.createWebviewPanel(
      PreviewPanel.viewType,
      `Preview: ${fileName}`,
      viewColumn,
      {
        enableScripts: true,
        localResourceRoots,
      }
    );

    const instance = new PreviewPanel(
      panel,
      documentUri,
      undefined,
      options.extensionUri,
      options.diagramCache
    );
    instance.showLoading();
    void instance.render(options);

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
   * Scrolls the preview webview to the specified source line.
   */
  public scrollToLine(line: number): void {
    void this.panel.webview.postMessage({
      type: 'scrollToLine',
      line,
    });
  }

  /**
   * Displays a lightweight loading state while rendering is in progress.
   */
  private showLoading(): void {
    const nonce = crypto.randomBytes(16).toString('base64');
    const csp = buildPreviewCsp(this.panel.webview.cspSource, nonce);
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
  public async render(settingsOrOptions?: ExtensionSettings | PreviewRenderOptions): Promise<void> {
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

      const nonce = crypto.randomBytes(16).toString('base64');
      const cspTag = buildPreviewCsp(this.panel.webview.cspSource, nonce);
      const customCss = [getPreviewBaseStyle(), buildPageDimensionStyle(docOptions.pdf)].join('\n');

      const resourceUrlTransformer = createResourceUrlTransformer(
        this.documentUri,
        this.panel.webview,
        this.outputChannel
      );

      const effectiveCache = options.bypassCache
        ? undefined
        : (options.diagramCache ?? this.diagramCache);

      const docDir = path.dirname(this.documentUri.fsPath);
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(this.documentUri);
      const resolvedSettingsStyles = extSettings.styles.map((s) => {
        if (path.isAbsolute(s)) {
          return s;
        }
        if (workspaceFolder) {
          return path.resolve(workspaceFolder.uri.fsPath, s);
        }
        return path.resolve(docDir, s);
      });

      let diagramErrorCount = 0;
      const renderer = new HtmlRenderer();
      const html = await renderer.render(markdownContent, {
        title: baseName,
        basePath: docDir,
        customCss,
        extraHeadHtml: cspTag,
        target: 'preview',
        resourceUrlTransformer,
        diagramCache: effectiveCache,
        defaultOptions: {
          plantuml: extSettings.plantuml,
          style: {
            css: resolvedSettingsStyles.length > 0 ? resolvedSettingsStyles : undefined,
          },
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
        onCacheEvent: (_event: unknown) => {
          // Suppressed in standard preview to avoid cluttering the Output channel during typing.
        },
      });

      // Discard stale render result if a newer render was triggered during async diagram processing
      if (currentGeneration !== this.renderGeneration) {
        return;
      }

      let clientScriptUri: vscode.Uri;
      if (this.extensionUri) {
        clientScriptUri = this.panel.webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'preview', 'client', 'preview-client.js')
        );
      } else {
        clientScriptUri = this.panel.webview.asWebviewUri(
          vscode.Uri.file(path.join(__dirname, 'client', 'preview-client.js'))
        );
      }

      const clientScriptTag = [
        `<script nonce="${nonce}">var exports = exports || {};</script>`,
        `<script nonce="${nonce}" src="${clientScriptUri}"></script>`,
      ].join('\n');
      const toolbarHtml = getPreviewToolbarHtml();

      let finalHtml = html;
      if (finalHtml.includes('<body')) {
        finalHtml = finalHtml.replace(
          /<body([^>]*)>/,
          `<body$1>\n${toolbarHtml}<div class="preview-content-wrapper">`
        );
      } else {
        finalHtml = `${toolbarHtml}<div class="preview-content-wrapper">\n${finalHtml}`;
      }
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `</div>\n${clientScriptTag}\n</body>`);
      } else {
        finalHtml = `${finalHtml}</div>\n${clientScriptTag}`;
      }

      this.panel.webview.html = finalHtml;

      // Restore scroll position to Webview if previous position exists
      if (this.lastScrollY > 0) {
        void this.panel.webview.postMessage({
          type: 'restoreScroll',
          scrollY: this.lastScrollY,
        });
      }

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
    const nonce = crypto.randomBytes(16).toString('base64');
    const csp = buildPreviewCsp(this.panel.webview.cspSource, nonce);

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
    this.onPreviewScrollEmitter.dispose();

    while (this.disposables.length) {
      const item = this.disposables.pop();
      if (item) {
        item.dispose();
      }
    }

    this.panel.dispose();
  }
}
