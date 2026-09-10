import fs from 'node:fs/promises';
import path from 'node:path';
import { extractDiagramBlocks, MermaidRenderer, type DiagramBlock } from '../src/index.js';

function formatFilename(index: number): string {
  const paddedIndex = String(index).padStart(3, '0');
  return `mermaid-${paddedIndex}.svg`;
}

function validateSvg(svgContent: string): void {
  if (!svgContent || !svgContent.includes('<svg')) {
    throw new Error('Rendered output does not contain a valid <svg> root element.');
  }
}

async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

function printDiagramDetails(block: DiagramBlock, num: number): void {
  console.log(`Diagram ${num}`);
  console.log(`type: ${block.type}`);
  console.log(`width: ${block.options.width ?? 'undefined'}`);
  console.log(`height: ${block.options.height ?? 'undefined'}`);
  console.log(`fit: ${block.options.fit}`);
  console.log(`align: ${block.options.align}`);
  console.log('');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Error: No Markdown file specified.');
    console.error('Usage: pnpm dev:mermaid <path/to/markdown-file.md>');
    process.exit(1);
  }

  const rawFilePath = args[0];
  const targetFilePath = path.resolve(process.cwd(), rawFilePath);

  // 1. Verify file existence
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

  // 3. Parse Markdown and extract diagrams
  let allBlocks: DiagramBlock[] = [];
  try {
    allBlocks = extractDiagramBlocks(markdownContent);
  } catch (err: unknown) {
    console.error(`Error: Failed to parse Markdown in "${rawFilePath}"`);
    if (err instanceof Error) {
      console.error(`Reason: ${err.message}`);
    }
    process.exit(1);
  }

  // 4. Filter only Mermaid diagrams
  const mermaidBlocks = allBlocks.filter((block) => block.type === 'mermaid');

  console.log(`Markdown: ${rawFilePath}`);
  console.log('');

  if (mermaidBlocks.length === 0) {
    console.log('Found 0 Mermaid diagrams.');
    console.log('No Mermaid diagrams to render.');
    return;
  }

  console.log(
    `Found ${mermaidBlocks.length} Mermaid diagram${mermaidBlocks.length > 1 ? 's' : ''}.`
  );
  console.log('');

  // 5. Setup output directory
  const outputDir = path.resolve(process.cwd(), 'generated/diagrams');
  try {
    await ensureDirectory(outputDir);
  } catch (err: unknown) {
    console.error(`Error: Failed to create output directory: "${outputDir}"`);
    if (err instanceof Error) {
      console.error(`Reason: ${err.message}`);
    }
    process.exit(1);
  }

  // 6. Render each Mermaid diagram and save SVG
  const renderer = new MermaidRenderer();
  const total = mermaidBlocks.length;

  for (let i = 0; i < total; i++) {
    const diagramNumber = i + 1;
    const block = mermaidBlocks[i];
    const filename = formatFilename(diagramNumber);
    const outputPath = path.join(outputDir, filename);
    const relativeOutputPath = path.relative(process.cwd(), outputPath);

    printDiagramDetails(block, diagramNumber);

    console.log(`[${diagramNumber}/${total}] Rendering...`);

    let svgContent = '';
    try {
      svgContent = await renderer.render(block.source);
      validateSvg(svgContent);
    } catch (err: unknown) {
      console.error(`Error: Failed to render Mermaid diagram #${diagramNumber}`);
      if (err instanceof Error) {
        console.error(`Reason: ${err.message}`);
        if (err.cause) {
          console.error('Cause:', err.cause);
        }
      }
      process.exit(1);
    }

    try {
      await fs.writeFile(outputPath, svgContent, 'utf-8');
      console.log(`      -> ${relativeOutputPath}`);
      console.log('');
    } catch (err: unknown) {
      console.error(`Error: Failed to save SVG file to "${relativeOutputPath}"`);
      if (err instanceof Error) {
        console.error(`Reason: ${err.message}`);
      }
      process.exit(1);
    }
  }

  console.log('Completed.');
  console.log(`${total} diagram${total > 1 ? 's' : ''} rendered successfully.`);
}

main().catch((err: unknown) => {
  console.error('Unexpected error occurred during execution:');
  console.error(err);
  process.exit(1);
});
