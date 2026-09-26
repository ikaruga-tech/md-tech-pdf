# Changelog

All notable changes to the "md-tech-pdf" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-09-26

### Added

- Custom CSS styling support:
  - Added `styles` option in Front Matter (string or string array) to inject user-defined CSS stylesheets into preview and PDF export.
  - Added `md-tech-pdf.styles` setting in VS Code configuration for workspace-wide or global custom stylesheets.
  - Hardened local stylesheet path resolution strictly within workspace/document boundary with Webview CSP integration.
- Persistent Diagram Cache across VS Code sessions:
  - Introduced two-tier diagram caching (L1 in-memory Map + L2 disk cache in extension global storage) preserving rendered Mermaid and PlantUML SVG output.
  - Added `md-tech-pdf.preview.cache.persistent` setting (default: `true`) to toggle persistent disk caching.
  - Added `md-tech-pdf.clearDiagramCache` command (`md-tech-pdf: Clear Diagram Cache`) to safely purge cached diagrams with user feedback notification.
- Configurable Auto Refresh debounce delay:
  - Added `md-tech-pdf.preview.debounceDelay` setting (default: `500` ms, minimum: `100` ms, maximum: `5000` ms) for fine-grained tuning of typing refresh latency.

### Improved

- Near-instant preview rendering for previously opened documents across VS Code restarts via persistent diagram caching.

### Known Limitations

- Preview approximates PDF layout but is not exact print-level pagination.
- Local resources referenced from CSS `url(...)` are not rewritten.

## [0.4.1] - 2026-09-25

### Fixed

- Fixed preview scroll synchronization failure caused by container overflow conflict (`overflow-y: auto` on canvas container).
- Implemented full bi-directional scroll synchronization: scrolling the preview pane now smoothly reveals the corresponding source line in the active Markdown editor.
- Fixed line number mismatch by adding Front Matter line offset compensation to `data-line` attributes.
- Added interactive toolbar Sync toggle button (`Sync: ON / OFF`) for user control over scroll synchronization.
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

- Preview approximates PDF layout but is not exact print-level pagination.
- Diagram cache is in-memory only and resets upon VS Code reload.
- Local resources referenced from CSS `url(...)` are not rewritten.

## [0.3.0] - 2026-09-14

### Added

- PDF-like preview for Markdown documents in VS Code (`md-tech-pdf.openPreview`).
- Live Mermaid and PlantUML diagram rendering in preview.
- Configurable auto-refresh modes: `manual`, `onSave` (default), and `onType` (with 500ms debounce).
- High-performance in-memory SVG diagram cache keyed by SHA-256.
- Relative local image rendering support in preview.
- Diagram-level error recovery displaying non-blocking inline fallback cards.

### Improved

- Preview rendering performance through cached diagram SVGs.
- Responsive image handling within the preview viewport.
- Preview lifecycle and stale-render race condition protection.
- Error notifications and Output Channel logging behavior.

### Security and Hardening

- Strict Webview Content Security Policy (CSP) with scripts explicitly disabled (`enableScripts: false`).
- Workspace and local resource boundary validation.
- Canonical realpath validation to prevent symlink directory traversal.
- Rejection of internal VS Code URI schemes (`vscode-file:`, `vscode-resource:`, `file:`).
- Sanitized user-facing error notifications preventing local path disclosure.

### Known Limitations

- Preview approximates PDF layout but is not exact print-level pagination.
- Scroll position may reset during automatic refresh.
- Editor-preview scroll synchronization is not supported in this version.
- Diagram cache is in-memory only and resets upon VS Code reload.
- Local resources referenced from CSS `url(...)` are not rewritten.

## [0.3.0-rc.1] - 2026-09-14

### Added

- PDF-like VS Code Preview panel with real-time technical documentation rendering.
- Dedicated command `md-tech-pdf: Open PDF-like Preview` (`md-tech-pdf.openPreview`).
- Live preview support for Mermaid diagrams (flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams).
- Live preview support for PlantUML diagrams via local Java and PlantUML JAR runtime.
- Configurable Auto Refresh modes: `manual`, `onSave` (default), and `onType` (with 500ms debounce).
- High-performance in-memory diagram SVG cache keyed by SHA-256 hash.
- Preview support for relative local images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`).
- Local resource resolution converting workspace relative paths to secure Webview URIs.
- Diagram-level error recovery displaying inline fallback error blocks without aborting preview rendering.

### Improved

- Preview rendering performance through cached diagram SVGs.
- Responsive image handling within the PDF-like preview viewport.
- Preview error UX with sanitized, user-friendly notifications.
- Security boundary enforcement for local resource access.
- Output Channel logging with reduced noise and filtered sensitive local paths.

### Security and Hardening

- Strict Content Security Policy (CSP) with per-session nonces for styles.
- Scripts explicitly disabled in preview Webview (`enableScripts: false`).
- Workspace boundary containment checks for all resolved local resources.
- Canonical realpath validation to prevent directory traversal via symlinks.
- Rejection of internal VS Code URI schemes (`vscode-file:`, `vscode-resource:`, `file:`).
- Error notifications sanitized to prevent leaking sensitive file paths or stack traces.

### Known Limitations

- Preview provides a PDF-like visual layout, not exact print-level pagination.
- Scroll position may reset when preview refreshes.
- Editor-preview scroll synchronization is not supported in this version.
- Diagram cache is in-memory only and resets upon VS Code reload.
- Local resource conversion within inline CSS `url(...)` is not supported.
- Previewing local font file URLs is not supported.

## [0.2.0] - 2026-09-14

### Added

- Initial release of the md-tech-pdf VS Code extension.
- Command Palette action: `md-tech-pdf: Export to PDF` to export the active Markdown document directly to PDF.
- Command Palette action: `md-tech-pdf: Export to PDF As...` to export with an interactive file save dialog.
- Explorer context menu integration: Right-click on any `.md` or `.markdown` file to export to PDF.
- Rendering support for Mermaid diagrams (flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams).
- Rendering support for PlantUML diagrams via local Java and PlantUML JAR runtime.
- Comprehensive Front Matter configuration support (PDF layout, margins, orientations, and custom fonts).
- Google Fonts and local font embedding support with high-quality technical typography.
- Configurable settings for PlantUML paths (`javaPath`, `jarPath`), output directory, and post-export actions.
