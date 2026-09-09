#!/usr/bin/env node

/**
 * md-tech-pdf CLI Entrypoint
 * This layer only parses CLI arguments and delegates directly to Core.
 * PDF generation logic must NOT be placed here.
 */

import { generatePdf } from '../index.js';

export async function runCli(): Promise<void> {
  const result = await generatePdf();
  console.log(`[md-tech-pdf CLI] ${result.message}`);
}

const isDirectExecution =
  process.argv[1]?.endsWith('/cli/index.js') ||
  process.argv[1]?.endsWith('/cli/index.ts') ||
  process.argv[1]?.endsWith('/md-tech-pdf');

if (isDirectExecution) {
  runCli().catch((err: unknown) => {
    console.error('[md-tech-pdf CLI Error]:', err);
    process.exit(1);
  });
}
