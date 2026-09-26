import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { HtmlRenderer } from '../src/index.js';

const isJavaExecutable = (bin: string): boolean => {
  try {
    const res = spawnSync(bin, ['-version'], { stdio: 'ignore' });
    return res.status === 0;
  } catch {
    return false;
  }
};

const hasPlantUml = Boolean(
  [
    process.env.PLANTUML_JAR_PATH,
    path.join(process.env.HOME ?? '', '.cursor/extensions/jebbs.plantuml-2.18.1/plantuml.jar'),
    path.join(process.env.HOME ?? '', '.vscode/extensions/jebbs.plantuml-2.18.1/plantuml.jar'),
    '/usr/local/opt/plantuml/libexec/plantuml.jar',
  ].some((p) => p && fs.existsSync(p)) &&
  (isJavaExecutable(process.env.PLANTUML_JAVA_PATH ?? 'java') || isJavaExecutable('/usr/bin/java'))
);

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

  it.skipIf(!hasPlantUml)(
    'Integration: should render PlantUML blocks into styled SVG containers alongside Mermaid',
    async () => {
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
    }
  );

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
      await expect(renderer.render(brokenMermaidMarkdown, { target: 'pdf' })).rejects.toThrow();
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
      expect(html).toMatch(/<h1[^>]*>Document Title<\/h1>/);
      expect(html).toMatch(/<p[^>]*>Intro paragraph\.<\/p>/);
      expect(html).toMatch(/<p[^>]*>Conclusion paragraph\.<\/p>/);

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

      expect(html).toMatch(/<h1[^>]*>Mixed Diagrams<\/h1>/);
      // First diagram should have succeeded with SVG
      expect(html).toContain('<svg');
      expect(html).toContain('Node A');
      // Second diagram should have failed with error box
      expect(html).toContain('md-tech-diagram-error');
      expect(html).toContain('Mermaid diagram rendering failed');
    });
  });

  describe('resourceUrlTransformer', () => {
    it('should transform Markdown image src using provided callback', async () => {
      const markdown = `
# Image Test

![Local Image](./images/sample.png "Sample Title")
![Remote Image](https://example.com/logo.svg)
`;
      const transformedUrls: string[] = [];
      const html = await renderer.render(markdown, {
        resourceUrlTransformer: (url) => {
          transformedUrls.push(url);
          if (url.startsWith('./')) {
            return `vscode-webview://transformed/${url.slice(2)}`;
          }
          return url;
        },
      });

      expect(transformedUrls).toEqual(['./images/sample.png', 'https://example.com/logo.svg']);
      expect(html).toContain(
        '<img src="vscode-webview://transformed/images/sample.png" alt="Local Image" title="Sample Title">'
      );
      expect(html).toContain('<img src="https://example.com/logo.svg" alt="Remote Image">');
    });

    it('should transform raw HTML img tags while preserving other attributes', async () => {
      const markdown = `
# Raw HTML Image

<img src="./assets/chart.png" width="400" height="300" alt="Chart">
`;
      const html = await renderer.render(markdown, {
        resourceUrlTransformer: (url) => `https://transformed.local/${url}`,
      });

      expect(html).toContain(
        '<img src="https://transformed.local/./assets/chart.png" width="400" height="300" alt="Chart">'
      );
    });

    it('should preserve original image src when no resourceUrlTransformer is provided', async () => {
      const markdown = '![Default](./images/sample.png)';
      const html = await renderer.render(markdown);

      expect(html).toContain('<img src="./images/sample.png" alt="Default">');
    });
  });

  describe('source line mapping (data-line)', () => {
    it('should inject data-line attributes into block elements when target is preview', async () => {
      const markdown = [
        '# Heading 1', // line 1
        '',
        'A paragraph here.', // line 3
        '',
        '```ts', // line 5
        'const x = 1;',
        '```',
        '',
        '```mermaid', // line 9
        'graph TD;',
        '  A-->B;',
        '```',
      ].join('\n');

      const html = await renderer.render(markdown, { target: 'preview' });

      expect(html).toContain('<h1 data-line="1">Heading 1</h1>');
      expect(html).toContain('<p data-line="3">A paragraph here.</p>');
      expect(html).toMatch(/<code[^>]*data-line="5"/);
      expect(html).toMatch(/<div\s+data-line="9"\s+class="md-tech-diagram/);
    });

    it('should calculate data-line with Front Matter line offset', async () => {
      const markdown = [
        '---',
        'title: Document Title',
        'pdf:',
        '  format: A4',
        '---',
        '',
        '# First Heading', // line 7 (5 lines frontmatter + 1 empty line + 1)
        '',
        'A paragraph with front matter.', // line 9
      ].join('\n');

      const html = await renderer.render(markdown, { target: 'preview' });
      expect(html).toContain('<h1 data-line="7">First Heading</h1>');
      expect(html).toContain('<p data-line="9">A paragraph with front matter.</p>');
    });

    it('should NOT inject data-line attributes when target is pdf or undefined', async () => {
      const markdown = ['# Heading 1', '', 'A paragraph here.'].join('\n');

      const defaultHtml = await renderer.render(markdown);
      expect(defaultHtml).not.toContain('data-line=');
      expect(defaultHtml).toContain('<h1>Heading 1</h1>');
      expect(defaultHtml).toContain('<p>A paragraph here.</p>');

      const pdfHtml = await renderer.render(markdown, { target: 'pdf' });
      expect(pdfHtml).not.toContain('data-line=');
      expect(pdfHtml).toContain('<h1>Heading 1</h1>');
      expect(pdfHtml).toContain('<p>A paragraph here.</p>');
    });
  });

  describe('Custom CSS injection and cascade ordering', () => {
    it('should inject Front Matter style.customCss into <style>', async () => {
      const markdown = `---
style:
  customCss: |
    .custom-box { background-color: #f0f0f0; }
---
# Custom CSS Test`;
      const html = await renderer.render(markdown);
      expect(html).toContain('.custom-box { background-color: #f0f0f0; }');
    });

    it('should read external CSS file specified in style.css using basePath', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(process.cwd(), 'scratch-css-test-'));
      try {
        const cssPath = path.join(tmpDir, 'theme.css');
        await fs.promises.writeFile(cssPath, '.external-theme { color: blue; }', 'utf-8');

        const markdown = `---
style:
  css: "theme.css"
---
# External CSS Test`;

        const html = await renderer.render(markdown, { basePath: tmpDir });
        expect(html).toContain('.external-theme { color: blue; }');
      } finally {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should read multiple external CSS files specified as array in style.css', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(process.cwd(), 'scratch-css-test-'));
      try {
        await fs.promises.writeFile(path.join(tmpDir, 'base.css'), '.base { margin: 0; }', 'utf-8');
        await fs.promises.writeFile(
          path.join(tmpDir, 'colors.css'),
          '.colors { color: green; }',
          'utf-8'
        );

        const markdown = `---
style:
  css:
    - "base.css"
    - "colors.css"
---
# Multiple External CSS Test`;

        const html = await renderer.render(markdown, { basePath: tmpDir });
        expect(html).toContain('.base { margin: 0; }');
        expect(html).toContain('.colors { color: green; }');
        expect(html.indexOf('.base { margin: 0; }')).toBeLessThan(
          html.indexOf('.colors { color: green; }')
        );
      } finally {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should throw Error when specified CSS file does not exist', async () => {
      const markdown = `---
style:
  css: "non-existent-file.css"
---
# Error Test`;

      await expect(renderer.render(markdown, { basePath: '/non/existent/dir' })).rejects.toThrow(
        /Failed to load custom CSS file "non-existent-file\.css"/
      );
    });

    it('should respect cascade order: default -> font -> style.css -> style.customCss -> options.customCss', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(process.cwd(), 'scratch-css-test-'));
      try {
        await fs.promises.writeFile(
          path.join(tmpDir, 'external.css'),
          '/* 1. EXTERNAL CSS */',
          'utf-8'
        );

        const markdown = `---
style:
  font:
    family: "LINE Seed JP"
  css: "external.css"
  customCss: "/* 2. INLINE CUSTOM CSS */"
---
# Cascade Order Test`;

        const html = await renderer.render(markdown, {
          basePath: tmpDir,
          customCss: '/* 3. OPTION CUSTOM CSS */',
        });

        const fontPos = html.indexOf('font-family:');
        const externalPos = html.indexOf('/* 1. EXTERNAL CSS */');
        const inlinePos = html.indexOf('/* 2. INLINE CUSTOM CSS */');
        const optionPos = html.indexOf('/* 3. OPTION CUSTOM CSS */');

        expect(fontPos).toBeGreaterThan(-1);
        expect(externalPos).toBeGreaterThan(-1);
        expect(inlinePos).toBeGreaterThan(-1);
        expect(optionPos).toBeGreaterThan(-1);

        expect(fontPos).toBeLessThan(externalPos);
        expect(externalPos).toBeLessThan(inlinePos);
        expect(inlinePos).toBeLessThan(optionPos);
      } finally {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
