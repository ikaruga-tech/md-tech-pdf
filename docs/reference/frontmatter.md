# Front Matter Configuration Reference

Configure page geometry, typography, and default diagram behavior directly at the beginning of your Markdown document using YAML Front Matter.

## Complete YAML Schema

```yaml
---
pdf:
  format: A4 # "A4" (default)
  landscape: false # true | false (default: false)
  margin:
    top: 15mm # string with units (default: "15mm")
    bottom: 15mm # string with units (default: "15mm")
    left: 15mm # string with units (default: "15mm")
    right: 15mm # string with units (default: "15mm")

diagram:
  width: '' # e.g. "140mm", "80%" (default: "")
  height: '' # e.g. "90mm", "400px" (default: "")
  fit: contain # "contain" | "fill" (default: "contain")
  align: center # "center" | "left" | "right" (default: "center")

style:
  font:
    family: "'LINE Seed JP', sans-serif"
    codeFamily: "'Fira Code', monospace"
    google:
      families:
        - name: 'LINE Seed JP'
          weights: [400, 700, 800]
        - name: 'Fira Code'
          weights: [400, 500]
  css: 'styles/custom.css' # string or array of paths
  customCss: | # raw CSS string
    table th { background: #f0f4f8; }
---
```

## Options Breakdown

### `pdf`

- `format`: Paper size (currently defaults to `A4`).
- `landscape`: `true` for landscape orientation, `false` for portrait.
- `margin`: Page margins (`top`, `bottom`, `left`, `right`) with CSS units (`mm`, `cm`, `in`, `px`).

### `diagram`

- `width`: Default diagram container width.
- `height`: Default diagram container height.
- `fit`: `contain` preserves aspect ratio within container; `fill` stretches SVG to bounds.
- `align`: Horizontal alignment on page (`center`, `left`, `right`).

### `style`

- `font.family`: CSS font-family string for body typography.
- `font.codeFamily`: CSS font-family string for code blocks and monospace elements.
- `font.google.families`: Array of Google Fonts to load with optional `weights`.
- `css`: Relative path(s) to external CSS files.
- `customCss`: Inline raw CSS rules.

## Page Breaks

To insert an explicit page break without triggering MarkdownLint inline-HTML warnings (`MD033`), write 8 consecutive hash characters (`########`) on an isolated line:

```markdown
Section content on page 1.

########

Section content on page 2.
```

`md-tech-pdf` safely transforms `########` into a print page break (`break-before: page`), cleanly splitting content in both PDF export and the VS Code paged preview.
