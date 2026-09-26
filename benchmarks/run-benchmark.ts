/**
 * Performance benchmark suite for md-tech-pdf.
 * Measures HTML rendering latency (cold vs warm cache), PDF generation, and memory consumption.
 */

import { performance } from 'node:perf_hooks';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { HtmlRenderer } from '../src/html/html-renderer.js';
import { DiagramRenderCache } from '../src/renderer/diagram-cache.js';
import { convertMarkdownToPdf } from '../src/core/converter.js';
import {
  generateSmallDocument,
  generateMediumDocument,
  generateLargeDocument,
} from './fixtures.js';

interface BenchmarkResult {
  name: string;
  diagramCount: number;
  markdownBytes: number;
  coldHtmlMs: number;
  warmHtmlMs: number;
  speedup: number;
  pdfExportMs?: number;
  heapUsedMb: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function runScenario(
  name: string,
  markdown: string,
  diagramCount: number,
  includePdf: boolean
): Promise<BenchmarkResult> {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const initialHeap = process.memoryUsage().heapUsed;
  const cache = new DiagramRenderCache();
  const renderer = new HtmlRenderer({ diagramCache: cache });

  // 1. Cold render (no cache)
  const coldStart = performance.now();
  const _coldHtml = await renderer.render(markdown);
  const coldHtmlMs = performance.now() - coldStart;

  // 2. Warm render (cache hit)
  const warmStart = performance.now();
  const _warmHtml = await renderer.render(markdown);
  const warmHtmlMs = performance.now() - warmStart;

  const speedup = warmHtmlMs > 0 ? coldHtmlMs / warmHtmlMs : 1;

  // 3. PDF export (optional, depends on environment capability)
  let pdfExportMs: number | undefined;
  if (includePdf) {
    const tmpDir = path.join(os.tmpdir(), `md-tech-pdf-bench-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpInput = path.join(tmpDir, 'benchmark.md');
    const tmpOutput = path.join(tmpDir, 'benchmark.pdf');

    await fs.writeFile(tmpInput, markdown, 'utf-8');

    try {
      const pdfStart = performance.now();
      await convertMarkdownToPdf({
        markdownPath: tmpInput,
        outputPath: tmpOutput,
        diagramCache: cache,
      });
      pdfExportMs = performance.now() - pdfStart;
    } catch (err) {
      console.warn(`[BENCHMARK] PDF export skipped for ${name}: ${(err as Error).message}`);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  const finalHeap = process.memoryUsage().heapUsed;
  const heapUsedMb = Math.max(0, (finalHeap - initialHeap) / (1024 * 1024));

  return {
    name,
    diagramCount,
    markdownBytes: Buffer.byteLength(markdown, 'utf-8'),
    coldHtmlMs,
    warmHtmlMs,
    speedup,
    pdfExportMs,
    heapUsedMb,
  };
}

async function main() {
  console.log('='.repeat(72));
  console.log('md-tech-pdf Performance & Latency Benchmark Suite');
  console.log('='.repeat(72));
  console.log(`Platform : ${process.platform} (${process.arch})`);
  console.log(`Node.js  : ${process.version}`);
  console.log(`CPUs     : ${os.cpus().length} core(s) - ${os.cpus()[0]?.model}`);
  console.log(`Memory   : ${formatBytes(os.totalmem())}`);
  console.log('-'.repeat(72));

  const shouldExportPdf = !process.env.SKIP_PDF_BENCH;

  const scenarios = [
    {
      name: 'Small Document',
      markdown: generateSmallDocument(),
      diagramCount: 1,
    },
    {
      name: 'Medium Document',
      markdown: generateMediumDocument(),
      diagramCount: 10,
    },
    {
      name: 'Large Document',
      markdown: generateLargeDocument(),
      diagramCount: 60, // 30 state diagrams + 30 sequence diagrams
    },
  ];

  const results: BenchmarkResult[] = [];

  for (const s of scenarios) {
    process.stdout.write(`Benchmarking ${s.name} (${s.diagramCount} diagrams)... `);
    const result = await runScenario(s.name, s.markdown, s.diagramCount, shouldExportPdf);
    results.push(result);
    console.log('Done.');
  }

  console.log('\n' + '='.repeat(72));
  console.log('Benchmark Results Summary');
  console.log('='.repeat(72));

  console.table(
    results.map((r) => ({
      Scenario: r.name,
      'Markdown Size': formatBytes(r.markdownBytes),
      Diagrams: r.diagramCount,
      'Cold Render': `${r.coldHtmlMs.toFixed(1)} ms`,
      'Warm Render (Cached)': `${r.warmHtmlMs.toFixed(1)} ms`,
      Speedup: `${r.speedup.toFixed(1)}x`,
      'PDF Export': r.pdfExportMs ? `${r.pdfExportMs.toFixed(1)} ms` : 'N/A',
      'Heap Delta': `${r.heapUsedMb.toFixed(2)} MB`,
    }))
  );

  console.log('\nInsights & Observations:');
  for (const r of results) {
    console.log(
      `* [${r.name}] Cold: ${r.coldHtmlMs.toFixed(1)}ms -> Warm: ${r.warmHtmlMs.toFixed(1)}ms (${r.speedup.toFixed(1)}x faster). PDF: ${r.pdfExportMs ? `${r.pdfExportMs.toFixed(1)}ms` : 'Skipped'}.`
    );
  }
  console.log('='.repeat(72) + '\n');
}

main().catch((err) => {
  console.error('Benchmark execution failed:', err);
  process.exit(1);
});
