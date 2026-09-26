#!/usr/bin/env node

/**
 * md-tech-pdf CLI Entrypoint
 * This layer parses CLI arguments, validates options, and delegates to the Core converter API.
 * Business logic and rendering algorithms must NOT be placed here.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import {
  convertMarkdownToPdf,
  resolveOutputPath,
  type ConvertAppConfig,
} from '../core/converter.js';
import { DiagramRenderCache } from '../renderer/diagram-cache.js';

function getPackageVersion(): string {
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = path.resolve(currentDir, '../../package.json');
    if (fs.existsSync(packageJsonPath)) {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      return pkg.version ?? '0.1.0';
    }
  } catch {
    // Fallback if package.json cannot be read
  }
  return '0.1.0';
}

export interface CliOptions {
  output?: string;
  style?: string[];
  javaPath?: string;
  plantumlJar?: string;
  cache?: boolean;
}

export function createCliCommand(): Command {
  const program = new Command();

  program
    .name('md-tech-pdf')
    .description('Technical document PDF generator from Markdown with flexible diagram layout')
    .version(getPackageVersion(), '-v, --version')
    .argument('[input]', 'Path to the input Markdown document')
    .option('-o, --output <path>', 'Destination path for the output PDF document')
    .option('-s, --style <paths...>', 'Custom CSS stylesheet path(s) to apply')
    .option('--java-path <path>', 'Custom path to Java binary for PlantUML')
    .option('--plantuml-jar <path>', 'Custom path to plantuml.jar')
    .option('--no-cache', 'Disable in-memory diagram rendering cache')
    .helpOption('-h, --help', 'Display help for command')
    .action(async (input: string | undefined, options: CliOptions) => {
      if (!input || input.trim() === '') {
        console.error('Error: Input file is required.');
        process.exit(1);
      }

      const inputPath = input.trim();
      const outputPath = resolveOutputPath(inputPath, options.output);
      const displayInput = path.isAbsolute(inputPath)
        ? path.relative(process.cwd(), inputPath) || inputPath
        : inputPath;
      const displayOutput = path.isAbsolute(outputPath)
        ? path.relative(process.cwd(), outputPath) || outputPath
        : outputPath;

      console.log('md-tech-pdf');
      console.log('');
      console.log('Input:');
      console.log(`  ${displayInput}`);
      console.log('');
      console.log('Output:');
      console.log(`  ${displayOutput}`);
      console.log('');

      const config: ConvertAppConfig = {};
      if (options.javaPath || options.plantumlJar) {
        config.plantuml = {
          javaPath: options.javaPath,
          jarPath: options.plantumlJar,
        };
      }
      if (options.style && options.style.length > 0) {
        config.style = {
          css: options.style,
        };
      }

      const diagramCache = options.cache !== false ? new DiagramRenderCache() : undefined;

      try {
        await convertMarkdownToPdf(inputPath, {
          output: options.output,
          config,
          diagramCache,
          onProgress: (event) => {
            console.log(event.message);
          },
        });

        console.log('');
        console.log('Done.');
      } catch (err: unknown) {
        console.error('');
        if (err instanceof Error) {
          console.error(`Error: ${err.message}`);
          if (err.cause && err.cause instanceof Error && err.cause.message !== err.message) {
            console.error(`Reason: ${err.cause.message}`);
          }
        } else {
          console.error(`Error: ${String(err)}`);
        }
        process.exit(1);
      }
    });

  return program;
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const program = createCliCommand();
  await program.parseAsync(argv);
}

const isDirectExecution =
  process.argv[1]?.endsWith('/cli/index.js') ||
  process.argv[1]?.endsWith('/cli/index.ts') ||
  process.argv[1]?.endsWith('/md-tech-pdf');

if (isDirectExecution) {
  runCli().catch((err: unknown) => {
    console.error('Unexpected CLI error:', err);
    process.exit(1);
  });
}
