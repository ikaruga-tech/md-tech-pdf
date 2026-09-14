# md-tech-pdf for Visual Studio Code

Export Markdown documents with embedded Mermaid and PlantUML diagrams into clean, high-quality technical PDFs directly inside Visual Studio Code.

## Overview

`md-tech-pdf` is a technical document PDF exporter built specifically for software engineering documents, architecture design records, system specifications, and documentation pipelines.

It renders vector diagrams cleanly, applies modern typography optimized for technical documentation, and provides seamless export actions within VS Code.

A standalone command-line interface (CLI) is also available in the repository for automated CI/CD documentation builds.

## Features

- **Direct PDF Export**: Convert Markdown files to PDF with a single command.
- **Save As Dialog**: Choose a customized output directory and filename interactively.
- **Explorer Context Menu**: Right-click any `.md` or `.markdown` file in the Explorer view to export.
- **Mermaid Diagram Support**: Render flowcharts, sequence diagrams, class diagrams, state diagrams, and ER diagrams without external dependencies.
- **PlantUML Diagram Support**: Render PlantUML diagrams with local Java and PlantUML JAR integration.
- **Front Matter Configuration**: Control document-level layout, margins, orientations, and custom fonts directly within Markdown.
- **Custom Typography**: Embedded Google Fonts and local font support with refined headings, bold weights, and technical table layouts.

## Usage

### 1. Export to PDF

Export the currently active Markdown document directly to a PDF in the same directory:

1. Open a Markdown file in the editor.
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
3. Run `md-tech-pdf: Export to PDF`.

Output: `document.md` is compiled to `document.pdf`.

### 2. Export to PDF As...

Export with a custom destination path and filename:

1. Open a Markdown file in the editor.
2. Open the Command Palette.
3. Run `md-tech-pdf: Export to PDF As...`.
4. Choose the target destination in the Save Dialog.

### 3. Explorer Context Menu

1. In the VS Code File Explorer, right-click on any `.md` or `.markdown` file.
2. Select `md-tech-pdf: Export to PDF`.

## Front Matter Configuration

You can customize PDF rendering options at the top of your Markdown file using YAML front matter.

Example:

```markdown
---
title: System Architecture Design
pdf:
  format: A4
  landscape: false
  margin:
    top: 20mm
    bottom: 20mm
    left: 20mm
    right: 20mm
fonts:
  - name: "LINE Seed JP"
    type: google
    weights: [400, 700]
---

# 1. System Overview

This document demonstrates high-quality PDF export using `md-tech-pdf`.
```

## Requirements

- **Mermaid**: Bundled within the extension. No extra runtime or installation is required.
- **PlantUML**: Requires a local Java runtime (Java 8+) and a PlantUML JAR file. Specify their paths in Settings if they are not in your default system PATH.
- **Network**: Required only when downloading external Google Fonts during export.

## Configuration

Configure extension settings via VS Code Settings (`Preferences: Open User Settings (JSON)` or GUI):

- `md-tech-pdf.plantuml.javaPath`: Path to the Java executable (default: `"java"`).
- `md-tech-pdf.plantuml.jarPath`: Path to the local `plantuml.jar` file (default: `""`).
- `md-tech-pdf.export.outputDirectory`: Default output directory for exports. Leave empty to output next to the source Markdown file (default: `""`).
- `md-tech-pdf.export.afterExport`: Action to perform automatically after export: `"none"`, `"open"` (open in editor), or `"reveal"` (reveal in OS file manager) (default: `"none"`).

## Known Limitations

- Very large diagrams may push following content to a new page or leave white space if they exceed page dimensions.
- PlantUML requires Java and a valid `plantuml.jar` installed on your machine.
- Google Fonts fetching requires an active internet connection during rendering.

## License

Apache License 2.0. See [LICENSE](LICENSE) for details.

## Repository

Source code and issue tracker: <https://github.com/ikaruga-tech/md-tech-pdf>
