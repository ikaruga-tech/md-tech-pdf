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

.md-tech-pdf-preview-page .table-container {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  box-sizing: border-box;
}

.md-tech-pdf-preview-page table {
  max-width: 100%;
  box-sizing: border-box;
}

.md-tech-pdf-preview-page table th {
  background-color: #f1f5f9 !important;
  color: #1f2328 !important;
  font-weight: 600 !important;
}

.md-tech-pdf-preview-page table td {
  color: #24292f !important;
}

.md-tech-pdf-preview-page table tr:nth-child(2n) {
  background-color: #f8fafc !important;
}

.md-tech-pdf-preview-page table code {
  color: #1f2328 !important;
  background-color: #eff1f3 !important;
  border: 1px solid rgba(27, 31, 36, 0.15) !important;
  border-radius: 3px;
  white-space: normal !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
}

/* Localized diagram error card with one-click actions */
.md-tech-diagram-error-guidance {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #24292f;
}

.md-tech-diagram-error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.md-tech-diagram-error-action {
  padding: 4px 12px;
  font-family: var(--vscode-font-family, sans-serif);
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
  background-color: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
  border: 1px solid var(--vscode-button-border, transparent);
}

.md-tech-diagram-error-action:hover {
  background-color: var(--vscode-button-hoverBackground, #1177bb);
}

.md-tech-diagram-error-details {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: #57606a;
}

.md-tech-diagram-error-details summary {
  cursor: pointer;
}

.md-tech-diagram-error-details pre.md-tech-diagram-error-message {
  margin: 0.5rem 0 0;
  padding: 0.5rem;
  background: #f6f8fa;
  border-radius: 4px;
  max-height: 200px;
  overflow: auto;
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
  viewMode?: 'paged' | 'continuous';
}

/**
 * Returns HTML markup for the Preview Toolbar.
 */
export function getPreviewToolbarHtml(initialSettings?: PreviewToolbarInitialSettings): string {
  const syncEnabled = initialSettings?.syncEnabled ?? true;
  const syncBehavior = initialSettings?.syncBehavior ?? 'smooth';
  const syncDelay = initialSettings?.syncDelay ?? 50;
  const zoom = initialSettings?.zoom ?? 'fit';
  const viewMode = initialSettings?.viewMode ?? 'paged';

  return `
<div class="preview-toolbar" role="toolbar" aria-label="Markdown Technical PDF Preview Toolbar" data-default-sync-enabled="${syncEnabled}" data-default-sync-anim="${syncBehavior}" data-default-sync-delay="${syncDelay}" data-default-zoom="${zoom}" data-default-view-mode="${viewMode}">
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
    <label for="select-toolbar-view-mode" class="toolbar-label">View:</label>
    <select id="select-toolbar-view-mode" class="toolbar-select" title="Document view mode: Paged (sheet-by-sheet) or Continuous (seamless)">
      <option value="paged"${viewMode === 'paged' ? ' selected' : ''}>Paged</option>
      <option value="continuous"${viewMode === 'continuous' ? ' selected' : ''}>Continuous</option>
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
/* Default and Paged View Mode */
.md-tech-pdf-preview-page {
  width: ${width};
  min-height: ${minHeight};
  padding: ${padding};
}

.view-mode-paged .md-tech-pdf-preview-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.view-mode-paged .md-tech-pdf-preview-page {
  width: ${width};
  min-height: ${minHeight};
  padding: ${padding};
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  position: relative;
}

.view-mode-paged .page-number-badge {
  position: absolute;
  bottom: 8px;
  right: 16px;
  font-size: 11px;
  font-family: var(--vscode-font-family, sans-serif);
  color: #8c959f;
  user-select: none;
  pointer-events: none;
}

.view-mode-paged .page-break {
  display: none !important;
}

/* Continuous View Mode (Web / MPE layout) */
.view-mode-continuous .md-tech-pdf-preview-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 100%;
  padding: 24px 16px;
}

.view-mode-continuous .md-tech-pdf-preview-page {
  width: 100% !important;
  max-width: 900px !important;
  min-height: auto !important;
  margin: 0 auto !important;
  padding: 0 32px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
  border-radius: 0;
  background-color: #ffffff;
}

.view-mode-continuous .md-tech-pdf-preview-page:first-of-type {
  padding-top: 32px !important;
  border-top-left-radius: 4px !important;
  border-top-right-radius: 4px !important;
}

.view-mode-continuous .md-tech-pdf-preview-page:last-of-type {
  padding-bottom: 32px !important;
  border-bottom-left-radius: 4px !important;
  border-bottom-right-radius: 4px !important;
}

.view-mode-continuous .page-number-badge {
  display: none !important;
}

.view-mode-continuous .page-break-divider,
.view-mode-continuous .page-break {
  display: flex !important;
  align-items: center;
  justify-content: center;
  margin: 2.5rem 0;
  width: 100%;
  max-width: 900px;
  border-top: 1px dashed rgba(128, 128, 128, 0.4);
  position: relative;
  height: 1px;
}

.view-mode-continuous .page-break-divider::after,
.view-mode-continuous .page-break::after {
  content: '改ページ (Page Break)';
  font-size: 11px;
  font-family: var(--vscode-font-family, sans-serif);
  color: #656d76;
  background-color: #ffffff;
  padding: 0 10px;
  position: absolute;
  top: -8px;
  border-radius: 3px;
  letter-spacing: 0.05em;
  border: 1px solid rgba(128, 128, 128, 0.2);
}

.view-mode-paged .page-break-divider,
.view-mode-paged .page-break {
  display: none !important;
}
`;
}
