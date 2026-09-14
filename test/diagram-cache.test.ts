import { describe, it, expect, vi } from 'vitest';
import {
  DiagramRenderCache,
  computeDiagramCacheKey,
  type DiagramRenderer,
  HtmlRenderer,
} from '../src/index.js';

describe('DiagramRenderCache & computeDiagramCacheKey', () => {
  describe('computeDiagramCacheKey', () => {
    it('should compute consistent hash for identical inputs', () => {
      const key1 = computeDiagramCacheKey('mermaid', 'graph TD; A-->B;', { theme: 'forest' });
      const key2 = computeDiagramCacheKey('mermaid', 'graph TD; A-->B;', { theme: 'forest' });

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA-256 hex
    });

    it('should differentiate between different diagram types with same source', () => {
      const mermaidKey = computeDiagramCacheKey('mermaid', 'A -> B');
      const plantumlKey = computeDiagramCacheKey('plantuml', 'A -> B');

      expect(mermaidKey).not.toBe(plantumlKey);
    });

    it('should differentiate when source code changes', () => {
      const key1 = computeDiagramCacheKey('mermaid', 'graph TD; A-->B;');
      const key2 = computeDiagramCacheKey('mermaid', 'graph TD; A-->C;');

      expect(key1).not.toBe(key2);
    });

    it('should differentiate when relevant options change (e.g. mermaid theme)', () => {
      const keyDefault = computeDiagramCacheKey('mermaid', 'graph TD; A-->B;');
      const keyForest = computeDiagramCacheKey('mermaid', 'graph TD; A-->B;', { theme: 'forest' });
      const keyDark = computeDiagramCacheKey('mermaid', 'graph TD; A-->B;', { theme: 'dark' });

      expect(keyDefault).not.toBe(keyForest);
      expect(keyForest).not.toBe(keyDark);
    });

    it('should differentiate when plantuml jarPath or javaPath changes', () => {
      const key1 = computeDiagramCacheKey('plantuml', '@startuml\nA->B\n@enduml', {
        javaPath: '/usr/bin/java',
      });
      const key2 = computeDiagramCacheKey('plantuml', '@startuml\nA->B\n@enduml', {
        javaPath: '/usr/local/bin/java',
      });

      expect(key1).not.toBe(key2);
    });
  });

  describe('DiagramRenderCache class', () => {
    it('should store and retrieve cached SVGs by key', () => {
      const cache = new DiagramRenderCache();
      expect(cache.size).toBe(0);
      expect(cache.has('test-key')).toBe(false);

      cache.set('test-key', '<svg id="1"></svg>');
      expect(cache.size).toBe(1);
      expect(cache.has('test-key')).toBe(true);
      expect(cache.get('test-key')).toBe('<svg id="1"></svg>');

      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('test-key')).toBeUndefined();
    });

    it('should allow deletion of individual entries', () => {
      const cache = new DiagramRenderCache();
      cache.set('key-a', '<svg a></svg>');
      cache.set('key-b', '<svg b></svg>');

      expect(cache.delete('key-a')).toBe(true);
      expect(cache.has('key-a')).toBe(false);
      expect(cache.has('key-b')).toBe(true);
      expect(cache.size).toBe(1);
    });
  });

  describe('HtmlRenderer integration with DiagramRenderCache', () => {
    it('should use cached SVG on second render and skip underlying renderer call', async () => {
      const mockRender = vi.fn().mockResolvedValue('<svg>mocked</svg>');
      const mockRenderer: DiagramRenderer = {
        render: mockRender,
      };

      const cache = new DiagramRenderCache();
      const renderer = new HtmlRenderer({
        mermaidRenderer: mockRenderer,
        diagramCache: cache,
      });

      const markdown = `
\`\`\`mermaid
graph TD;
  A --> B;
\`\`\`
`;

      // 1st render (Cache MISS)
      const html1 = await renderer.render(markdown);
      expect(html1).toContain('mocked');
      expect(mockRender).toHaveBeenCalledTimes(1);
      expect(cache.size).toBe(1);

      // 2nd render with same source (Cache HIT)
      const html2 = await renderer.render(markdown);
      expect(html2).toContain('mocked');
      // Renderer should NOT be called again
      expect(mockRender).toHaveBeenCalledTimes(1);

      // Render with modified source (Cache MISS)
      const modifiedMarkdown = `
\`\`\`mermaid
graph TD;
  A --> C;
\`\`\`
`;
      const html3 = await renderer.render(modifiedMarkdown);
      expect(html3).toContain('mocked');
      expect(mockRender).toHaveBeenCalledTimes(2);
      expect(cache.size).toBe(2);
    });

    it('should NOT cache failed diagram rendering results', async () => {
      let shouldFail = true;
      const mockRender = vi.fn().mockImplementation(async () => {
        if (shouldFail) {
          throw new Error('Syntax error in diagram');
        }
        return '<svg>recovered</svg>';
      });

      const mockRenderer: DiagramRenderer = {
        render: mockRender,
      };

      const cache = new DiagramRenderCache();
      const renderer = new HtmlRenderer({
        mermaidRenderer: mockRenderer,
        diagramCache: cache,
      });

      const markdown = `
\`\`\`mermaid
invalid syntax
\`\`\`
`;

      // 1st render in preview mode -> error container generated, NOT cached
      const htmlError = await renderer.render(markdown, { target: 'preview' });
      expect(htmlError).toContain('md-tech-diagram-error');
      expect(mockRender).toHaveBeenCalledTimes(1);
      expect(cache.size).toBe(0);

      // 2nd render after user fixes syntax
      shouldFail = false;
      const htmlSuccess = await renderer.render(markdown, { target: 'preview' });
      expect(htmlSuccess).toContain('recovered');
      expect(mockRender).toHaveBeenCalledTimes(2);
      expect(cache.size).toBe(1);
    });

    it('should retain diagram cache across paragraph or text edits in the same document', async () => {
      const mockMermaidRender = vi.fn().mockResolvedValue('<svg id="mermaid"></svg>');
      const mockPlantumlRender = vi.fn().mockResolvedValue('<svg id="plantuml"></svg>');

      const cache = new DiagramRenderCache();
      const renderer = new HtmlRenderer({
        mermaidRenderer: { render: mockMermaidRender },
        plantumlRenderer: { render: mockPlantumlRender },
        diagramCache: cache,
      });

      const docV1 = `
# Title

First paragraph.

\`\`\`mermaid
graph TD; A-->B;
\`\`\`

\`\`\`plantuml
@startuml
Alice -> Bob
@enduml
\`\`\`
`;

      await renderer.render(docV1);
      expect(mockMermaidRender).toHaveBeenCalledTimes(1);
      expect(mockPlantumlRender).toHaveBeenCalledTimes(1);
      expect(cache.size).toBe(2);

      // Edit only paragraph text
      const docV2 = `
# Title

Updated paragraph text with more explanations.

\`\`\`mermaid
graph TD; A-->B;
\`\`\`

\`\`\`plantuml
@startuml
Alice -> Bob
@enduml
\`\`\`
`;

      const htmlV2 = await renderer.render(docV2);
      expect(htmlV2).toContain('Updated paragraph text with more explanations.');
      expect(mockMermaidRender).toHaveBeenCalledTimes(1);
      expect(mockPlantumlRender).toHaveBeenCalledTimes(1);
    });

    it('should share cache for duplicate diagrams in the same document (1st MISS, 2nd HIT)', async () => {
      const mockRender = vi.fn().mockResolvedValue('<svg id="dup"></svg>');
      const cache = new DiagramRenderCache();
      const renderer = new HtmlRenderer({
        mermaidRenderer: { render: mockRender },
        diagramCache: cache,
      });

      const events: Array<{ hit: boolean; index: number }> = [];
      const markdown = `
\`\`\`mermaid
flowchart TD; A-->B;
\`\`\`

Middle text.

\`\`\`mermaid
flowchart TD; A-->B;
\`\`\`
`;

      await renderer.render(markdown, {
        onCacheEvent: (e) => events.push({ hit: e.hit, index: e.index }),
      });

      expect(mockRender).toHaveBeenCalledTimes(1);
      expect(events).toEqual([
        { hit: false, index: 1 },
        { hit: true, index: 2 },
      ]);
    });

    it('should share cache across different documents when diagram sources match', async () => {
      const mockRender = vi.fn().mockResolvedValue('<svg id="shared"></svg>');
      const cache = new DiagramRenderCache();
      const renderer = new HtmlRenderer({
        mermaidRenderer: { render: mockRender },
        diagramCache: cache,
      });

      const eventsA: Array<{ hit: boolean }> = [];
      const docA = '# Doc A\n```mermaid\nsequenceDiagram\nA->>B: Hi\n```';
      await renderer.render(docA, { onCacheEvent: (e) => eventsA.push({ hit: e.hit }) });
      expect(mockRender).toHaveBeenCalledTimes(1);
      expect(eventsA[0].hit).toBe(false);

      const eventsB: Array<{ hit: boolean }> = [];
      const docB = '# Doc B\n```mermaid\nsequenceDiagram\nA->>B: Hi\n```';
      await renderer.render(docB, { onCacheEvent: (e) => eventsB.push({ hit: e.hit }) });
      expect(mockRender).toHaveBeenCalledTimes(1); // Still 1 call
      expect(eventsB[0].hit).toBe(true);
    });

    it('should invalidate cache when source changes by even 1 character', async () => {
      const mockRender = vi.fn().mockResolvedValue('<svg></svg>');
      const cache = new DiagramRenderCache();
      const renderer = new HtmlRenderer({
        mermaidRenderer: { render: mockRender },
        diagramCache: cache,
      });

      const doc1 = '```mermaid\ngraph TD; A-->B;\n```';
      await renderer.render(doc1);
      expect(mockRender).toHaveBeenCalledTimes(1);

      // Change 'B' to 'C' (1 char)
      const doc2 = '```mermaid\ngraph TD; A-->C;\n```';
      await renderer.render(doc2);
      expect(mockRender).toHaveBeenCalledTimes(2);
    });
  });
});
