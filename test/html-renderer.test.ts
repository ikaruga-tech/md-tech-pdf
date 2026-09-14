import { describe, it, expect } from 'vitest';
import { HtmlRenderer } from '../src/index.js';

describe('HtmlRenderer', () => {
  const renderer = new HtmlRenderer();

  // 1. HTML文書が生成される & 2. <!DOCTYPE html> が存在する
  it('1 & 2. should generate a complete HTML document starting with <!DOCTYPE html>', async () => {
    const markdown = '# Hello World\n\nThis is a paragraph.';
    const html = await renderer.render(markdown);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="ja">');
    expect(html).toContain('</html>');
    expect(html).toContain('<head>');
    expect(html).toContain('</head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</body>');
    expect(html).toContain('<style>');
  });

  // 3. 通常MarkdownがHTML化される (見出し、段落、リスト、テーブル、引用、強調など)
  it('3. should render standard markdown elements into corresponding HTML tags', async () => {
    const markdown = `
# Title H1
## Title H2

A regular paragraph with **bold** and *italic* text and [a link](https://example.com).

- Item 1
- Item 2

1. First
2. Second

> A blockquote

| Header 1 | Header 2 |
| --- | --- |
| Val 1 | Val 2 |

Inline \`code\` here.
`;
    const html = await renderer.render(markdown);

    expect(html).toContain('<h1>Title H1</h1>');
    expect(html).toContain('<h2>Title H2</h2>');
    expect(html).toContain(
      '<p>A regular paragraph with <strong>bold</strong> and <em>italic</em> text'
    );
    expect(html).toContain('<a href="https://example.com">a link</a>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Item 1</li>');
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>First</li>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>Header 1</th>');
    expect(html).toContain('<td>Val 1</td>');
    expect(html).toContain('<code>code</code>');
  });

  // 4 & 5. Mermaidが <pre><code> ではなくSVGになり、HTMLに含まれる
  it('4 & 5. should convert Mermaid block into inline SVG within a container rather than <pre><code>', async () => {
    const markdown = `
\`\`\`mermaid
flowchart TD
    A --> B
\`\`\`
`;
    const html = await renderer.render(markdown);

    expect(html).not.toContain('<pre><code class="language-mermaid">');
    expect(html).toContain('<div class="md-tech-diagram');
    expect(html).toContain('<div class="md-tech-diagram-content">');
    expect(html).toContain('<svg');
    expect(html).toContain('</svg>');
  });

  // 6. widthがHTMLへ反映される
  it('6. should apply width attribute to diagram container style', async () => {
    const markdown = `
\`\`\`mermaid {width=160mm}
flowchart LR
    A --> B
\`\`\`
`;
    const html = await renderer.render(markdown);

    expect(html).toContain('style="width: 160mm;"');
  });

  // 7. heightがHTMLへ反映される
  it('7. should apply height attribute to diagram container style', async () => {
    const markdown = `
\`\`\`mermaid {height=80mm}
flowchart LR
    A --> B
\`\`\`
`;
    const html = await renderer.render(markdown);

    expect(html).toContain('style="height: 80mm;"');
  });

  // 8. width + heightが反映される
  it('8. should apply both width and height attributes to diagram container style', async () => {
    const markdown = `
\`\`\`mermaid {width=160mm height=80mm}
flowchart LR
    A --> B
\`\`\`
`;
    const html = await renderer.render(markdown);

    expect(html).toContain('style="width: 160mm; height: 80mm;"');
  });

  // 9. fit=containが反映される
  it('9. should reflect fit=contain via class and SVG preserveAspectRatio', async () => {
    const markdown = `
\`\`\`mermaid {fit=contain}
flowchart LR
    A --> B
\`\`\`
`;
    const html = await renderer.render(markdown);

    expect(html).toContain('md-tech-diagram-fit-contain');
    expect(html).toContain('preserveAspectRatio="xMidYMid meet"');
  });

  // 10. fit=fillが反映される
  it('10. should reflect fit=fill via class and SVG preserveAspectRatio="none"', async () => {
    const markdown = `
\`\`\`mermaid {fit=fill}
flowchart LR
    A --> B
\`\`\`
`;
    const html = await renderer.render(markdown);

    expect(html).toContain('md-tech-diagram-fit-fill');
    expect(html).toContain('preserveAspectRatio="none"');
  });

  // 11. align=leftが反映される
  it('11. should reflect align=left via container class', async () => {
    const markdown = `
\`\`\`mermaid {align=left}
flowchart LR
    A --> B
\`\`\`
`;
    const html = await renderer.render(markdown);

    expect(html).toContain('md-tech-diagram-align-left');
  });

  // 12. align=centerが反映される
  it('12. should reflect align=center via container class', async () => {
    const markdown = `
\`\`\`mermaid {align=center}
flowchart LR
    A --> B
\`\`\`
`;
    const html = await renderer.render(markdown);

    expect(html).toContain('md-tech-diagram-align-center');
  });

  // 13. align=rightが反映される
  it('13. should reflect align=right via container class', async () => {
    const markdown = `
\`\`\`mermaid {align=right}
flowchart LR
    A --> B
\`\`\`
`;
    const html = await renderer.render(markdown);

    expect(html).toContain('md-tech-diagram-align-right');
  });

  // 14. 通常コードブロックは通常コードとして残る
  it('14. should preserve non-mermaid code blocks as <pre><code>', async () => {
    const markdown = `
\`\`\`typescript
const greeting: string = "Hello World";
console.log(greeting);
\`\`\`
`;
    const html = await renderer.render(markdown);

    expect(html).toContain('<pre><code class="language-typescript">');
    expect(html).toContain('const greeting: string = &quot;Hello World&quot;;');
  });

  // 15. 日本語が保持される
  it('15. should correctly preserve and render Japanese characters in markdown and diagrams', async () => {
    const markdown = `
# 日本語の見出し

これは日本語の段落です。

\`\`\`mermaid
flowchart TD
    開始[処理の開始] --> 完了[処理の完了]
\`\`\`
`;
    const html = await renderer.render(markdown);

    expect(html).toContain('<h1>日本語の見出し</h1>');
    expect(html).toContain('<p>これは日本語の段落です。</p>');
    expect(html).toContain('処理の開始');
    expect(html).toContain('処理の完了');
  });

  it('Integration: should render PlantUML blocks into styled SVG containers alongside Mermaid', async () => {
    const markdown = `
# 統合テスト

\`\`\`plantuml {width=130mm height=60mm align=center}
@startuml
Client -> Server: API Request
Server --> Client: API Response
@enduml
\`\`\`
`;
    const html = await renderer.render(markdown);

    expect(html).toContain('<h1>統合テスト</h1>');
    expect(html).toContain(
      'class="md-tech-diagram md-tech-diagram-align-center md-tech-diagram-fit-contain"'
    );
    expect(html).toContain('style="width: 130mm; height: 60mm;"');
    expect(html).toContain('<svg');
    expect(html).toContain('Client');
    expect(html).toContain('Server');
  });

  // 16. 印刷・PDF向けのスタイル（見出し孤立防止、preの折り返し、テーブルの自動レイアウト）が含まれる
  it('16. should include layout rules for heading orphan prevention, pre wrapping, and table cell layout', async () => {
    const markdown = '# Heading\n\n```\nconst x = 1;\n```';
    const html = await renderer.render(markdown);

    expect(html).toContain('break-after: avoid;');
    expect(html).toContain('break-before: avoid;');
    expect(html).toContain('white-space: pre-wrap;');
    expect(html).toContain('overflow-wrap: anywhere;');
    expect(html).toContain('table-layout: auto;');
  });

  describe('Diagram Error Handling & Partial Recovery', () => {
    const brokenMermaidMarkdown = `
# Document Title

Intro paragraph.

\`\`\`mermaid
this is an invalid mermaid syntax !!!
\`\`\`

Conclusion paragraph.
`;

    it('should throw DiagramRenderError when target is pdf or undefined', async () => {
      await expect(renderer.render(brokenMermaidMarkdown)).rejects.toThrow();
      await expect(
        renderer.render(brokenMermaidMarkdown, { target: 'pdf' })
      ).rejects.toThrow();
    });

    it('should recover gracefully and embed error container without failing document when target is preview', async () => {
      const errorEvents: Array<{ type: string; index: number; message: string }> = [];

      const html = await renderer.render(brokenMermaidMarkdown, {
        target: 'preview',
        onDiagramError: (ev) => {
          errorEvents.push({
            type: ev.type,
            index: ev.index,
            message: ev.message,
          });
        },
      });

      // Entire document must still be intact
      expect(html).toContain('<h1>Document Title</h1>');
      expect(html).toContain('<p>Intro paragraph.</p>');
      expect(html).toContain('<p>Conclusion paragraph.</p>');

      // Error container must be rendered
      expect(html).toContain('md-tech-diagram-error');
      expect(html).toContain('Mermaid diagram rendering failed');

      // Callback must have received the error event
      expect(errorEvents.length).toBe(1);
      expect(errorEvents[0].type).toBe('mermaid');
      expect(errorEvents[0].index).toBe(1);
    });

    it('should render multiple diagrams where valid ones succeed even if one fails in preview mode', async () => {
      const mixedMarkdown = `
# Mixed Diagrams

\`\`\`mermaid
flowchart TD
  A[Node A] --> B[Node B]
\`\`\`

\`\`\`mermaid
invalid broken syntax ???
\`\`\`
`;

      const html = await renderer.render(mixedMarkdown, {
        target: 'preview',
      });

      expect(html).toContain('<h1>Mixed Diagrams</h1>');
      // First diagram should have succeeded with SVG
      expect(html).toContain('<svg');
      expect(html).toContain('Node A');
      // Second diagram should have failed with error box
      expect(html).toContain('md-tech-diagram-error');
      expect(html).toContain('Mermaid diagram rendering failed');
    });
  });
});
