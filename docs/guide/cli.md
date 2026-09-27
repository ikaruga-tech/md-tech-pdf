# CLI Usage Guide

The `md-tech-pdf` command-line tool converts Markdown documents to PDFs with comprehensive support for diagrams and styling.

## Command Syntax

```bash
md-tech-pdf <input-file> [options]
```

## Options

| Option                  | Shorthand | Description                                   |
| :---------------------- | :-------- | :-------------------------------------------- |
| `--output <path>`       | `-o`      | Specify custom output file or directory path. |
| `--style <path...>`     | `-s`      | Inject custom CSS stylesheet(s).              |
| `--java-path <path>`    |           | Path to the `java` binary for PlantUML.       |
| `--plantuml-jar <path>` |           | Path to custom `plantuml.jar`.                |
| `--no-cache`            |           | Disable diagram rendering cache.              |
| `--version`             | `-v`      | Display version number.                       |
| `--help`                | `-h`      | Show help and options reference.              |

## Examples

### Basic Conversion

```bash
md-tech-pdf design.md
# Output: design.pdf
```

### Specifying Output Path

```bash
md-tech-pdf design.md -o dist/architecture-spec.pdf
```

### Applying Custom Stylesheets

```bash
md-tech-pdf design.md -s styles/corporate.css -s styles/print.css
```
