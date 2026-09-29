import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  DiagramRenderError,
  HtmlRenderer,
  MermaidRenderer,
  PdfGenerateError,
  PdfGenerator,
  PlantUmlRenderer,
  buildMermaidCliArgs,
  ensurePuppeteerConfigFile,
  isBrowserLaunchFailure,
  isJavaUnavailableOutput,
  type DiagramErrorEvent,
  type DiagramRenderer,
} from '../src/index.js';

const NON_EXISTENT_BROWSER = '/non/existent/browser/chrome';
const SYSTEM_CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const systemChrome = SYSTEM_CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));

describe('Mermaid CLI browser integration', () => {
  it('should not pass a puppeteer config when no browser path is given', () => {
    const args = buildMermaidCliArgs(['cli.js'], { theme: 'dark' });
    expect(args).toEqual(['cli.js', '-i', '-', '-o', '-', '-e', 'svg', '-q', '-t', 'dark']);
  });

  it('should pass a puppeteer config file with executablePath and new headless mode', () => {
    const args = buildMermaidCliArgs([], { browserExecutablePath: NON_EXISTENT_BROWSER });
    const configIndex = args.indexOf('-p');
    expect(configIndex).toBeGreaterThan(-1);

    const configPath = args[configIndex + 1];
    expect(path.dirname(configPath)).toBe(os.tmpdir());
    expect(JSON.parse(fs.readFileSync(configPath, 'utf-8'))).toEqual({
      executablePath: NON_EXISTENT_BROWSER,
      headless: true,
    });
  });

  it('should reuse the same config file for the same browser path', () => {
    expect(ensurePuppeteerConfigFile(NON_EXISTENT_BROWSER)).toBe(
      ensurePuppeteerConfigFile(NON_EXISTENT_BROWSER)
    );
    expect(ensurePuppeteerConfigFile('/other/browser')).not.toBe(
      ensurePuppeteerConfigFile(NON_EXISTENT_BROWSER)
    );
  });

  it('should classify browser launch failures from Mermaid CLI stderr', () => {
    expect(isBrowserLaunchFailure('Error: Could not find Chrome (ver. 131.0)')).toBe(true);
    expect(isBrowserLaunchFailure('Could not find chrome-headless-shell (rev. 131)')).toBe(true);
    expect(isBrowserLaunchFailure('Error: Browser was not found at the configured path')).toBe(
      true
    );
    expect(isBrowserLaunchFailure('Failed to launch the browser process! spawn ENOENT')).toBe(true);
    expect(isBrowserLaunchFailure('Parse error on line 1')).toBe(false);
  });

  it('should reject with BROWSER_NOT_FOUND when the configured browser does not exist', async () => {
    const renderer = new MermaidRenderer({ browserExecutablePath: NON_EXISTENT_BROWSER });
    const error = await renderer.render('graph TD\n  A --> B').catch((err: unknown) => err);
    expect(error).toBeInstanceOf(DiagramRenderError);
    expect((error as DiagramRenderError).code).toBe('BROWSER_NOT_FOUND');
  });

  it('should classify Mermaid syntax errors as RENDER_FAILED', async () => {
    const renderer = new MermaidRenderer();
    const error = await renderer.render('this is not mermaid !!!').catch((err: unknown) => err);
    expect(error).toBeInstanceOf(DiagramRenderError);
    expect((error as DiagramRenderError).code).toBe('RENDER_FAILED');
  });

  const itWithSystemChrome = systemChrome ? it : it.skip;
  itWithSystemChrome('should render Mermaid with an installed system browser', async () => {
    const renderer = new MermaidRenderer({ browserExecutablePath: systemChrome });
    const svg = await renderer.render('graph TD\n  Start --> Done');
    expect(svg).toContain('<svg');
    expect(svg).toContain('Start');
  });
});

