import { execFile, spawnSync } from 'node:child_process';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { convertMarkdownToPdf, resolveOutputPath } from '../src/core/converter.js';

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
  ].some((p) => p && fsSync.existsSync(p)) &&
  (isJavaExecutable(process.env.PLANTUML_JAVA_PATH ?? 'java') || isJavaExecutable('/usr/bin/java'))
);

const execFileAsync = promisify(execFile);
const TSX_BIN = path.resolve(process.cwd(), 'node_modules/.bin/tsx');
const CLI_PATH = path.resolve(process.cwd(), 'src/cli/index.ts');
const WORK_DIR = path.resolve(process.cwd(), 'generated/test-cli');

describe('Core convertMarkdownToPdf and CLI integration', () => {
  it('should resolve default output path by replacing extension in same directory', () => {
    const defaultOutput = resolveOutputPath('docs/system-design.md');
    expect(defaultOutput).toBe(path.resolve(process.cwd(), 'docs/system-design.pdf'));

    const explicitOutput = resolveOutputPath('docs/system-design.md', 'custom/out.pdf');
    expect(explicitOutput).toBe(path.resolve(process.cwd(), 'custom/out.pdf'));
  });

  it('1 & 2. should convert Markdown to PDF and output to same directory when unspecified', async () => {
    await fs.mkdir(WORK_DIR, { recursive: true });
    const mdPath = path.join(WORK_DIR, 'sample-basic.md');
    const expectedPdfPath = path.join(WORK_DIR, 'sample-basic.pdf');

    await fs.writeFile(mdPath, '# Hello World\n\nThis is a basic test document.', 'utf-8');

    // Clean up if already exists
    try {
      await fs.unlink(expectedPdfPath);
    } catch {
      // ignore
    }

    const result = await convertMarkdownToPdf(mdPath);
    expect(result.outputPath).toBe(expectedPdfPath);
    expect(result.bytes).toBeGreaterThan(0);

    const exists = await fs
      .stat(expectedPdfPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  it('3. should respect explicit -o / output option', async () => {
    await fs.mkdir(WORK_DIR, { recursive: true });
    const mdPath = path.join(WORK_DIR, 'explicit-out.md');
    const customPdfPath = path.join(WORK_DIR, 'custom-dest/custom.pdf');

    await fs.writeFile(mdPath, '# Custom Output\n\nTesting explicit output.', 'utf-8');

    const result = await convertMarkdownToPdf(mdPath, { output: customPdfPath });
    expect(result.outputPath).toBe(path.resolve(process.cwd(), customPdfPath));
    expect(result.bytes).toBeGreaterThan(0);

    const exists = await fs
      .stat(customPdfPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  it('4. should fail when input file does not exist', async () => {
    const nonExistentPath = path.join(WORK_DIR, 'non-existent-file.md');
    await expect(convertMarkdownToPdf(nonExistentPath)).rejects.toThrow(/Markdown file not found/);
  });

  it('5. should automatically create destination directory if it does not exist', async () => {
    const mdPath = path.join(WORK_DIR, 'nested-dir-test.md');
    const deeplyNestedPdf = path.join(WORK_DIR, 'deep/nested/sub/folder/doc.pdf');

    await fs.writeFile(mdPath, '# Nested Directory Test\n\nTesting auto mkdir.', 'utf-8');

    const result = await convertMarkdownToPdf(mdPath, { output: deeplyNestedPdf });
    expect(result.outputPath).toBe(path.resolve(process.cwd(), deeplyNestedPdf));
    expect(result.bytes).toBeGreaterThan(0);

    const stats = await fs.stat(deeplyNestedPdf);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('6. should convert Markdown with Mermaid diagrams', async () => {
    const mdPath = path.join(WORK_DIR, 'mermaid-doc.md');
    const pdfPath = path.join(WORK_DIR, 'mermaid-doc.pdf');
    const content = `---
pdf:
  margin:
    top: 15mm
    bottom: 15mm
---

# Architecture Diagram

\`\`\`mermaid
graph TD
  A[Client] --> B[API Server]
  B --> C[(Database)]
\`\`\`
`;
    await fs.writeFile(mdPath, content, 'utf-8');

    const progressSteps: string[] = [];
    const result = await convertMarkdownToPdf(mdPath, {
      output: pdfPath,
      onProgress: (ev) => progressSteps.push(ev.step),
    });

    expect(result.bytes).toBeGreaterThan(0);
    expect(progressSteps).toContain('mermaid');
    expect(progressSteps).not.toContain('plantuml');
    expect(progressSteps).toContain('html');
    expect(progressSteps).toContain('pdf');
  });

  it.skipIf(!hasPlantUml)('7. should convert Markdown with PlantUML diagrams', async () => {
    const mdPath = path.join(WORK_DIR, 'plantuml-doc.md');
    const pdfPath = path.join(WORK_DIR, 'plantuml-doc.pdf');
    const content = `# PlantUML Test

\`\`\`plantuml
@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
@enduml
\`\`\`
`;
    await fs.writeFile(mdPath, content, 'utf-8');

    const progressSteps: string[] = [];
    const result = await convertMarkdownToPdf(mdPath, {
      output: pdfPath,
      onProgress: (ev) => progressSteps.push(ev.step),
    });

    expect(result.bytes).toBeGreaterThan(0);
    expect(progressSteps).toContain('plantuml');
  });

  it('8. should apply Front Matter PDF options during conversion', async () => {
    const mdPath = path.join(WORK_DIR, 'fm-pdf-doc.md');
    const pdfPath = path.join(WORK_DIR, 'fm-pdf-doc.pdf');
    const content = `---
pdf:
  landscape: true
  margin:
    top: 25mm
    right: 25mm
    bottom: 25mm
    left: 25mm
diagram:
  width: 120mm
---

# Landscape Technical Document

Content with customized margins.
`;
    await fs.writeFile(mdPath, content, 'utf-8');

    const result = await convertMarkdownToPdf(mdPath, { output: pdfPath });
    expect(result.bytes).toBeGreaterThan(0);
  });

  describe('CLI Command Execution via Child Process', () => {
    it('10. should show help message with --help and exit with code 0', async () => {
      const { stdout } = await execFileAsync(TSX_BIN, [CLI_PATH, '--help']);
      expect(stdout).toContain('Usage: md-tech-pdf');
      expect(stdout).toContain('-o, --output <path>');
      expect(stdout).toContain('-s, --style <paths...>');
      expect(stdout).toContain('--java-path <path>');
      expect(stdout).toContain('--plantuml-jar <path>');
      expect(stdout).toContain('--no-cache');
      expect(stdout).toContain('-h, --help');
      expect(stdout).toContain('-v, --version');
    });

    it('11. should display version with -v or --version and exit with code 0', async () => {
      const pkg = JSON.parse(
        await fs.readFile(path.resolve(process.cwd(), 'package.json'), 'utf-8')
      );
      const { stdout: stdoutShort } = await execFileAsync(TSX_BIN, [CLI_PATH, '-v']);
      expect(stdoutShort.trim()).toBe(pkg.version);

      const { stdout: stdoutLong } = await execFileAsync(TSX_BIN, [CLI_PATH, '--version']);
      expect(stdoutLong.trim()).toBe(pkg.version);
    });

    it('9. should exit with code 1 when no input file is specified', async () => {
      try {
        await execFileAsync(TSX_BIN, [CLI_PATH]);
        expect.unreachable('Should have failed');
      } catch (err: unknown) {
        const error = err as { code: number; stderr: string };
        expect(error.code).toBe(1);
        expect(error.stderr).toContain('Input file is required.');
      }
    });

    it('9. should exit with code 1 when input file is not found', async () => {
      try {
        await execFileAsync(TSX_BIN, [CLI_PATH, 'non-existent-input.md']);
        expect.unreachable('Should have failed');
      } catch (err: unknown) {
        const error = err as { code: number; stderr: string };
        expect(error.code).toBe(1);
        expect(error.stderr).toContain('Markdown file not found: non-existent-input.md');
      }
    });

    it('1 & 3. should convert document successfully via CLI command', async () => {
      const mdPath = path.join(WORK_DIR, 'cli-exec-test.md');
      const pdfPath = path.join(WORK_DIR, 'cli-exec-test.pdf');
      await fs.writeFile(mdPath, '# CLI Direct Execution\n\nWorking as expected.', 'utf-8');

      const { stdout } = await execFileAsync(TSX_BIN, [CLI_PATH, mdPath, '-o', pdfPath]);
      expect(stdout).toContain('md-tech-pdf');
      expect(stdout).toContain('Input:');
      expect(stdout).toContain('Output:');
      expect(stdout).toContain('Done.');

      const exists = await fs
        .stat(pdfPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should convert document with --style and --no-cache CLI options', async () => {
      const mdPath = path.join(WORK_DIR, 'cli-style-test.md');
      const cssPath = path.join(WORK_DIR, 'cli-custom.css');
      const pdfPath = path.join(WORK_DIR, 'cli-style-test.pdf');

      await fs.writeFile(mdPath, '# Custom Style CLI\n\nStyled document content.', 'utf-8');
      await fs.writeFile(cssPath, 'h1 { color: #1e3a8a; }', 'utf-8');

      const { stdout } = await execFileAsync(TSX_BIN, [
        CLI_PATH,
        mdPath,
        '-o',
        pdfPath,
        '--style',
        cssPath,
        '--no-cache',
      ]);

      expect(stdout).toContain('md-tech-pdf');
      expect(stdout).toContain('Done.');

      const exists = await fs
        .stat(pdfPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });
  });
});
