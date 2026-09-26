import fs from 'node:fs/promises';
import path from 'node:path';
import { resolvePdfOptions } from '../config/config-resolver.js';
import { parseFrontMatter } from '../config/frontmatter-parser.js';
import { HtmlRenderer } from '../html/html-renderer.js';
import { extractDiagramBlocks } from '../parser/markdown-parser.js';
import { PdfGenerator } from '../pdf/pdf-generator.js';

export type ConvertProgressStep = 'mermaid' | 'plantuml' | 'html' | 'pdf';

export interface ConvertProgressEvent {
  step: ConvertProgressStep;
  message: string;
}

export interface ConvertAppConfig {
  plantuml?: {
    javaPath?: string;
    jarPath?: string;
  };
  style?: {
    css?: string | string[];
    customCss?: string;
  };
}

export interface ConvertOptions {
  /**
   * Destination path for the generated PDF.
   * Defaults to replacing the Markdown file extension with .pdf in the same directory.
   */
  output?: string;

  /**
   * Optional callback to receive step-by-step progress events.
   */
  onProgress?: (event: ConvertProgressEvent) => void;

  /**
   * Application-level default configuration (e.g. from editor settings or CLI flags).
   * Note: Front Matter specified in the document always takes precedence over this configuration.
   */
  config?: ConvertAppConfig;
}

export interface ConvertResult {
  outputPath: string;
  bytes: number;
}

/**
 * Resolves the destination PDF output path.
 * If output is unspecified, changes the input file extension to .pdf in the same directory.
 */
export function resolveOutputPath(inputPath: string, explicitOutput?: string): string {
  if (explicitOutput) {
    return path.isAbsolute(explicitOutput)
      ? explicitOutput
      : path.resolve(process.cwd(), explicitOutput);
  }

  const dir = path.dirname(inputPath);
  const baseName = path.basename(inputPath, path.extname(inputPath));
  return path.resolve(process.cwd(), path.join(dir, `${baseName}.pdf`));
}

/**
 * High-level core API to convert a technical Markdown document to a vector PDF.
 *
 * @param inputPath Path to the input Markdown file.
 * @param options Conversion options such as output path and progress callbacks.
 * @returns Details of the generated PDF (output path and file size).
 */
export async function convertMarkdownToPdf(
  inputPath: string,
  options: ConvertOptions = {}
): Promise<ConvertResult> {
  const resolvedInputPath = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath);

  // 1. Verify input file existence
  let stats;
  try {
    stats = await fs.stat(resolvedInputPath);
  } catch (err: unknown) {
    throw new Error(`Markdown file not found: ${inputPath}`, { cause: err });
  }

  if (!stats.isFile()) {
    throw new Error(`Target path is not a file: ${inputPath}`);
  }

  // 2. Read Markdown content
  let markdownContent: string;
  try {
    markdownContent = await fs.readFile(resolvedInputPath, 'utf-8');
  } catch (err: unknown) {
    throw new Error(`Failed to read Markdown file: ${inputPath}`, { cause: err });
  }

  // 3. Parse Front Matter and detect diagram types present in content
  const { options: docOptions } = parseFrontMatter(markdownContent);
  const baseName = path.basename(resolvedInputPath, path.extname(resolvedInputPath));
  const outputPath = resolveOutputPath(resolvedInputPath, options.output);

  const diagrams = extractDiagramBlocks(markdownContent);
  const hasMermaid = diagrams.some((d) => d.type === 'mermaid');
  const hasPlantUml = diagrams.some((d) => d.type === 'plantuml');

  // 4. Report diagram progress if diagrams exist
  if (hasMermaid) {
    options.onProgress?.({
      step: 'mermaid',
      message: 'Rendering Mermaid diagrams...',
    });
  }

  if (hasPlantUml) {
    options.onProgress?.({
      step: 'plantuml',
      message: 'Rendering PlantUML diagrams...',
    });
  }

  // 5. Render to complete HTML document
  options.onProgress?.({
    step: 'html',
    message: 'Generating HTML...',
  });

  const htmlRenderer = new HtmlRenderer();
  let html: string;
  try {
    html = await htmlRenderer.render(markdownContent, {
      title: baseName,
      basePath: path.dirname(resolvedInputPath),
      defaultOptions: {
        plantuml: options.config?.plantuml,
        style: options.config?.style,
      },
    });
  } catch (err: unknown) {
    throw new Error(
      `Failed to render HTML document: ${err instanceof Error ? err.message : String(err)}`,
      {
        cause: err,
      }
    );
  }

  // 6. Generate vector PDF via Playwright
  options.onProgress?.({
    step: 'pdf',
    message: 'Generating PDF...',
  });

  const pdfGenerator = new PdfGenerator();
  const pdfOptions = resolvePdfOptions(docOptions.pdf);

  try {
    await pdfGenerator.generate(html, outputPath, pdfOptions);
  } catch (err: unknown) {
    throw new Error(
      `Failed to generate PDF file to "${outputPath}": ${err instanceof Error ? err.message : String(err)}`,
      {
        cause: err,
      }
    );
  }

  // 7. Verify generated PDF stats
  const pdfStats = await fs.stat(outputPath);

  return {
    outputPath,
    bytes: pdfStats.size,
  };
}
