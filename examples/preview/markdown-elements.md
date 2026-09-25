---
pdf:
  format: A4
  landscape: false
  margin:
    top: 15mm
    right: 15mm
    bottom: 15mm
    left: 15mm
style:
  font:
    family: 'Noto Sans JP'
    codeFamily: 'Roboto Mono'
    google:
      families:
        - name: 'Noto Sans JP'
          weights: [400, 700]
        - name: 'Roboto Mono'
          weights: [400, 700]
---

# Markdown Elements Visual Test Specification

This document provides visual validation coverage for Markdown Preview rendering in md-tech-pdf.

## Headings Hierarchy

Headings must display descending font sizes with Pattern D proportions and clear margins.

### Level 3 Subsection

Paragraph following an H3 element to verify spacing and orphan prevention.

#### Level 4 Component Details

Fourth level heading for sub-item specifications.

##### Level 5 Minor Group

Fifth level heading for detailed technical groupings.

###### Level 6 Deep Inspection

Sixth level heading displayed in muted text color.

## Text Formatting and Typography

Standard paragraph text test. Technical documentation requires clear distinction between regular text, **bold weight text**, _italic text_, and ~~strikethrough text~~.

Japanese text mixed with English: 本文書は、md-tech-pdfにおけるMarkdownプレビュー表示品質とPDF出力の整合性を検証するためのフィクスチャ文書です。Google Fonts（Noto Sans JP / Roboto Mono）の適用状況、Pattern Dタイポグラフィ（本文10.5pt、行送り1.7）の描画品質を確認します。

Emoji rendering test: 🚀 📊 ⚙️ 📝 💡 ⚠️ ✅

Special long URL test: [Long Specification Link](https://example.com/api/v1/subsystem/transactions/processing/reports/daily-settlement-summary-specification-for-technical-documentation)

Safe raw HTML elements test:

Inline text with <sup>superscript</sup> and <sub>subscript</sub>, plus a line break.<br>
Text after line break.

<details>
<summary>Click to view collapsible technical notes</summary>

Inside details container block: Raw HTML containers should render securely under CSP.

</details>

## Inline and Block Code

Inline code test: Execute `pnpm test` or invoke `const renderer = new HtmlRenderer();` to render documents.

Fenced block code with syntax highlighting:

```typescript
export interface PreviewRenderingOptions {
  title: string;
  target: 'preview' | 'pdf';
  customCss?: string;
  extraHeadHtml?: string;
}

export function calculateDimensions(width: number, height: number): number {
  return width * height;
}
```

Preformatted code block without syntax highlight:

```text
2026-09-14 18:00:00.123 [INFO] [PreviewManager] Opening preview for markdown-elements.md
2026-09-14 18:00:00.456 [INFO] [HtmlRenderer] Document rendered in 42ms
```

## Lists and Task Lists

Unordered list:

- Primary feature item
  - Nested sub-feature item A
  - Nested sub-feature item B
- Secondary feature item

Ordered list:

1. Parse Front Matter and options
2. Extract diagram blocks
3. Render Markdown content to HTML
4. Inject preview styling and CSP headers

Task list:

- [x] Configure Content Security Policy
- [x] Unify default margins to 15mm
- [ ] Implement live editor sync (Phase 14)

## Blockquotes

> Blockquote test: Technical documentation should render blockquotes with distinct border-left and subtle background shading.
>
> Multi-line blockquote with `inline code` and emphasis elements.

## Tables

Table with alignment and varied content widths:

| Item ID | Component Name  | Description                        | Status  | Latency |
| :------ | :-------------- | :--------------------------------- | :-----: | ------: |
| COMP-01 | HtmlRenderer    | Converts Markdown to HTML document |  Ready  |    45ms |
| COMP-02 | PreviewPanel    | Manages WebviewPanel instance      |  Ready  |    12ms |
| COMP-03 | DiagramRenderer | Executes Mermaid and PlantUML      | Standby |   320ms |

## Images

Remote HTTPS image (Badge):

![GitHub License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)

Local relative image reference (Placeholder demonstration):

![Sample Local Asset](./sample-diagram.png)

## Horizontal Rule

Horizontal divider separation:

---

Document end verification line.
