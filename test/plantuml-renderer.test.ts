import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractDiagramBlocks } from '../src/parser/markdown-parser.js';
import { DiagramRenderError } from '../src/renderer/error.js';
import { PlantUmlRenderer } from '../src/renderer/plantuml-renderer.js';

// Detect local Java and PlantUML jar for environment-aware testing
function getTestConfiguration(): {
  isAvailable: boolean;
  jarPath?: string;
  javaPath?: string;
} {
  const homeDir = process.env.HOME ?? '';
  const jarCandidates = [
    process.env.PLANTUML_JAR_PATH,
    path.join(homeDir, '.cursor/extensions/jebbs.plantuml-2.18.1/plantuml.jar'),
    path.join(homeDir, '.vscode/extensions/jebbs.plantuml-2.18.1/plantuml.jar'),
    '/usr/local/opt/plantuml/libexec/plantuml.jar',
  ].filter((p): p is string => Boolean(p && fs.existsSync(p)));

  const javaCandidates = [
    process.env.PLANTUML_JAVA_PATH,
    process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin/java') : '',
    '/usr/local/opt/openjdk/bin/java',
    '/usr/bin/java',
  ].filter((p): p is string => Boolean(p && fs.existsSync(p)));

  const jarPath = jarCandidates[0];
  const javaPath = javaCandidates[0] ?? 'java';

  return {
    isAvailable: Boolean(jarPath),
    jarPath,
    javaPath,
  };
}

describe('PlantUmlRenderer', () => {
  const testEnv = getTestConfiguration();
  const createRenderer = (overrides?: { jarPath?: string; javaPath?: string }) => {
    return new PlantUmlRenderer({
      jarPath: overrides?.jarPath ?? testEnv.jarPath,
      javaPath: overrides?.javaPath ?? testEnv.javaPath,
      timeoutMs: 15000,
    });
  };

  it('6. should throw DiagramRenderError on empty or whitespace input', async () => {
    const renderer = createRenderer();
    await expect(renderer.render('')).rejects.toThrow(DiagramRenderError);
    await expect(renderer.render('   \n\t  ')).rejects.toThrow(DiagramRenderError);
  });

  it('8. should throw DiagramRenderError when jar file does not exist', async () => {
    const renderer = createRenderer({
      jarPath: '/non/existent/path/to/plantuml.jar',
    });
    const source = '@startuml\nAlice -> Bob: test\n@enduml';

    await expect(renderer.render(source)).rejects.toThrow(DiagramRenderError);
    await expect(renderer.render(source)).rejects.toThrow(/PlantUML jar was not found/);
  });

  it('9. should throw DiagramRenderError when Java executable fails to start', async () => {
    const renderer = createRenderer({
      javaPath: '/non/existent/path/to/java_binary',
    });
    const source = '@startuml\nAlice -> Bob: test\n@enduml';

    await expect(renderer.render(source)).rejects.toThrow(DiagramRenderError);
    await expect(renderer.render(source)).rejects.toThrow(/Java executable was not found/);
  });

  const describeWithPlantUml = testEnv.isAvailable ? describe : describe.skip;

  describeWithPlantUml('Integration tests with local PlantUML installation', () => {
    it('1, 5. should render sequence diagram to SVG containing <svg', async () => {
      const renderer = createRenderer();
      const source = `@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
@enduml`;

      const svg = await renderer.render(source);

      expect(typeof svg).toBe('string');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('Alice');
      expect(svg).toContain('Bob');
    });

    it('2. should render class diagram to SVG', async () => {
      const renderer = createRenderer();
      const source = `@startuml
class User {
  +name: string
  +email: string
}
class Account {
  +id: string
}
User "1" -- "*" Account
@enduml`;

      const svg = await renderer.render(source);

      expect(svg).toContain('<svg');
      expect(svg).toContain('User');
      expect(svg).toContain('Account');
    });

    it('3. should render activity diagram to SVG', async () => {
      const renderer = createRenderer();
      const source = `@startuml
start
:Initialize System;
if (Check Config) then (ok)
  :Run Process;
else (error)
  :Stop;
endif
stop
@enduml`;

      const svg = await renderer.render(source);

      expect(svg).toContain('<svg');
      expect(svg).toContain('Initialize System');
    });

    it('4. should render diagram with Japanese characters to SVG', async () => {
      const renderer = createRenderer();
      const source = `@startuml
actor ユーザー
participant "認証サーバー" as Auth
ユーザー -> Auth: ログイン要求
Auth --> ユーザー: 認証成功
@enduml`;

      const svg = await renderer.render(source);

      expect(svg).toContain('<svg');
      // PlantUML may encode multi-byte characters either as UTF-8 or XML numeric character references (&#12518;)
      const hasJapanese =
        svg.includes('ユーザー') || svg.includes('&#12518;&#12540;&#12470;&#12540;');
      expect(hasJapanese).toBe(true);
    }, 15000);

    it('7. should throw DiagramRenderError on invalid PlantUML syntax', async () => {
      const renderer = createRenderer();
      const invalidSource = 'invalid plantuml syntax !!!';

      await expect(renderer.render(invalidSource)).rejects.toThrow(DiagramRenderError);
    });

    it('10. should work reliably across multiple sequential renders', async () => {
      const renderer = createRenderer();
      const source1 = '@startuml\nA -> B: first\n@enduml';
      const source2 = '@startuml\nC -> D: second\n@enduml';

      const svg1 = await renderer.render(source1);
      const svg2 = await renderer.render(source2);

      expect(svg1).toContain('<svg');
      expect(svg1).toContain('first');
      expect(svg2).toContain('<svg');
      expect(svg2).toContain('second');
    }, 20000);

    it('Integration: should integrate seamlessly with extractDiagramBlocks', async () => {
      const renderer = createRenderer();
      const markdown = `# PlantUML Spec
\`\`\`plantuml {width=120mm height=60mm align=center}
@startuml
ComponentA -> ComponentB: Message
@enduml
\`\`\``;

      const blocks = extractDiagramBlocks(markdown);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('plantuml');
      expect(blocks[0].options.width).toBe('120mm');
      expect(blocks[0].options.height).toBe('60mm');
      expect(blocks[0].options.align).toBe('center');

      const svg = await renderer.render(blocks[0].source);
      expect(svg).toContain('<svg');
      expect(svg).toContain('ComponentA');
    });
  });
});
