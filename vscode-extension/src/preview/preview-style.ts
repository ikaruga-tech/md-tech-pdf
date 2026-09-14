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

.md-tech-pdf-preview-canvas {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 24px 16px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background-color: var(--vscode-editor-background, #1e1e1e);
  overflow-y: auto;
}

.md-tech-pdf-preview-page {
  box-sizing: border-box;
  background-color: #ffffff;
  color: #24292f;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  margin: 0 auto;
}
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

  // Currently A4 is standard
  if (isLandscape) {
    return {
      width: '297mm',
      minHeight: '210mm',
    };
  }

  return {
    width: '210mm',
    minHeight: '297mm',
  };
}

/**
 * Resolves padding from Front Matter margin settings or falls back to default 20mm.
 */
export function resolvePagePadding(pdfOptions?: PdfDocumentOptions): string {
  const top = pdfOptions?.margin?.top ?? '20mm';
  const right = pdfOptions?.margin?.right ?? '20mm';
  const bottom = pdfOptions?.margin?.bottom ?? '20mm';
  const left = pdfOptions?.margin?.left ?? '20mm';

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
