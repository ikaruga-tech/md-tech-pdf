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
  padding: 2.5rem 3rem;
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 1rem;
  word-wrap: break-word;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  margin-top: 1.8rem;
  margin-bottom: 0.8rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-text);
  page-break-after: avoid;
  break-after: avoid;
}

h1 {
  font-size: 2rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--color-border);
}

h2 {
  font-size: 1.5rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--color-border);
}

h3 { font-size: 1.25rem; }
h4 { font-size: 1.1rem; }
h5 { font-size: 1rem; }
h6 { font-size: 0.9rem; color: var(--color-text-muted); }

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
  margin-bottom: 0.3rem;
}

li > p {
  margin-bottom: 0.5rem;
}

/* Blockquote */
blockquote {
  margin: 1rem 0;
  padding: 0.5rem 1rem;
  color: var(--color-text-muted);
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
  overflow-x: auto;
}

table th, table td {
  padding: 0.6rem 1rem;
  border: 1px solid var(--color-border);
  text-align: left;
}

table th {
  background-color: var(--color-code-bg);
  font-weight: 600;
}

table tr:nth-child(2n) {
  background-color: #fafbfc;
}

/* Code and Preformatted text */
code {
  font-family: var(--font-mono);
  font-size: 85%;
  padding: 0.2em 0.4em;
  margin: 0;
  background-color: var(--color-code-bg);
  border-radius: 4px;
}

pre {
  margin-top: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 85%;
  line-height: 1.45;
  background-color: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  page-break-inside: avoid;
  break-inside: avoid;
}

pre code {
  padding: 0;
  background-color: transparent;
  border-radius: 0;
  font-size: 100%;
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
`;