describe('PlantUML error codes', () => {
  const source = '@startuml\nAlice -> Bob: test\n@enduml';

  it('should use PLANTUML_JAR_NOT_CONFIGURED when no jar is available', async () => {
    const renderer = new PlantUmlRenderer({ jarPath: '' });
    const error = await renderer.render(source).catch((err: unknown) => err);
    expect((error as DiagramRenderError).code).toBe('PLANTUML_JAR_NOT_CONFIGURED');
  });

  it('should use PLANTUML_JAR_NOT_FOUND when the jar path does not exist', async () => {
    const renderer = new PlantUmlRenderer({ jarPath: '/non/existent/plantuml.jar' });
    const error = await renderer.render(source).catch((err: unknown) => err);
    expect((error as DiagramRenderError).code).toBe('PLANTUML_JAR_NOT_FOUND');
  });

  it('should use JAVA_NOT_FOUND when Java cannot be started', async () => {
    const renderer = new PlantUmlRenderer({
      jarPath: import.meta.filename,
      javaPath: '/non/existent/java',
    });
    const error = await renderer.render(source).catch((err: unknown) => err);
    expect((error as DiagramRenderError).code).toBe('JAVA_NOT_FOUND');
  });

  it('should detect java launchers that exist but cannot run Java', () => {
    expect(
      isJavaUnavailableOutput(
        'The operation couldn’t be completed. Unable to locate a Java Runtime.\nPlease visit http://www.java.com'
      )
    ).toBe(true);
    expect(isJavaUnavailableOutput('No Java runtime present, requesting install.')).toBe(true);
    expect(
      isJavaUnavailableOutput('exec failed: ... "Bad CPU type in executable" UserInfo={...}')
    ).toBe(true);
    expect(isJavaUnavailableOutput('Syntax Error? (Assumed diagram type: sequence)')).toBe(false);
  });

  it.skipIf(process.platform === 'win32')(
    'should use JAVA_NOT_FOUND for a java stub that exits without a runtime',
    async () => {
      const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-tech-pdf-java-stub-'));
      const stubPath = path.join(stubDir, 'java');
      fs.writeFileSync(
        stubPath,
        '#!/bin/sh\ncat > /dev/null\necho "Unable to locate a Java Runtime." >&2\nexit 1\n',
        { mode: 0o755 }
      );
      try {
        const renderer = new PlantUmlRenderer({
          jarPath: import.meta.filename,
          javaPath: stubPath,
        });
        const error = await renderer.render(source).catch((err: unknown) => err);
        expect((error as DiagramRenderError).code).toBe('JAVA_NOT_FOUND');
      } finally {
        fs.rmSync(stubDir, { recursive: true, force: true });
      }
    }
  );
});

describe('HtmlRenderer diagramErrorHtmlBuilder', () => {
  const failingRenderer: DiagramRenderer = {
    render: async () => {
      throw new DiagramRenderError('Could not find Chrome', { code: 'BROWSER_NOT_FOUND' });
    },
  };
  const markdown = '# Title\n\n```mermaid\ngraph TD\n  A --> B\n```\n';

  it('should replace the default error card and expose the error code', async () => {
    const events: DiagramErrorEvent[] = [];
    const renderer = new HtmlRenderer({ mermaidRenderer: failingRenderer });
    const html = await renderer.render(markdown, {
      target: 'preview',
      diagramErrorHtmlBuilder: (event) => `<div class="custom-card">${event.code}</div>`,
      onDiagramError: (event) => events.push(event),
    });

    expect(html).toContain('<div data-line="3" class="custom-card">BROWSER_NOT_FOUND</div>');
    expect(html).not.toContain('Mermaid diagram rendering failed');
    expect(events).toHaveLength(1);
    expect(events[0].code).toBe('BROWSER_NOT_FOUND');
  });

  it('should keep the default error card when no builder is given', async () => {
    const renderer = new HtmlRenderer({ mermaidRenderer: failingRenderer });
    const html = await renderer.render(markdown, { target: 'preview' });
    expect(html).toContain('Mermaid diagram rendering failed');
  });

  it('should report RENDER_FAILED for errors without a code', async () => {
    const events: DiagramErrorEvent[] = [];
    const renderer = new HtmlRenderer({
      mermaidRenderer: {
        render: async () => {
          throw new Error('plain failure');
        },
      },
    });
    await renderer.render(markdown, {
      target: 'preview',
      onDiagramError: (event) => events.push(event),
    });
    expect(events[0].code).toBe('RENDER_FAILED');
  });
});

describe('PdfGenerator browserExecutablePath', () => {
  const outputDir = path.resolve(process.cwd(), 'test-output-browser-path');
  const html = '<!DOCTYPE html><html><body><h1>Browser path</h1></body></html>';

  afterAll(async () => {
    await fs.promises.rm(outputDir, { recursive: true, force: true });
  });

  it('should reject with BROWSER_NOT_FOUND when the browser cannot be launched', async () => {
    const generator = new PdfGenerator();
    const error = await generator
      .generate(html, path.join(outputDir, 'missing.pdf'), {
        browserExecutablePath: NON_EXISTENT_BROWSER,
      })
      .catch((err: unknown) => err);
    expect(error).toBeInstanceOf(PdfGenerateError);
    expect((error as PdfGenerateError).code).toBe('BROWSER_NOT_FOUND');
  });

  const itWithSystemChrome = systemChrome ? it : it.skip;
  itWithSystemChrome('should generate a PDF with an installed system browser', async () => {
    const outputPath = path.join(outputDir, 'system-browser.pdf');
    await new PdfGenerator().generate(html, outputPath, { browserExecutablePath: systemChrome });
    const header = fs.readFileSync(outputPath).subarray(0, 5).toString();
    expect(header).toBe('%PDF-');
  });
});
