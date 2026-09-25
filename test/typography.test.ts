import { describe, it, expect } from 'vitest';
import { DEFAULT_DOCUMENT_STYLE } from '../src/html/default-style.js';
import { HtmlRenderer } from '../src/html/html-renderer.js';

describe('Typography & Pattern D styles (Phase 7.5-D)', () => {
  it('should define Pattern D typography in DEFAULT_DOCUMENT_STYLE', () => {
    // Body
    expect(DEFAULT_DOCUMENT_STYLE).toMatch(/body\s*{[^}]*font-weight:\s*400/);

    // Headings
    expect(DEFAULT_DOCUMENT_STYLE).toMatch(/h1\s*{[^}]*font-weight:\s*700/);
    expect(DEFAULT_DOCUMENT_STYLE).toMatch(/h2\s*{[^}]*font-weight:\s*700/);
    expect(DEFAULT_DOCUMENT_STYLE).toMatch(/h3\s*{[^}]*font-weight:\s*700/);
    expect(DEFAULT_DOCUMENT_STYLE).toMatch(/h4\s*{[^}]*font-weight:\s*400/);
    expect(DEFAULT_DOCUMENT_STYLE).toMatch(/h5\s*{[^}]*font-weight:\s*400/);
    expect(DEFAULT_DOCUMENT_STYLE).toMatch(/h6\s*{[^}]*font-weight:\s*400/);

    // Strong & B
    expect(DEFAULT_DOCUMENT_STYLE).toMatch(/strong,\s*b\s*{[^}]*font-weight:\s*700/);

    // Table Header
    expect(DEFAULT_DOCUMENT_STYLE).toMatch(/table\s+th\s*{[^}]*font-weight:\s*400/);
    expect(DEFAULT_DOCUMENT_STYLE).toMatch(/table\s+th\s*{[^}]*background-color:\s*#f0f3f6/);
    expect(DEFAULT_DOCUMENT_STYLE).toMatch(/table\s+th\s*{[^}]*border-bottom:\s*2px solid #cbd5e1/);

    // Code & Pre
    expect(DEFAULT_DOCUMENT_STYLE).toMatch(/code\s*{[^}]*font-weight:\s*400/);
    expect(DEFAULT_DOCUMENT_STYLE).toMatch(/pre\s*{[^}]*font-weight:\s*400/);
  });

  it('should include Pattern D styles in rendered HTML document', async () => {
    const renderer = new HtmlRenderer();
    const md =
      '# Title\n\n## Section\n\n### Sub\n\n#### Item\n\n**Bold**\n\n| H1 | H2 |\n|---|---|\n| C1 | C2 |';
    const html = await renderer.render(md, { title: 'Test' });

    expect(html).toContain('font-weight: 700;');
    expect(html).toContain('#f0f3f6');
    expect(html).toContain('2px solid #cbd5e1');
  });
});
