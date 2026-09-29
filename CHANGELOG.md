# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-09-29

### Added

- System browser auto-detection: installed Google Chrome, Microsoft Edge, Brave, or Chromium is detected per OS (macOS / Windows / Linux) and shared by preview and PDF export, so Mermaid renders even without the bundled chrome-headless-shell.
- `md-tech-pdf.browser.executablePath` setting (default: `""` = auto-detect).
- `md-tech-pdf: Download PlantUML Jar` command (`md-tech-pdf.downloadPlantUmlJar`): cancellable download of `plantuml.jar` from the official GitHub releases into `globalStorage/bin/plantuml.jar`. Used automatically while `md-tech-pdf.plantuml.jarPath` is empty; open previews refresh after the download.
- `md-tech-pdf: Run Doctor (環境診断)` command (`md-tech-pdf.runDoctor`): checks browser, Java runtime, PlantUML jar, Mermaid CLI, and PDF export engine and writes a report to the `md-tech-pdf: Doctor` output channel.
- Japanese / English UI messages following the VS Code display language.

### Changed

- Diagram error cards in the preview now show friendly, localized guidance with one-click **Run Doctor**, **Download PlantUML Jar**, and **Open Settings** buttons; raw error output moved into a collapsible **Error details** section.
- The first-render diagram error notification now offers **Open Doctor**, and PDF export failures caused by the environment show localized guidance with action buttons.
- Requires md-tech-pdf core 0.4.0.

### Core (md-tech-pdf 0.4.0)

- `config.browser.executablePath` (`ConvertAppConfig`) to render Mermaid diagrams and generate PDFs with an installed browser (e.g. Google Chrome / Microsoft Edge). The same browser is passed to Mermaid CLI (Puppeteer config via `-p`, new headless mode) and Playwright (`chromium.launch({ executablePath })`).
- `browserExecutablePath` option on `MermaidRendererOptions`, `HtmlRendererConfig`, and `PdfOptions`.
- Machine-readable error codes: `DiagramRenderError.code` (`BROWSER_NOT_FOUND`, `PLANTUML_JAR_NOT_CONFIGURED`, `PLANTUML_JAR_NOT_FOUND`, `JAVA_NOT_FOUND`, `RENDER_FAILED`) and `PdfGenerateError.code` (`BROWSER_NOT_FOUND`, `GENERATION_FAILED`). `DiagramErrorEvent` now includes `code`.
- `HtmlRenderOptions.diagramErrorHtmlBuilder` hook to replace the preview diagram error card (e.g. localized guidance).
- `JAVA_NOT_FOUND` is also reported when a `java` launcher exists but cannot run Java (e.g. the macOS `/usr/bin/java` stub without a JRE, or a binary for another CPU architecture).
- Exported `resolveDefaultJarPath()` / `resolveDefaultJavaPath()`, `buildMermaidCliArgs()`, `ensurePuppeteerConfigFile()`, `isBrowserLaunchFailure()`, and `isJavaUnavailableOutput()`.

## [0.6.0] - 2026-09-28

### Added

- MarkdownLint compliant page break notation `########`:
  - Eight consecutive hashes on a standalone line (`########`) are automatically converted into a page break element (`<div class="page-break"></div>`).
  - Avoids markdownlint raw HTML warnings (MD033) when authoring documents with intentional page breaks.
- Dual Preview View Modes (Paged and Continuous):
  - Added interactive toolbar toggle button (`View: Paged / Continuous`) to seamlessly switch viewing experiences.
  - Added VS Code setting `md-tech-pdf.preview.defaultViewMode` (default: `"paged"`) to configure user preference.
  - Paged mode partitions document contents into distinct paper sheets matching target PDF dimensions with realistic drop shadows.
  - Continuous mode displays an unbroken document sheet with subtle dashed page break indicators.
- Client-side Auto Pagination in Paged View Mode:
  - Automatically calculates page height budgets from paper size and margins, splitting long continuous content across multiple page sheets.
  - Heading orphan prevention: automatically pushes trailing headings to the next sheet if they cannot fit alongside content.
- Robust Table Layout and Overflow Protection:
  - Wrapped rendered markdown tables in `.table-container` with horizontal scroll capability to prevent wide tables from breaking out of sheet boundaries.
  - Allowed natural line wrapping for table header cells (`th`) and inline code elements.
  - Refined table typography (0.88em font size, 4px 6px cell padding) optimized for print aesthetics and information density.

## [0.5.0] - 2026-09-27

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
- Dynamic Preview Toolbar controls for Scroll Synchronization and Zoom:
  - Added scroll animation toggle button (`Anim: smooth / instant`) to adjust synchronization transition behavior on the fly.
  - Added scroll debounce interval toggle button (`Delay: 0ms / 20ms / 50ms / 100ms`) to minimize lag during editing.
  - Interactive toolbar states persisted across editor reloads via `vscode.setState` and updated in active settings.
- Default Front Matter Configuration via VS Code Settings:
  - Added fallback configurations when omitted from document Front Matter:
    - `md-tech-pdf.default.pdf.format`, `md-tech-pdf.default.pdf.landscape`, `md-tech-pdf.default.pdf.margin.*` (top, bottom, left, right)
    - `md-tech-pdf.default.diagram.width`, `md-tech-pdf.default.diagram.height`, `md-tech-pdf.default.diagram.fit`, `md-tech-pdf.default.diagram.align`
    - `md-tech-pdf.default.style.font.family`, `md-tech-pdf.default.style.font.codeFamily`, `md-tech-pdf.default.style.font.google.families`
  - Strict cascading precedence: Code Block Attributes > Front Matter > VS Code Settings > Built-in Defaults.
- Default preview settings in VS Code Configuration:
  - `md-tech-pdf.preview.scrollSync.enabled` (default: `true`)
  - `md-tech-pdf.preview.scrollSync.behavior` (default: `"smooth"`)
  - `md-tech-pdf.preview.scrollSync.delay` (default: `50`)
  - `md-tech-pdf.preview.zoom` (default: `"fit"`)

### Improved

- Near-instant preview rendering for previously opened documents across VS Code restarts via persistent diagram caching.
- Overhauled Preview Zoom architecture:
  - Preview canvas fixed at 100% width, scaling the page sheet container (`.md-tech-pdf-preview-page`) smoothly instead of outer container.
  - Eliminated awkward horizontal scrolling and left-edge clipping during zoom.
  - Dynamic `Fit Width` computation responding accurately to window resize events.
- Contrast and visual hierarchy polish:
  - Improved contrast and readability for code blocks and inline code elements.

### Known Limitations

- Preview provides a PDF-like visual layout, not exact print-level pagination.
- Local resources referenced from CSS `url(...)` are not rewritten.

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
