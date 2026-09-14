# Changelog

All notable changes to the "md-tech-pdf" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
