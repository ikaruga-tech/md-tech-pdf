import fs from 'node:fs/promises';
import path from 'node:path';
import { HtmlRenderer } from '../src/index.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Error: No Markdown file specified.');
    console.error('Usage: pnpm dev:html <path/to/markdown-file.md>');
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
  console.log('Rendering Markdown and Mermaid diagrams to HTML...');

  // 3. Render HTML using HtmlRenderer
  const renderer = new HtmlRenderer();
  let htmlResult = '';

  try {
    const title = path.basename(rawFilePath, path.extname(rawFilePath));
    htmlResult = await renderer.render(markdownContent, { title });
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

  // 4. Validate HTML output
  if (!htmlResult.includes('<!DOCTYPE html>') || !htmlResult.includes('<html')) {
    console.error('Error: Generated result is not a valid HTML document.');
    process.exit(1);
  }

  // 5. Ensure output directory exists and save HTML
  const outputDir = path.resolve(process.cwd(), 'generated/html');
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (err: unknown) {
    console.error(`Error: Failed to create output directory: "${outputDir}"`);
    if (err instanceof Error) {
      console.error(`Reason: ${err.message}`);
    }
    process.exit(1);
  }

  const baseName = path.basename(rawFilePath, path.extname(rawFilePath));
  const outputFilename = `${baseName}.html`;
  const outputPath = path.join(outputDir, outputFilename);
  const relativeOutputPath = path.relative(process.cwd(), outputPath);

  try {
    await fs.writeFile(outputPath, htmlResult, 'utf-8');
    console.log('');
    console.log('Completed.');
    console.log(`HTML successfully generated -> ${relativeOutputPath}`);
  } catch (err: unknown) {
    console.error(`Error: Failed to write HTML file to "${relativeOutputPath}"`);
    if (err instanceof Error) {
      console.error(`Reason: ${err.message}`);
    }
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('Unexpected error occurred during execution:');
  console.error(err);
  process.exit(1);
});
