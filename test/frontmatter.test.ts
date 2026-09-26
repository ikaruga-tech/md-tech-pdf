import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  convertMarkdownToPdf,
  FrontMatterError,
  HtmlRenderer,
  parseFrontMatter,
  parseMarkdown,
  PdfGenerator,
  resolveDiagramOptions,
  resolvePdfOptions,
} from '../src/index.js';

describe('Front Matter Parser and Option Resolver', () => {
  // 1. Front MatterなしのMarkdownを正常に解析
  it('1. should parse Markdown without front matter', () => {
    const md = '# Title\n\nParagraph text.';
    const result = parseFrontMatter(md);

    expect(result.content).toBe(md);
    expect(result.options).toEqual({});
  });

  // 2. 空のFront Matter（---\n---）を正常に解析
  it('2. should parse empty front matter correctly', () => {
    const md = '---\n---\n# Title\n\nBody.';
    const result = parseFrontMatter(md);

    expect(result.content).toBe('# Title\n\nBody.');
    expect(result.options).toEqual({});
  });

  // 3. Front Matterが本文から除去される
  it('3. should strip front matter from content', () => {
    const md = `---
pdf:
  format: A4
---
# Actual Heading

Body content.`;
    const result = parseFrontMatter(md);

    expect(result.content).toBe('# Actual Heading\n\nBody content.');
    expect(result.content).not.toContain('pdf:');
    expect(result.content).not.toContain('format: A4');
  });

  // 4. pdf設定（format, landscape, margin）の解析
  it('4. should parse pdf options correctly', () => {
    const md = `---
pdf:
  format: A4
  landscape: true
  margin:
    top: 20mm
    right: 25mm
    bottom: 20mm
    left: 25mm
---
# Content`;
    const result = parseFrontMatter(md);

    expect(result.options.pdf).toEqual({
      format: 'A4',
      landscape: true,
      margin: {
        top: '20mm',
        right: '25mm',
        bottom: '20mm',
        left: '25mm',
      },
    });
  });

  // 5. diagram設定（width, height, fit, align）の解析
  it('5. should parse diagram options correctly', () => {
    const md = `---
diagram:
  width: 150mm
  height: 80mm
  fit: fill
  align: right
---
# Content`;
    const result = parseFrontMatter(md);

    expect(result.options.diagram).toEqual({
      width: '150mm',
      height: '80mm',
      fit: 'fill',
      align: 'right',
    });
  });

  // 6. mermaid設定（theme）の解析
  it('6. should parse mermaid options correctly', () => {
    const md = `---
mermaid:
  theme: neutral
---
# Content`;
    const result = parseFrontMatter(md);

    expect(result.options.mermaid).toEqual({
      theme: 'neutral',
    });
  });

  // 7. plantuml設定（javaPath, jarPath）の解析
  it('7. should parse plantuml options correctly', () => {
    const md = `---
plantuml:
  javaPath: /custom/bin/java
  jarPath: /custom/lib/plantuml.jar
---
# Content`;
    const result = parseFrontMatter(md);

    expect(result.options.plantuml).toEqual({
      javaPath: '/custom/bin/java',
      jarPath: '/custom/lib/plantuml.jar',
    });
  });

  // 8. 全設定を含むFront Matterの解析
  it('8. should parse full front matter with all sections', () => {
    const md = `---
pdf:
  format: A4
  landscape: false
  margin:
    top: 10mm
    bottom: 10mm
diagram:
  width: 100%
  fit: contain
  align: center
mermaid:
  theme: forest
plantuml:
  javaPath: java
  jarPath: ./plantuml.jar
---
# All Options`;
    const result = parseFrontMatter(md);

    expect(result.options.pdf?.format).toBe('A4');
    expect(result.options.pdf?.landscape).toBe(false);
    expect(result.options.pdf?.margin?.top).toBe('10mm');
    expect(result.options.diagram?.width).toBe('100%');
    expect(result.options.mermaid?.theme).toBe('forest');
    expect(result.options.plantuml?.jarPath).toBe('./plantuml.jar');
  });

  // 9. 優先順位: 個別属性がFront Matterを上書き
  it('9. should prioritize code block individual attributes over front matter', () => {
    const frontMatterDiagram = {
      width: '120mm',
      height: '70mm',
      fit: 'contain' as const,
      align: 'center' as const,
    };
    const blockRaw = {
      width: '160mm',
      align: 'right' as const,
    };

    const resolved = resolveDiagramOptions(blockRaw, frontMatterDiagram);

    expect(resolved.width).toBe('160mm'); // Overridden by block
    expect(resolved.height).toBe('70mm'); // Inherited from Front Matter
    expect(resolved.fit).toBe('contain'); // Inherited from Front Matter
    expect(resolved.align).toBe('right'); // Overridden by block
  });

  // 10. 優先順位: Front Matter未指定属性にデフォルトが適用
  it('10. should apply built-in defaults when not specified in front matter or block', () => {
    const frontMatterDiagram = {
      width: '100mm',
    };
    const blockRaw = {};

    const resolved = resolveDiagramOptions(blockRaw, frontMatterDiagram);

    expect(resolved.width).toBe('100mm');
    expect(resolved.height).toBeUndefined();
    expect(resolved.fit).toBe('contain'); // Built-in default
    expect(resolved.align).toBe('center'); // Built-in default
  });

  // 11. 優先順位: Front Matterで上書きされた値が適用
  it('11. should apply front matter default when block has no attributes', () => {
    const frontMatterDiagram = {
      width: '80mm',
      height: '40mm',
      fit: 'fill' as const,
      align: 'left' as const,
    };
    const blockRaw = {};

    const resolved = resolveDiagramOptions(blockRaw, frontMatterDiagram);

    expect(resolved).toEqual({
      width: '80mm',
      height: '40mm',
      fit: 'fill',
      align: 'left',
    });
  });

  // 12. 不正なdiagram.width（数値）でエラー
  it('12. should throw FrontMatterError for numeric diagram.width', () => {
    const md = `---
diagram:
  width: 123
---
# Test`;
    expect(() => parseFrontMatter(md)).toThrow(FrontMatterError);
    expect(() => parseFrontMatter(md)).toThrow(/diagram\.width/);
  });

  // 13. 不正なdiagram.width（無効な単位）でエラー
  it('13. should throw FrontMatterError for invalid dimension unit in diagram.width', () => {
    const md = `---
diagram:
  width: 100em
---
# Test`;
    expect(() => parseFrontMatter(md)).toThrow(FrontMatterError);
    expect(() => parseFrontMatter(md)).toThrow(/diagram\.width/);
  });

  // 14. 不正なdiagram.heightでエラー
  it('14. should throw FrontMatterError for invalid diagram.height', () => {
    const md = `---
diagram:
  height: -50px
---
# Test`;
    expect(() => parseFrontMatter(md)).toThrow(FrontMatterError);
    expect(() => parseFrontMatter(md)).toThrow(/diagram\.height/);
  });

  // 15. 不正なdiagram.fitでエラー
  it('15. should throw FrontMatterError for invalid diagram.fit', () => {
    const md = `---
diagram:
  fit: stretch
---
# Test`;
    expect(() => parseFrontMatter(md)).toThrow(FrontMatterError);
    expect(() => parseFrontMatter(md)).toThrow(/diagram\.fit = "stretch"/);
  });

  // 16. 不正なdiagram.alignでエラー
  it('16. should throw FrontMatterError for invalid diagram.align', () => {
    const md = `---
diagram:
  align: middle
---
# Test`;
    expect(() => parseFrontMatter(md)).toThrow(FrontMatterError);
    expect(() => parseFrontMatter(md)).toThrow(/diagram\.align = "middle"/);
  });

  // 17. 不正なpdf.formatでエラー
  it('17. should throw FrontMatterError for unsupported pdf.format', () => {
    const md = `---
pdf:
  format: A3
---
# Test`;
    expect(() => parseFrontMatter(md)).toThrow(FrontMatterError);
    expect(() => parseFrontMatter(md)).toThrow(/pdf\.format/);
  });

  // 18. 不正なpdf.marginでエラー
  it('18. should throw FrontMatterError for invalid pdf.margin', () => {
    const md = `---
pdf:
  margin:
    top: invalid_margin
---
# Test`;
    expect(() => parseFrontMatter(md)).toThrow(FrontMatterError);
    expect(() => parseFrontMatter(md)).toThrow(/pdf\.margin\.top/);
  });

  // 19. YAML構文エラー
  it('19. should throw FrontMatterError on invalid YAML syntax', () => {
    const md = `---
pdf: [unclosed array
  format: A4
---
# Test`;
    expect(() => parseFrontMatter(md)).toThrow(FrontMatterError);
    expect(() => parseFrontMatter(md)).toThrow(/Failed to parse YAML Front Matter/);
  });

  // 20. 既存Markdownが従来通り処理される（HTMLレンダリング結合）
  it('20. should render legacy markdown without front matter without regressions', async () => {
    const md = `# Regular Document

\`\`\`mermaid
flowchart TD
  A --> B
\`\`\`
`;
    const renderer = new HtmlRenderer();
    const html = await renderer.render(md);

    expect(html).toContain('<h1>Regular Document</h1>');
    expect(html).toContain(
      'class="md-tech-diagram md-tech-diagram-align-center md-tech-diagram-fit-contain"'
    );
    expect(html).toContain('<svg');
  });

  it('Integration: parseMarkdown should return content, options, and resolved diagrams', () => {
    const md = `---
diagram:
  width: 140mm
  align: right
---
# Spec

\`\`\`mermaid
flowchart LR
  Start --> End
\`\`\`

\`\`\`plantuml {width=100mm}
@startuml
A -> B
@enduml
\`\`\`
`;
    const result = parseMarkdown(md);

    expect(result.content).toContain('# Spec');
    expect(result.content).not.toContain('diagram:');
    expect(result.options.diagram?.width).toBe('140mm');
    expect(result.options.diagram?.align).toBe('right');

    expect(result.diagrams).toHaveLength(2);
    // 1st diagram inherits width: 140mm, align: right from front matter
    expect(result.diagrams[0].options.width).toBe('140mm');
    expect(result.diagrams[0].options.align).toBe('right');
    expect(result.diagrams[0].options.fit).toBe('contain');

    // 2nd diagram overrides width: 100mm, inherits align: right from front matter
    expect(result.diagrams[1].options.width).toBe('100mm');
    expect(result.diagrams[1].options.align).toBe('right');
    expect(result.diagrams[1].options.fit).toBe('contain');
  });

  it('resolvePdfOptions merges document options with application options', () => {
    const docPdf = {
      landscape: true,
      margin: {
        top: '20mm',
      },
    };
    const appPdf = {
      margin: {
        left: '30mm',
      },
    };

    const resolved = resolvePdfOptions(docPdf, appPdf);

    expect(resolved.format).toBe('A4');
    expect(resolved.landscape).toBe(true); // from docPdf
    expect(resolved.margin.top).toBe('20mm'); // from docPdf
    expect(resolved.margin.left).toBe('30mm'); // from appPdf (app overrides/supplements)
    expect(resolved.margin.right).toBe('15mm'); // default
    expect(resolved.margin.bottom).toBe('15mm'); // default
  });

  it('resolvePdfOptions resolves all margins when fully specified in document options', () => {
    const docPdf = {
      margin: {
        top: '5mm',
        right: '5mm',
        bottom: '5mm',
        left: '5mm',
      },
    };
    const resolved = resolvePdfOptions(docPdf);

    expect(resolved.margin).toEqual({
      top: '5mm',
      right: '5mm',
      bottom: '5mm',
      left: '5mm',
    });
  });

  it('resolvePdfOptions performs deep merge for partial margin specification', () => {
    const docPdf = {
      margin: {
        left: '5mm',
      },
    };
    const resolved = resolvePdfOptions(docPdf);

    expect(resolved.margin).toEqual({
      top: '15mm',
      right: '15mm',
      bottom: '15mm',
      left: '5mm',
    });
  });

  it('resolvePdfOptions applies default 15mm margins when no front matter pdf options exist', () => {
    const resolved = resolvePdfOptions(undefined);

    expect(resolved.margin).toEqual({
      top: '15mm',
      right: '15mm',
      bottom: '15mm',
      left: '15mm',
    });
  });

  it('Core API convertMarkdownToPdf passes parsed front matter margin to PdfGenerator', async () => {
    const tmpDir = path.resolve(process.cwd(), 'test-output-core-margin');
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpMd = path.join(tmpDir, 'margin-test.md');
    const tmpPdf = path.join(tmpDir, 'margin-test.pdf');

    const mdContent = `---
pdf:
  format: A4
  landscape: false
  margin:
    top: 5mm
    right: 5mm
    bottom: 5mm
    left: 5mm
---
# Margin Test

Content here.`;

    await fs.writeFile(tmpMd, mdContent, 'utf-8');

    const generateSpy = vi
      .spyOn(PdfGenerator.prototype, 'generate')
      .mockImplementation(async (_html, outputPath) => {
        await fs.writeFile(outputPath, '%PDF-dummy');
      });

    try {
      await convertMarkdownToPdf(tmpMd, { output: tmpPdf });

      expect(generateSpy).toHaveBeenCalledTimes(1);
      const passedPdfOptions = generateSpy.mock.calls[0][2];
      expect(passedPdfOptions).toBeDefined();
      expect(passedPdfOptions?.margin).toEqual({
        top: '5mm',
        right: '5mm',
        bottom: '5mm',
        left: '5mm',
      });
    } finally {
      generateSpy.mockRestore();
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  describe('style.css and style.customCss parsing', () => {
    it('should parse single style.css string', () => {
      const md = `---
style:
  css: "styles/custom.css"
---
# Test`;
      const parsed = parseFrontMatter(md);
      expect(parsed.options.style?.css).toBe('styles/custom.css');
    });

    it('should parse style.css array of strings', () => {
      const md = `---
style:
  css:
    - "styles/base.css"
    - "styles/theme.css"
---
# Test`;
      const parsed = parseFrontMatter(md);
      expect(parsed.options.style?.css).toEqual(['styles/base.css', 'styles/theme.css']);
    });

    it('should parse style.customCss string', () => {
      const md = `---
style:
  customCss: |
    .custom-box { border: 1px solid #ccc; }
---
# Test`;
      const parsed = parseFrontMatter(md);
      expect(parsed.options.style?.customCss).toContain('.custom-box { border: 1px solid #ccc; }');
    });

    it('should throw FrontMatterError for empty style.css string', () => {
      const md = `---
style:
  css: "   "
---
# Test`;
      expect(() => parseFrontMatter(md)).toThrow(FrontMatterError);
      expect(() => parseFrontMatter(md)).toThrow(/style\.css/);
    });

    it('should throw FrontMatterError for invalid style.css item in array', () => {
      const md = `---
style:
  css:
    - "styles/base.css"
    - 123
---
# Test`;
      expect(() => parseFrontMatter(md)).toThrow(FrontMatterError);
      expect(() => parseFrontMatter(md)).toThrow(/style\.css\[1\]/);
    });

    it('should throw FrontMatterError for non-string style.css type', () => {
      const md = `---
style:
  css: 12345
---
# Test`;
      expect(() => parseFrontMatter(md)).toThrow(FrontMatterError);
      expect(() => parseFrontMatter(md)).toThrow(/style\.css/);
    });

    it('should throw FrontMatterError for non-string style.customCss type', () => {
      const md = `---
style:
  customCss: { color: "red" }
---
# Test`;
      expect(() => parseFrontMatter(md)).toThrow(FrontMatterError);
      expect(() => parseFrontMatter(md)).toThrow(/style\.customCss/);
    });
  });
});
