# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-rc.1] - 2026-09-11

### Added

- **Markdown to Vector PDF Conversion**: Decoupled Core library and CLI engine built on Playwright Chromium.
- **Mermaid Diagram Support**: Embedded high-resolution vector SVG rendering for flowcharts, sequence diagrams, and class diagrams.
- **PlantUML Diagram Support**: Local PlantUML execution engine generating clean inline vector SVG diagrams.
- **YAML Front Matter Configuration**: Document-level configuration for PDF options (`format`, `landscape`, `margin`) and diagram defaults (`width`, `height`, `fit`, `align`).
- **Flexible Diagram Layout**: Diagram block attributes for `width`, `height`, `fit` (`contain` / `fill`), and `align` (`left` / `center` / `right`).
- **Font Customization**:
  - Local OS font support for body text (`family`) and code blocks (`codeFamily`).
  - Google Fonts integration via Google Fonts CSS2 API with configurable weights.
  - Automated `document.fonts.ready` web font loading completion detection.
- **Command-Line Interface (CLI)**: Executable `md-tech-pdf` CLI with flexible output path (`-o` / `--output`), auto-directory creation, versioning, and help flags.

### Improved

- **Multi-Column Table Layout**: Optimized cell padding, automatic column widths, and line-breaking rules preventing Japanese single-character column wrapping.
- **Long Code Line Wrapping**: Code blocks wrap gracefully with `white-space: pre-wrap` and `overflow-wrap: anywhere`, eliminating text clipping.
- **Heading Page-Break Handling**: Prevents orphan headings at page bottoms via CSS break-inside/break-after avoidance.
- **PDF Page Margin Control**: Clean separation between Playwright physical page margins and HTML layout rules.

### Known Limitations

- **Table Header Pagination**: `<thead>` table headers are not automatically repeated at the top of subsequent pages when a large table breaks across pages.
- **Large Diagram Pre-Spacing**: Very tall diagrams (>150mm) may move to the next page to avoid cross-page clipping, creating bottom whitespace on the preceding page.
- **PlantUML Environment Requirements**: PlantUML rendering requires a locally installed Java runtime and PlantUML `.jar` file.
- **Google Fonts Connectivity**: Google Fonts fetching requires an active Internet connection at PDF compilation time (falls back to system fonts if offline).
