import { describe, expect, it } from 'vitest';
import {
  buildFontFamilyCss,
  buildGoogleFontsUrl,
  FrontMatterError,
  HtmlRenderer,
  parseFrontMatter,
} from '../src/index.js';

describe('Font Customization and Google Fonts Support', () => {
  // 1. ローカル本文フォント指定
  it('1. should parse local body font family correctly', () => {
    const md = `---
style:
  font:
    family: "Hiragino Sans"
---
# Content`;
    const result = parseFrontMatter(md);
    expect(result.options.style?.font?.family).toBe('Hiragino Sans');
    expect(result.options.style?.font?.codeFamily).toBeUndefined();
    expect(result.options.style?.font?.google).toBeUndefined();
  });

  // 2. ローカルコードフォント指定
  it('2. should parse local code font family correctly', () => {
    const md = `---
style:
  font:
    codeFamily: "Menlo"
---
# Content`;
    const result = parseFrontMatter(md);
    expect(result.options.style?.font?.codeFamily).toBe('Menlo');
    expect(result.options.style?.font?.family).toBeUndefined();
  });

  // 3. familyのみ
  it('3. should support family only specification', async () => {
    const md = `---
style:
  font:
    family: "Noto Sans JP"
---
# Content
\`\`\`js
console.log("test");
\`\`\`
`;
    const renderer = new HtmlRenderer();
    const html = await renderer.render(md);

    expect(html).toContain('body { font-family: "Noto Sans JP", sans-serif; }');
    expect(html).not.toContain('code, pre { font-family:');
  });

  // 4. codeFamilyのみ
  it('4. should support codeFamily only specification', async () => {
    const md = `---
style:
  font:
    codeFamily: "Roboto Mono"
---
# Content
`;
    const renderer = new HtmlRenderer();
    const html = await renderer.render(md);

    expect(html).toContain('code, pre { font-family: "Roboto Mono", monospace; }');
    expect(html).not.toContain('body { font-family:');
  });

  // 5. Google Fonts 1フォント
  it('5. should parse and build URL for single Google Font', () => {
    const url = buildGoogleFontsUrl({
      families: [{ name: 'Noto Sans JP', weights: [400] }],
    });
    expect(url).toBe('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400&display=swap');
  });

  // 6. Google Fonts 複数フォント
  it('6. should build URL for multiple Google Fonts', () => {
    const url = buildGoogleFontsUrl({
      families: [
        { name: 'Noto Sans JP', weights: [400, 700] },
        { name: 'Roboto Mono', weights: [400, 700] },
      ],
    });
    expect(url).toBe(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Roboto+Mono:wght@400;700&display=swap'
    );
  });

  // 7. 複数weight
  it('7. should format multiple weights separated by semicolons', () => {
    const url = buildGoogleFontsUrl({
      families: [{ name: 'Noto Sans JP', weights: [400, 500, 700] }],
    });
    expect(url).toBe(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap'
    );
  });

  // 8. weight重複と昇順ソート
  it('8. should deduplicate and sort weights in ascending order', () => {
    const url = buildGoogleFontsUrl({
      families: [{ name: 'Noto Sans JP', weights: [700, 400, 400, 500] }],
    });
    expect(url).toBe(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap'
    );
  });

  // 9. 不正weight
  it('9. should throw FrontMatterError on invalid weight values', () => {
    const invalidWeights = [350, 0, 1000, 'bold', -100];
    for (const invalidWeight of invalidWeights) {
      const md = `---
style:
  font:
    google:
      families:
        - name: "Noto Sans JP"
          weights: [${invalidWeight}]
---
# Content`;
      expect(() => parseFrontMatter(md)).toThrow(FrontMatterError);
    }
  });

  // 10. 空フォント名
  it('10. should throw FrontMatterError on empty font family name', () => {
    const md = `---
style:
  font:
    google:
      families:
        - name: ""
          weights: [400]
---
# Content`;
    expect(() => parseFrontMatter(md)).toThrow(FrontMatterError);
  });

  // 11. Google Fontsなしでは <link> が生成されない
  it('11. should not generate Google Fonts link tag when google fonts are not configured', async () => {
    const md = `---
style:
  font:
    family: "Hiragino Sans"
    codeFamily: "Menlo"
---
# Local Fonts
`;
    const renderer = new HtmlRenderer();
    const html = await renderer.render(md);

    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).toContain('body { font-family: "Hiragino Sans", sans-serif; }');
    expect(html).toContain('code, pre { font-family: "Menlo", monospace; }');
  });

  // 12. Google Fontsありでは正しい <link> が生成される
  it('12. should generate correct Google Fonts link tag when configured', async () => {
    const md = `---
style:
  font:
    family: "Noto Sans JP"
    codeFamily: "Roboto Mono"
    google:
      families:
        - name: "Noto Sans JP"
          weights: [400, 500, 700]
        - name: "Roboto Mono"
          weights: [400, 700]
---
# Web Fonts
`;
    const renderer = new HtmlRenderer();
    const html = await renderer.render(md);

    expect(html).toContain(
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&amp;family=Roboto+Mono:wght@400;700&amp;display=swap">'
    );
  });

  // 13. 本文CSSへfamilyが反映される
  it('13. should reflect family in body CSS declaration', async () => {
    const md = `---
style:
  font:
    family: "Source Sans Pro"
---
# Test`;
    const renderer = new HtmlRenderer();
    const html = await renderer.render(md);

    expect(html).toContain('body { font-family: "Source Sans Pro", sans-serif; }');
  });

  // 14. コードCSSへcodeFamilyが反映される
  it('14. should reflect codeFamily in code and pre CSS declarations', async () => {
    const md = `---
style:
  font:
    codeFamily: "Fira Code"
---
# Test`;
    const renderer = new HtmlRenderer();
    const html = await renderer.render(md);

    expect(html).toContain('code, pre { font-family: "Fira Code", monospace; }');
  });

  // 15. fallbackが存在する
  it('15. should always include sans-serif and monospace fallbacks', () => {
    const bodyCss = buildFontFamilyCss('MyCustomFont', 'sans-serif');
    const codeCss = buildFontFamilyCss('MyCodeFont', 'monospace');

    expect(bodyCss).toBe('"MyCustomFont", sans-serif');
    expect(codeCss).toBe('"MyCodeFont", monospace');
  });

  // 16. Front Matterなしで既存動作を維持
  it('16. should preserve default font behavior when no style.font is defined', async () => {
    const md = `---
pdf:
  format: A4
---
# Document Without Custom Fonts
`;
    const renderer = new HtmlRenderer();
    const html = await renderer.render(md);

    expect(html).not.toContain('fonts.googleapis.com');
    // Ensure body and code rules are not overridden with explicit font rules
    expect(html).not.toMatch(/body\s*\{\s*font-family:/);
    expect(html).not.toMatch(/code,\s*pre\s*\{\s*font-family:/);
    // Ensure default CSS variables exist
    expect(html).toContain('--font-sans:');
    expect(html).toContain('--font-mono:');
  });

  // 17. Google Fonts指定が既存Mermaid/PlantUML処理を壊さない
  it('17. should preserve Mermaid rendering alongside Google Fonts', async () => {
    const md = `---
style:
  font:
    family: "Noto Sans JP"
    google:
      families:
        - name: "Noto Sans JP"
          weights: [400]
---
# Diagram with Google Fonts

\`\`\`mermaid
flowchart TD
  A[Start] --> B[End]
\`\`\`
`;
    const renderer = new HtmlRenderer();
    const html = await renderer.render(md);

    expect(html).toContain('fonts.googleapis.com');
    expect(html).toContain('<svg');
    expect(html).toContain('class="md-tech-diagram');
  });

  // 18. Google Fonts URL内のスペースを含むフォント名が正しく処理される
  it('18. should correctly encode font names containing spaces', () => {
    const fontNames = ['Noto Sans JP', 'Roboto Mono', 'Source Code Pro', 'M PLUS 1p'];
    for (const name of fontNames) {
      const url = buildGoogleFontsUrl({
        families: [{ name, weights: [400] }],
      });
      expect(url).not.toContain(' ');
      expect(url).toContain(encodeURIComponent(name).replace(/%20/g, '+'));
    }
  });

  // 19. families: [] はエラーとせずGoogle Fontsなしとして扱う
  it('19. should treat empty families array as no Google Fonts without error', async () => {
    const md = `---
style:
  font:
    family: "Hiragino Sans"
    google:
      families: []
---
# Empty Google Families
`;
    const result = parseFrontMatter(md);
    expect(result.options.style?.font?.google?.families).toEqual([]);

    const renderer = new HtmlRenderer();
    const html = await renderer.render(md);
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).toContain('body { font-family: "Hiragino Sans", sans-serif; }');
  });

  // 20. CSS Injection安全性の検証
  it('20. should sanitize dangerous characters in font family to prevent CSS injection', () => {
    const dangerousInput = 'Noto Sans"; } body { background: red; } /*';
    const safeCss = buildFontFamilyCss(dangerousInput, 'sans-serif');

    expect(safeCss).not.toContain(';');
    expect(safeCss).not.toContain('}');
    expect(safeCss).not.toContain('"Noto Sans";');
    expect(safeCss).toBe('"Noto Sans  body  background: red  /*", sans-serif');
  });
});
