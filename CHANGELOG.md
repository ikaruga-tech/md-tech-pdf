# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
