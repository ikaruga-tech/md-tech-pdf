import { describe, it, expect } from 'vitest';
import { extractDiagramBlocks, parseMarkdown, DiagramParseError } from '../src/index.js';

describe('Markdown Parser & Diagram Extractor', () => {
  // 1. Mermaidブロックを解析できる
  it('1. should parse mermaid block correctly', () => {
    const md = `\`\`\`mermaid
flowchart LR
    A --> B
\`\`\``;
    const blocks = extractDiagramBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('mermaid');
    expect(blocks[0].source).toBe('flowchart LR\n    A --> B');
    expect(blocks[0].options).toEqual({
      fit: 'contain',
      align: 'center',
      width: undefined,
      height: undefined,
    });
  });

  // 2. PlantUMLブロックを解析できる
  it('2. should parse plantuml block correctly', () => {
    const md = `\`\`\`plantuml
@startuml
Alice -> Bob
@enduml
\`\`\``;
    const blocks = extractDiagramBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('plantuml');
    expect(blocks[0].source).toBe('@startuml\nAlice -> Bob\n@enduml');
  });

  // 3. 1つのMarkdownに複数の図が存在する
  it('3. should parse multiple diagram blocks in one markdown document', () => {
    const md = `
# Title

\`\`\`mermaid {width=100px}
flowchart TD
  A --> B
\`\`\`

Some paragraph.

\`\`\`plantuml {height=200px}
@startuml
C -> D
@enduml
\`\`\`
`;
    const blocks = extractDiagramBlocks(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('mermaid');
    expect(blocks[0].options.width).toBe('100px');
    expect(blocks[1].type).toBe('plantuml');
    expect(blocks[1].options.height).toBe('200px');
  });

  // 4. 属性指定なし
  it('4. should use default options when no attributes are specified', () => {
    const md = `\`\`\`mermaid
graph TD
  A --> B
\`\`\``;
    const [block] = extractDiagramBlocks(md);
    expect(block.options).toEqual({
      fit: 'contain',
      align: 'center',
      width: undefined,
      height: undefined,
    });
  });

  // 5. widthのみ
  it('5. should parse width attribute correctly', () => {
    const md = `\`\`\`mermaid {width=160mm}
graph TD
  A --> B
\`\`\``;
    const [block] = extractDiagramBlocks(md);
    expect(block.options.width).toBe('160mm');
    expect(block.options.height).toBeUndefined();
    expect(block.options.fit).toBe('contain');
    expect(block.options.align).toBe('center');
  });

  // 6. heightのみ
  it('6. should parse height attribute correctly', () => {
    const md = `\`\`\`mermaid {height=80mm}
graph TD
  A --> B
\`\`\``;
    const [block] = extractDiagramBlocks(md);
    expect(block.options.height).toBe('80mm');
    expect(block.options.width).toBeUndefined();
  });

  // 7. width + height
  it('7. should parse both width and height attributes', () => {
    const md = `\`\`\`mermaid {width=160mm height=80mm}
graph TD
  A --> B
\`\`\``;
    const [block] = extractDiagramBlocks(md);
    expect(block.options.width).toBe('160mm');
    expect(block.options.height).toBe('80mm');
  });

  // 8. fit=contain
  it('8. should parse fit=contain', () => {
    const md = `\`\`\`mermaid {fit=contain}
graph TD
  A --> B
\`\`\``;
    const [block] = extractDiagramBlocks(md);
    expect(block.options.fit).toBe('contain');
  });

  // 9. fit=fill
  it('9. should parse fit=fill', () => {
    const md = `\`\`\`mermaid {fit=fill}
graph TD
  A --> B
\`\`\``;
    const [block] = extractDiagramBlocks(md);
    expect(block.options.fit).toBe('fill');
  });

  // 10. align=left
  it('10. should parse align=left', () => {
    const md = `\`\`\`mermaid {align=left}
graph TD
  A --> B
\`\`\``;
    const [block] = extractDiagramBlocks(md);
    expect(block.options.align).toBe('left');
  });

  // 11. align=center
  it('11. should parse align=center', () => {
    const md = `\`\`\`mermaid {align=center}
graph TD
  A --> B
\`\`\``;
    const [block] = extractDiagramBlocks(md);
    expect(block.options.align).toBe('center');
  });

  // 12. align=right
  it('12. should parse align=right', () => {
    const md = `\`\`\`mermaid {align=right}
graph TD
  A --> B
\`\`\``;
    const [block] = extractDiagramBlocks(md);
    expect(block.options.align).toBe('right');
  });

  // 13. %指定
  it('13. should parse percentage dimension units', () => {
    const md = `\`\`\`plantuml {width=100% height=50%}
@startuml
A -> B
@enduml
\`\`\``;
    const [block] = extractDiagramBlocks(md);
    expect(block.options.width).toBe('100%');
    expect(block.options.height).toBe('50%');
  });

  // 14. auto指定
  it('14. should parse auto for dimensions', () => {
    const md = `\`\`\`mermaid {width=auto height=auto}
graph TD
  A --> B
\`\`\``;
    const [block] = extractDiagramBlocks(md);
    expect(block.options.width).toBe('auto');
    expect(block.options.height).toBe('auto');
  });

  // 15. 小数値
  it('15. should parse decimal dimension values with various units (px, mm, cm, in)', () => {
    const md = `\`\`\`mermaid {width=8.5in height=12.5cm}
graph TD
  A --> B
\`\`\``;
    const [block] = extractDiagramBlocks(md);
    expect(block.options.width).toBe('8.5in');
    expect(block.options.height).toBe('12.5cm');
  });

  // 16. 不正なwidth
  it('16. should throw DiagramParseError for invalid width values', () => {
    expect(() => extractDiagramBlocks('```mermaid {width=160}\nA-->B\n```')).toThrowError(
      DiagramParseError
    );
    expect(() => extractDiagramBlocks('```mermaid {width=10em}\nA-->B\n```')).toThrowError(
      'Invalid diagram width: "10em"'
    );
    expect(() => extractDiagramBlocks('```mermaid {width=abc}\nA-->B\n```')).toThrowError(
      'Invalid diagram width: "abc"'
    );
    expect(() => extractDiagramBlocks('```mermaid {width=-10mm}\nA-->B\n```')).toThrowError(
      'Invalid diagram width: "-10mm"'
    );
    expect(() => extractDiagramBlocks('```mermaid {width=0px}\nA-->B\n```')).toThrowError(
      'Value must be greater than 0'
    );
  });

  // 17. 不正なheight
  it('17. should throw DiagramParseError for invalid height values', () => {
    expect(() => extractDiagramBlocks('```mermaid {height=100}\nA-->B\n```')).toThrowError(
      'Invalid diagram height: "100"'
    );
    expect(() => extractDiagramBlocks('```mermaid {height=-5px}\nA-->B\n```')).toThrowError(
      'Invalid diagram height: "-5px"'
    );
    expect(() => extractDiagramBlocks('```mermaid {height=0cm}\nA-->B\n```')).toThrowError(
      'Value must be greater than 0'
    );
  });

  // 18. 不正なfit
  it('18. should throw DiagramParseError for invalid fit', () => {
    expect(() => extractDiagramBlocks('```mermaid {fit=cover}\nA-->B\n```')).toThrowError(
      'Invalid diagram fit: "cover"'
    );
  });

  // 19. 不正なalign
  it('19. should throw DiagramParseError for invalid align', () => {
    expect(() => extractDiagramBlocks('```mermaid {align=justify}\nA-->B\n```')).toThrowError(
      'Invalid diagram align: "justify"'
    );
  });

  // 20. 通常のコードブロックを図として扱わない
  it('20. should ignore normal code blocks like typescript, javascript, json', () => {
    const md = `
\`\`\`typescript
console.log('hello');
\`\`\`

\`\`\`json
{ "key": "value" }
\`\`\`
`;
    const blocks = extractDiagramBlocks(md);
    expect(blocks).toHaveLength(0);
  });

  // 境界条件・複合ケース
  it('should handle mixed content with paragraphs and diagrams, preserving indentation and line numbers', () => {
    const md = `文章1行目
文章2行目

\`\`\`mermaid {width=160mm height=80mm fit=contain align=center}
flowchart LR
    A --> B
\`\`\`

中間文章

\`\`\`plantuml {width=100%}
@startuml
A -> B
@enduml
\`\`\`

終了文章`;

    const blocks = extractDiagramBlocks(md);
    expect(blocks).toHaveLength(2);

    expect(blocks[0].type).toBe('mermaid');
    expect(blocks[0].source).toBe('flowchart LR\n    A --> B');
    expect(blocks[0].options).toEqual({
      width: '160mm',
      height: '80mm',
      fit: 'contain',
      align: 'center',
    });
    expect(blocks[0].line).toBe(4);

    expect(blocks[1].type).toBe('plantuml');
    expect(blocks[1].source).toBe('@startuml\nA -> B\n@enduml');
    expect(blocks[1].options.width).toBe('100%');
    expect(blocks[1].line).toBe(11);
  });

  it('should support parseMarkdown API returning ParsedMarkdown structure', () => {
    const md = `\`\`\`mermaid
graph TD
  A --> B
\`\`\``;
    const result = parseMarkdown(md);
    expect(result).toBeDefined();
    expect(result.diagrams).toHaveLength(1);
    expect(result.diagrams[0].type).toBe('mermaid');
  });

  it('should throw DiagramParseError with line number on invalid attribute syntax', () => {
    const md = `\`\`\`mermaid {width=100em}
graph TD
  A --> B
\`\`\``;
    try {
      extractDiagramBlocks(md);
      expect.unreachable('Should have thrown error');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(DiagramParseError);
      const parseError = err as DiagramParseError;
      expect(parseError.diagramType).toBe('mermaid');
      expect(parseError.attributeName).toBe('width');
      expect(parseError.invalidValue).toBe('100em');
      expect(parseError.line).toBe(1);
    }
  });

  it('should throw DiagramParseError on malformed attribute braces', () => {
    const md = `\`\`\`mermaid {width=100px
graph TD
  A --> B
\`\`\``;
    expect(() => extractDiagramBlocks(md)).toThrowError(DiagramParseError);
  });
});
