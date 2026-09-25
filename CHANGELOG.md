# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-09-25

### Fixed

- Resolved broken scroll synchronization by removing extraneous `overflow-y: auto` from the canvas wrapper and unifying scrolling on the window/body container.
- Implemented full bi-directional scroll synchronization: preview scrolling now accurately reveals matching source lines in the active Markdown editor.
- Compensated Front Matter line offset so `data-line` attributes match editor document line numbers precisely.
- Added interactive toolbar Sync toggle button (`Sync: ON / OFF`) allowing users to easily toggle scroll synchronization.
- Hardened bi-directional scroll event muting (400ms debounce) to eliminate ping-pong loops between editor and preview.

## [0.4.0] - 2026-09-25

### Added

- Editor-to-preview synchronized scrolling (Scroll Sync) with automatic source line mapping (`data-line`).
- Sticky preview toolbar providing quick actions (Reload, Zoom toggle, Direct PDF export) excluded from print styles.
- Cryptographic nonce-based dynamic Content Security Policy (CSP) allowing secure inline client scripts.
- Official brand identity icons for Marketplace and dedicated editor title bar action icons supporting light and dark themes.

### Improved

- Preview scroll position preservation across document reloads, automatic refreshes, and panel re-openings (`vscode.setState`).
- Toolbar offset compensation ensuring headings and targeted elements remain visible below the sticky bar.
- Ping-pong scroll loop suppression with 300ms event muting during programmatic synchronization.

### Known Limitations

- Preview provides a PDF-like visual layout, not exact print-level pagination.
- Diagram cache is in-memory only.

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
