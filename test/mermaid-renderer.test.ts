import { describe, it, expect } from 'vitest';
import { MermaidRenderer, DiagramRenderError, extractDiagramBlocks } from '../src/index.js';

describe('MermaidRenderer', () => {
  const renderer = new MermaidRenderer();

  // 1. flowchartをSVGへ変換できる & 4. 戻り値に <svg が含まれる
  it('1 & 4. should render flowchart diagram to SVG string containing <svg', async () => {
    const source = `flowchart TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Debug]`;

    const svg = await renderer.render(source);

    expect(svg).toBeDefined();
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Start');
    expect(svg).toContain('Great!');
  });

  // 2. sequenceDiagramをSVGへ変換できる
  it('2. should render sequenceDiagram to SVG string', async () => {
    const source = `sequenceDiagram
    autonumber
    Alice->>Bob: Hello John, how are you?
    Bob-->>Alice: I am good thanks!`;

    const svg = await renderer.render(source);

    expect(svg).toContain('<svg');
    expect(svg).toContain('Alice');
    expect(svg).toContain('Bob');
  });

  // 3. classDiagramをSVGへ変換できる
  it('3. should render classDiagram to SVG string', async () => {
    const source = `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()`;

    const svg = await renderer.render(source);

    expect(svg).toContain('<svg');
    expect(svg).toContain('Animal');
    expect(svg).toContain('Duck');
  });

  // 5. 空文字列で適切なエラーになる
  it('5. should throw DiagramRenderError when source is empty or whitespace only', async () => {
    await expect(renderer.render('')).rejects.toThrowError(DiagramRenderError);
    await expect(renderer.render('   \n  \t  ')).rejects.toThrowError(
      /Source is empty or whitespace only/
    );
  });

  // 6. 不正なMermaid構文でエラーになり、原因を保持する
  it('6. should throw DiagramRenderError with cause on invalid mermaid syntax', async () => {
    const invalidSource = 'invalid_diagram_type_xyz\nFoo Bar';

    try {
      await renderer.render(invalidSource);
      expect.unreachable('Should have thrown DiagramRenderError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(DiagramRenderError);
      const renderError = err as DiagramRenderError;
      expect(renderError.message).toContain('Failed to render Mermaid diagram');
      expect(renderError.cause).toBeDefined();
    }
  });

  // 7. 複数回renderしても正常に動作する
  it('7. should work reliably across multiple sequential renders', async () => {
    const diagram1 = 'graph LR\n  X --> Y';
    const diagram2 = 'graph TD\n  1 --> 2';
    const diagram3 = 'sequenceDiagram\n  A->>B: Ping';

    const svg1 = await renderer.render(diagram1);
    const svg2 = await renderer.render(diagram2);
    const svg3 = await renderer.render(diagram3);

    expect(svg1).toContain('<svg');
    expect(svg2).toContain('<svg');
    expect(svg3).toContain('<svg');
  });

  // オプション（テーマ指定）のテスト
  it('should accept custom theme options', async () => {
    const source = 'graph TD\n  A --> B';
    const darkSvg = await renderer.render(source, { theme: 'dark' });
    expect(darkSvg).toContain('<svg');
  });

  // 結合テスト: Markdown -> extractDiagramBlocks() -> MermaidRenderer.render() -> SVG
  it('Integration: should integrate seamlessly with extractDiagramBlocks', async () => {
    const markdown = `# Specification Document

Here is our system architecture:

\`\`\`mermaid {width=160mm fit=contain}
flowchart LR
    Client --> Server
    Server --> Database
\`\`\`

End of document.`;

    const blocks = extractDiagramBlocks(markdown);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('mermaid');

    const svg = await renderer.render(blocks[0].source);
    expect(svg).toContain('<svg');
    expect(svg).toContain('Client');
    expect(svg).toContain('Server');
    expect(svg).toContain('Database');
  });
});
