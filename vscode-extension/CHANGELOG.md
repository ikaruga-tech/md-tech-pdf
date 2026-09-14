# Changelog

All notable changes to the "md-tech-pdf" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
