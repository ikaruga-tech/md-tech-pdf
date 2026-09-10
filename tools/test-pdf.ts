import fs from 'node:fs/promises';
import path from 'node:path';
import { HtmlRenderer, PdfGenerator } from '../src/index.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Error: No Markdown file specified.');
    console.error('Usage: pnpm dev:pdf <path/to/markdown-file.md>');
    process.exit(1);
  }

  const rawFilePath = args[0];
  const targetFilePath = path.resolve(process.cwd(), rawFilePath);

  // 1. Verify input file existence
  try {
    const stats = await fs.stat(targetFilePath);
    if (!stats.isFile()) {
      console.error(`Error: Target path is not a file: "${rawFilePath}"`);
      process.exit(1);
    }
  } catch (err: unknown) {
    console.error(`Error: Markdown file not found: "${rawFilePath}"`);
    if (err instanceof Error && 'code' in err && err.code !== 'ENOENT') {
      console.error(`Reason: ${err.message}`);
    }
    process.exit(1);
  }

  // 2. Read Markdown content
  let markdownContent = '';
  try {
    markdownContent = await fs.readFile(targetFilePath, 'utf-8');
  } catch (err: unknown) {
    console.error(`Error: Failed to read Markdown file: "${rawFilePath}"`);
    if (err instanceof Error) {
      console.error(`Reason: ${err.message}`);
    }
    process.exit(1);
  }

  console.log(`Markdown: ${rawFilePath}`);
  console.log('Step 1: Rendering Markdown and Mermaid diagrams to HTML...');

  // 3. Render HTML using HtmlRenderer
  const htmlRenderer = new HtmlRenderer();
  let htmlResult = '';
  const baseName = path.basename(rawFilePath, path.extname(rawFilePath));

  try {
    htmlResult = await htmlRenderer.render(markdownContent, { title: baseName });
  } catch (err: unknown) {
    console.error('Error: Failed to render HTML document.');
    if (err instanceof Error) {
      console.error(`Reason: ${err.message}`);
      if (err.cause) {
        console.error('Cause:', err.cause);
      }
    }
    process.exit(1);
  }

  console.log('Step 2: Generating PDF from HTML via Playwright Chromium...');

  // 4. Generate PDF using PdfGenerator
  const pdfGenerator = new PdfGenerator();
  const outputDir = path.resolve(process.cwd(), 'generated/pdf');
  const outputFilename = `${baseName}.pdf`;
  const outputPath = path.join(outputDir, outputFilename);
  const relativeOutputPath = path.relative(process.cwd(), outputPath);

  try {
    await pdfGenerator.generate(htmlResult, outputPath);
    const stats = await fs.stat(outputPath);
    console.log('');
    console.log('Completed.');
    console.log(`PDF successfully generated -> ${relativeOutputPath} (${stats.size} bytes)`);
  } catch (err: unknown) {
    console.error(`Error: Failed to generate PDF file to "${relativeOutputPath}"`);
    if (err instanceof Error) {
      console.error(`Reason: ${err.message}`);
      if (err.cause) {
        console.error('Cause:', err.cause);
      }
    }
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('Unexpected error occurred during execution:');
  console.error(err);
  process.exit(1);
});
