# VS Code Extension Guide

The `md-tech-pdf` extension provides a side-by-side preview panel and one-click PDF exporting directly inside Visual Studio Code.

## Features

- **Dual Preview Modes (Paged & Continuous)**:
  - **Paged View**: Realistic page preview mirroring the output PDF page layout, margins, and physical paper boundaries. Respects Front Matter `pdf` dimensions or VS Code default settings.
  - **Continuous View**: Seamless, full-width continuous scroll mode similar to standard Markdown previews. Shows page break indicators without physical page gaps.
- **Bi-directional Scroll Sync**: Scrolling the editor jumps to the preview position, and scrolling the preview moves the active editor line.
- **Interactive Sticky Toolbar**:
  - `Reload`: Re-renders preview while bypassing diagram caches.
  - `View: Paged / Continuous`: Switch between physical paged view and continuous scroll view.
  - `Sync: ON / OFF`: Toggle synchronized scrolling.
  - `Anim: smooth / instant`: Toggle smooth animation or instantaneous jumping.
  - `Delay: 0ms / 20ms / 50ms / 100ms`: Adjust debounce interval for scroll synchronization.
  - `Zoom`: Switch page magnification (`Fit Width`, `50%`, `75%`, `100%`, `125%`, `150%`).
  - `Export PDF`: Instant PDF export button.
- **Client-Side Auto-Pagination**:
  - Automatically calculates effective page height based on target paper size and margins in Paged View mode, splitting long continuous content across multiple page sheets.
  - Built-in Orphan Heading Prevention ensures section headings are not left isolated at the bottom of a page without subsequent text.
- **Table Overflow Defense & Responsive Layout**:
  - Wide tables are automatically enclosed in a `.table-container` wrapper with horizontal scrolling to prevent layout clipping.
  - Allows natural line wrapping for table header cells (`th`) and inline code, with balanced 0.88em font sizing.
- **Persistent Diagram Cache**: SVG diagram renders are cached to disk, enabling instant preview reload across VS Code sessions.

## Commands

| Command                         | Title                        | Description                                                  |
| :------------------------------ | :--------------------------- | :----------------------------------------------------------- |
| `md-tech-pdf.openPreview`       | `Open Technical PDF Preview` | Opens side-by-side preview panel for active Markdown file.   |
| `md-tech-pdf.exportPdf`         | `Export to PDF`              | Exports PDF to the configured directory or input directory.  |
| `md-tech-pdf.exportPdfAs`       | `Export to PDF As...`        | Opens save dialog to choose custom PDF destination.          |
| `md-tech-pdf.clearDiagramCache` | `Clear Diagram Cache`        | Purges all cached SVG diagrams from memory and disk storage. |

## Quick Usage

1. Open any Markdown file (`.md`).
2. Click the preview action icon in the top right editor title bar, or press `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Windows/Linux) and run `md-tech-pdf: Open Technical PDF Preview`.
3. To export to PDF, click `Export PDF` on the preview toolbar or right-click the file in the Explorer and select `md-tech-pdf: Export to PDF`.
