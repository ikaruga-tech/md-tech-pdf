export interface PdfMarginOptions {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface PdfDocumentOptions {
  format?: 'A4';
  landscape?: boolean;
  margin?: PdfMarginOptions;
}

/**
 * Standard page format dimensions in physical units (mm).
 * Synchronized with Core document-options.ts PAGE_FORMAT_DIMENSIONS.
 */
export const PAGE_FORMAT_DIMENSIONS: Record<string, { width: string; height: string }> = {
  A4: {
    width: '210mm',
    height: '297mm',
  },
} as const;

/**
 * Base styles for the Preview Webview canvas and paper sheet container.
 * Uses VS Code theme background for the canvas while maintaining a clean
 * white paper sheet layout matching the physical print appearance.
 */
export function getPreviewBaseStyle(): string {
  return `
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;
}

body {
  background-color: var(--vscode-editor-background, #1e1e1e);
}

.preview-toolbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background-color: var(--vscode-editor-background, #1e1e1e);
  border-bottom: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
  font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  font-size: 12px;
  color: var(--vscode-foreground, #cccccc);
}

.preview-toolbar-left, .preview-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: var(--vscode-button-secondaryBackground, #3a3d41);
  color: var(--vscode-button-secondaryForeground, #ffffff);
  border: 1px solid var(--vscode-button-border, transparent);
  border-radius: 3px;
  padding: 3px 8px;
  cursor: pointer;
  font-size: 11px;
  line-height: 16px;
  user-select: none;
  transition: background-color 0.1s ease;
}

.toolbar-btn:hover {
  background-color: var(--vscode-button-secondaryHoverBackground, #45494e);
}

.toolbar-btn-primary {
  background-color: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
}

.toolbar-btn-primary:hover {
  background-color: var(--vscode-button-hoverBackground, #1177bb);
}

.toolbar-btn-active {
  background-color: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
}

.toolbar-btn-active:hover {
  background-color: var(--vscode-button-hoverBackground, #1177bb);
}

.toolbar-select {
  background-color: var(--vscode-dropdown-background, #252526);
  color: var(--vscode-dropdown-foreground, #cccccc);
  border: 1px solid var(--vscode-dropdown-border, #3c3c3c);
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 11px;
  cursor: pointer;
  outline: none;
}

.toolbar-label {
  font-size: 11px;
  color: var(--vscode-foreground, #cccccc);
  opacity: 0.85;
  user-select: none;
  margin-left: 4px;
}

.preview-content-wrapper {
  width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
}

.md-tech-pdf-preview-canvas {
  box-sizing: border-box;
  min-height: calc(100vh - 36px);
  padding: 24px 16px;
  display: flex;
  justify-content: safe center;
  align-items: flex-start;
  background-color: var(--vscode-editor-background, #1e1e1e);
  width: max-content;
  min-width: 100%;
}

.md-tech-pdf-preview-page {
  box-sizing: border-box;
  background-color: #ffffff;
  color: #24292f;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  margin: 0;
  flex-shrink: 0;
}

/* Ensure paper sheet contents maintain high-contrast print colors irrespective of VS Code theme */
.md-tech-pdf-preview-page code {
  color: #1f2328 !important;
  background-color: #eff1f3 !important;
  border: 1px solid rgba(27, 31, 36, 0.15) !important;
  border-radius: 4px;
}

.md-tech-pdf-preview-page pre {
  color: #1f2328 !important;
  background-color: #f6f8fa !important;
  border: 1px solid #d0d7de !important;
}

.md-tech-pdf-preview-page pre code {
  color: #1f2328 !important;
  background-color: transparent !important;
  border: none !important;
}

.md-tech-pdf-preview-page blockquote {
  color: #4b5563 !important;
  background-color: #f8fafc !important;
  border-left-color: #0969da !important;
}

.md-tech-pdf-preview-page table th {
  background-color: #f1f5f9 !important;
  color: #1f2328 !important;
}

.md-tech-pdf-preview-page table td {
  color: #24292f !important;
}

.md-tech-pdf-preview-page table tr:nth-child(2n) {
  background-color: #f8fafc !important;
}

@media print {
  .preview-toolbar {
    display: none !important;
  }
  .md-tech-pdf-preview-canvas {
    padding: 0 !important;
    background: transparent !important;
  }
}
`;
}

export interface PreviewToolbarInitialSettings {
  syncEnabled?: boolean;
  syncBehavior?: 'smooth' | 'instant';
  syncDelay?: number;
  zoom?: 'fit' | '50%' | '75%' | '100%' | '125%' | '150%';
}

/**
 * Returns HTML markup for the Preview Toolbar.
 */
export function getPreviewToolbarHtml(initialSettings?: PreviewToolbarInitialSettings): string {
  const syncEnabled = initialSettings?.syncEnabled ?? true;
  const syncBehavior = initialSettings?.syncBehavior ?? 'smooth';
  const syncDelay = initialSettings?.syncDelay ?? 50;
  const zoom = initialSettings?.zoom ?? 'fit';

  return `
<div class="preview-toolbar" role="toolbar" aria-label="Markdown Technical PDF Preview Toolbar" data-default-sync-enabled="${syncEnabled}" data-default-sync-anim="${syncBehavior}" data-default-sync-delay="${syncDelay}" data-default-zoom="${zoom}">
  <div class="preview-toolbar-left">
    <button id="btn-toolbar-reload" class="toolbar-btn" type="button" title="Reload preview bypassing diagram cache">
      <span>↻</span> Reload
    </button>
    <button id="btn-toolbar-sync" class="toolbar-btn ${syncEnabled ? 'toolbar-btn-active' : ''}" type="button" title="Toggle scroll synchronization with editor">
      <span>${syncEnabled ? '⇄' : '⇥'}</span> Sync: ${syncEnabled ? 'ON' : 'OFF'}
    </button>
    <label for="select-toolbar-sync-anim" class="toolbar-label">Anim:</label>
    <select id="select-toolbar-sync-anim" class="toolbar-select" title="Scroll animation behavior">
      <option value="smooth"${syncBehavior === 'smooth' ? ' selected' : ''}>Smooth</option>
      <option value="instant"${syncBehavior === 'instant' ? ' selected' : ''}>Instant</option>
    </select>
    <label for="select-toolbar-sync-delay" class="toolbar-label">Delay:</label>
    <select id="select-toolbar-sync-delay" class="toolbar-select" title="Scroll sync debounce delay">
      <option value="0"${syncDelay === 0 ? ' selected' : ''}>0ms</option>
      <option value="20"${syncDelay === 20 ? ' selected' : ''}>20ms</option>
      <option value="50"${syncDelay === 50 ? ' selected' : ''}>50ms</option>
      <option value="100"${syncDelay === 100 ? ' selected' : ''}>100ms</option>
    </select>
    <label for="select-toolbar-zoom" class="toolbar-label">Zoom:</label>
    <select id="select-toolbar-zoom" class="toolbar-select" title="Preview display zoom level">
      <option value="fit"${zoom === 'fit' ? ' selected' : ''}>Fit Width</option>
      <option value="50%"${zoom === '50%' ? ' selected' : ''}>50%</option>
      <option value="75%"${zoom === '75%' ? ' selected' : ''}>75%</option>
      <option value="100%"${zoom === '100%' ? ' selected' : ''}>100%</option>
      <option value="125%"${zoom === '125%' ? ' selected' : ''}>125%</option>
      <option value="150%"${zoom === '150%' ? ' selected' : ''}>150%</option>
    </select>
  </div>
  <div class="preview-toolbar-right">
    <button id="btn-toolbar-export" class="toolbar-btn toolbar-btn-primary" type="button" title="Export document to PDF directly">
      <span>📄</span> Export PDF
    </button>
  </div>
</div>
`;
}

/**
 * Resolves width and min-height based on paper format and orientation.
 */
export function resolvePaperDimensions(pdfOptions?: PdfDocumentOptions): {
  width: string;
  minHeight: string;
} {
  const isLandscape = pdfOptions?.landscape === true;
  const format = pdfOptions?.format ?? 'A4';
  const baseDims = PAGE_FORMAT_DIMENSIONS[format] ?? PAGE_FORMAT_DIMENSIONS.A4;

  if (isLandscape) {
    return {
      width: baseDims.height,
      minHeight: baseDims.width,
    };
  }

  return {
    width: baseDims.width,
    minHeight: baseDims.height,
  };
}

/**
 * Resolves padding from Front Matter margin settings or falls back to default 15mm.
 */
export function resolvePagePadding(pdfOptions?: PdfDocumentOptions): string {
  const top = pdfOptions?.margin?.top ?? '15mm';
  const right = pdfOptions?.margin?.right ?? '15mm';
  const bottom = pdfOptions?.margin?.bottom ?? '15mm';
  const left = pdfOptions?.margin?.left ?? '15mm';

  return `${top} ${right} ${bottom} ${left}`;
}

/**
 * Generates dynamic page dimension and margin CSS for the preview sheet.
 */
export function buildPageDimensionStyle(pdfOptions?: PdfDocumentOptions): string {
  const { width, minHeight } = resolvePaperDimensions(pdfOptions);
  const padding = resolvePagePadding(pdfOptions);

  return `
.md-tech-pdf-preview-page {
  width: ${width};
  min-height: ${minHeight};
  padding: ${padding};
}
`;
}
