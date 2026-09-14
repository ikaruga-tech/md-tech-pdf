# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-09-14

### Added

- VS Code extension PDF-like live preview panel (`md-tech-pdf.openPreview`).
- Live preview for Mermaid and PlantUML diagrams with in-memory SVG caching.
- Configurable Auto Refresh modes (`manual`, `onSave`, `onType` with 500ms debounce).
- Relative local image rendering support in preview with workspace boundary security validation.
- Diagram-level error recovery displaying non-blocking inline error cards.

### Improved

- Preview rendering performance and diagram cache reuse.
- Responsive image layout in preview viewport.
- Output channel logging clarity with path filtering.

### Security and Hardening

- Content Security Policy (CSP) in preview Webview.
- Scripts disabled in Webview (`enableScripts: false`).
- Symlink traversal checks using canonical realpath validation.
- Sanitized user notifications preventing internal path disclosure.

### Known Limitations

- Preview provides a PDF-like visual layout, not exact print-level pagination.
- Scroll position may reset upon refresh.
- Editor-preview scroll synchronization is not supported.
- Diagram cache is in-memory only.

## [0.3.0-rc.1] - 2026-09-14

### Added

- VS Code extension PDF-like live preview panel (`md-tech-pdf.openPreview`).
- Live preview for Mermaid and PlantUML diagrams with in-memory SVG caching.
- Configurable Auto Refresh modes (`manual`, `onSave`, `onType` with 500ms debounce).
- Relative local image rendering support in preview with workspace boundary security validation.
- Diagram-level error recovery displaying non-blocking inline error cards.

### Improved

- Preview rendering performance and diagram cache reuse.
- Responsive image layout in preview viewport.
- Output channel logging clarity with path filtering.

### Security and Hardening

- Content Security Policy (CSP) with nonce in preview Webview.
- Scripts disabled in Webview (`enableScripts: false`).
- Symlink traversal checks using canonical realpath validation.
- Sanitized user notifications preventing internal path disclosure.

### Known Limitations

- Preview provides a PDF-like visual layout, not exact print-level pagination.
- Scroll position may reset upon refresh.
- Editor-preview scroll synchronization is not supported.
- Diagram cache is in-memory only.

## [0.1.0] - 2026-09-11

### Added

- Markdown to PDF conversion
- Mermaid support
- PlantUML support
- Front Matter configuration
- Diagram width / height
- Diagram fit / alignment
- Local font support
- Google Fonts support
- CLI

### Improved

- Long code line wrapping
- Heading page-break handling
- Multi-column table layout
- PDF margin handling

### Known Limitations

- Table headers may not repeat after page breaks
- Large diagrams may leave blank space before a page break
- PlantUML requires Java and a local PlantUML jar
- Google Fonts require network access
