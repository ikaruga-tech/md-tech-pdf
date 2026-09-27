# VS Code Settings Reference

Configure default extension behaviors and fallback configurations via VS Code Settings (`settings.json`).

## Settings Keys

### Preview & Synchronization

- `md-tech-pdf.preview.refresh`: When to refresh preview (`"onType"`, `"onSave"`, `"manual"`).
- `md-tech-pdf.preview.debounceDelay`: Delay in milliseconds for `onType` refresh (default: `500`, min: `100`, max: `5000`).
- `md-tech-pdf.preview.scrollSync.enabled`: Enable/disable bi-directional scroll synchronization (default: `true`).
- `md-tech-pdf.preview.scrollSync.behavior`: Animation behavior (`"smooth"` or `"instant"`).
- `md-tech-pdf.preview.scrollSync.delay`: Debounce delay for editor visible range tracking (default: `50`).
- `md-tech-pdf.preview.zoom`: Default page zoom level (`"fit"`, `"50%"`, `"75%"`, `"100%"`, `"125%"`, `"150%"`).
- `md-tech-pdf.preview.cache.persistent`: Enable persistent disk diagram cache (default: `true`).

### Default Document Fallbacks

When omitted from document Front Matter, these values apply:

- `md-tech-pdf.default.pdf.format`: Default paper format (`"A4"`).
- `md-tech-pdf.default.pdf.landscape`: Page orientation boolean (default: `false`).
- `md-tech-pdf.default.pdf.margin.top / bottom / left / right`: Default margins (default: `"15mm"`).
- `md-tech-pdf.default.diagram.width / height`: Default diagram dimensions (default: `""`).
- `md-tech-pdf.default.diagram.fit`: Default scaling behavior (`"contain"` or `"fill"`).
- `md-tech-pdf.default.diagram.align`: Default alignment (`"center"`, `"left"`, `"right"`).
- `md-tech-pdf.default.style.font.family`: Default body font family.
- `md-tech-pdf.default.style.font.codeFamily`: Default monospace font family.
- `md-tech-pdf.default.style.font.google.families`: Array of Google Fonts to load.

### Export & Tooling

- `md-tech-pdf.export.outputDirectory`: Relative or absolute path where PDFs are saved.
- `md-tech-pdf.export.afterExport`: Post-export action (`"none"`, `"open"`, `"reveal"`).
- `md-tech-pdf.styles`: Workspace or global array of CSS files applied to all previews and exports.
- `md-tech-pdf.plantuml.javaPath`: Path to custom Java binary.
- `md-tech-pdf.plantuml.jarPath`: Path to custom PlantUML `.jar`.
