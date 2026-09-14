import * as fs from 'node:fs';
import * as path from 'node:path';
import { HtmlRenderer } from '../src/html/html-renderer.js';
import { parseFrontMatter } from '../src/config/frontmatter-parser.js';

async function measure(name: string, filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { options } = parseFrontMatter(content);
  const renderer = new HtmlRenderer();

  // Warmup
  await renderer.render(content, { title: 'Warmup', target: 'preview' });

  const runs = 5;
  const times: number[] = [];

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await renderer.render(content, {
      title: path.basename(filePath),
      target: 'preview',
      customCss: '.md-tech-pdf-preview-page { width: 210mm; min-height: 297mm; padding: 15mm; }',
      defaultOptions: {
        plantuml: options.plantuml,
      },
    });
    const end = performance.now();
    times.push(end - start);
  }

  const avg = times.reduce((a, b) => a + b, 0) / runs;
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(`[${name}] Avg: ${avg.toFixed(2)}ms | Min: ${min.toFixed(2)}ms | Max: ${max.toFixed(2)}ms (Runs: ${runs})`);
}

async function run() {
  console.log('=== Performance Baseline Measurement (target: preview) ===');
  await measure('Small Document (markdown-elements.md, no diagrams)', 'examples/preview/markdown-elements.md');
  await measure('Medium Document (README.md, text/tables)', 'README.md');
  await measure('Large Real-World Document (system-design.md, with diagrams)', 'examples/real-world/system-design.md');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
