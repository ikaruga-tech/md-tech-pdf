/**
 * Default CSS stylesheet for md-tech-pdf HTML output.
 * Designed for clean technical documentation readability and print/PDF layout.
 */
export const DEFAULT_DOCUMENT_STYLE = `
:root {
  --color-bg: #ffffff;
  --color-text: #24292f;
  --color-text-muted: #57606a;
  --color-border: #d0d7de;
  --color-code-bg: #f6f8fa;
  --color-blockquote-border: #d0d7de;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, "Noto Sans JP", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
}

*, *::before, *::after {
  box-sizing: border-box;
}

html {
  font-size: 16px;
  line-height: 1.6;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 10.5pt;
  line-height: 1.7;
  font-weight: 400;
  word-wrap: break-word;
}

strong,
b {
  font-weight: 700;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  color: var(--color-text);
  line-height: 1.35;
  page-break-after: avoid;
  break-after: avoid;
}

/* Prevent heading orphans by keeping them with the subsequent content element */
h1 + *, h2 + *, h3 + *, h4 + *, h5 + *, h6 + * {
  page-break-before: avoid;
  break-before: avoid;
}

h1 {
  font-size: 20pt;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 0.8rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--color-border);
}

h2 {
  font-size: 16pt;
  font-weight: 700;
  margin-top: 1.6em;
  margin-bottom: 0.6em;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--color-border);
}

h3 {
  font-size: 13pt;
  font-weight: 700;
  margin-top: 1.4em;
  margin-bottom: 0.5em;
}

h4 {
  font-size: 11.5pt;
  font-weight: 400;
  margin-top: 1.2em;
  margin-bottom: 0.4em;
}

h5 {
  font-size: 10.5pt;
  font-weight: 400;
  margin-top: 1.1em;
  margin-bottom: 0.3em;
}

h6 {
  font-size: 9.5pt;
  font-weight: 400;
  color: var(--color-text-muted);
  margin-top: 1em;
  margin-bottom: 0.3em;
}

/* Paragraph & Lists */
p {
  margin-top: 0;
  margin-bottom: 1rem;
}

ul, ol {
  margin-top: 0;
  margin-bottom: 1rem;
  padding-left: 2rem;
}

li {
  margin: 0.2em 0;
}

li > p {
  margin-bottom: 0.5rem;
}

/* Blockquote */
blockquote {
  margin: 1rem 0;
  padding: 0.5rem 1rem;
  color: var(--color-text-muted);
  font-weight: 400;
  border-left: 0.25rem solid var(--color-blockquote-border);
  background-color: var(--color-code-bg);
}

blockquote > :first-child { margin-top: 0; }
blockquote > :last-child { margin-bottom: 0; }

/* Tables */
table {
  border-collapse: collapse;
  width: 100%;
  margin-top: 1rem;
  margin-bottom: 1.5rem;
  display: table;
  table-layout: auto;
}

table th, table td {
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  text-align: left;
  line-height: 1.5;
  overflow-wrap: anywhere;
  word-break: normal;
}

table th {
  background-color: #f0f3f6;
  font-weight: 400;
  border-bottom: 2px solid #cbd5e1;
  word-break: keep-all;
  overflow-wrap: normal;
}

table tr:nth-child(2n) {
  background-color: #fafbfc;
}

/* Code and Preformatted text */
code {
  font-family: var(--font-mono);
  font-size: 85%;
  font-weight: 400;
  padding: 0.2em 0.4em;
  margin: 0;
  background-color: var(--color-code-bg);
  border-radius: 4px;
}

:not(pre) > code {
  font-size: 0.9em;
  font-weight: 400;
}

pre {
  margin-top: 1rem;
  margin-bottom: 1.5rem;
  padding: 0.8rem 1rem;
  font-family: var(--font-mono);
  font-size: 9pt;
  font-weight: 400;
  line-height: 1.5;
  background-color: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  page-break-inside: avoid;
  break-inside: avoid;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: normal;
}

pre code {
  padding: 0;
  background-color: transparent;
  border-radius: 0;
  font-size: inherit;
  line-height: inherit;
  font-weight: 400;
  white-space: inherit;
  overflow-wrap: inherit;
}

/* Links */
a {
  color: #0969da;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

hr {
  height: 0.25em;
  padding: 0;
  margin: 2rem 0;
  background-color: var(--color-border);
  border: 0;
}

/* Diagram Container & Alignment */
.md-tech-diagram {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  display: block;
  page-break-inside: avoid;
  break-inside: avoid;
}

.md-tech-diagram-align-center {
  margin-left: auto;
  margin-right: auto;
  text-align: center;
}

.md-tech-diagram-align-left {
  margin-left: 0;
  margin-right: auto;
  text-align: left;
}

.md-tech-diagram-align-right {
  margin-left: auto;
  margin-right: 0;
  text-align: right;
}

.md-tech-diagram-content {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Diagram Fit modes */
.md-tech-diagram-fit-contain .md-tech-diagram-content svg {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.md-tech-diagram-fit-fill .md-tech-diagram-content svg {
  width: 100%;
  height: 100%;
  object-fit: fill;
}

/* Diagram Error State */
.md-tech-diagram-error {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

.md-tech-diagram-error-card {
  box-sizing: border-box;
  background-color: #fff8f7;
  border: 1px dashed #d1242f;
  border-radius: 6px;
  padding: 1rem 1.25rem;
  color: #24292f;
  text-align: left;
}

.md-tech-diagram-error-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: #cf222e;
  margin-bottom: 0.4rem;
}

.md-tech-diagram-error-message {
  font-family: var(--font-mono);
  font-size: 85%;
  line-height: 1.5;
  color: #57606a;
  white-space: pre-wrap;
  word-break: break-word;
}
`;
