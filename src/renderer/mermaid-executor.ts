import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { DiagramRenderError } from './error.js';

export interface MermaidExecutionOptions {
  theme?: string;
  backgroundColor?: string;
  /**
   * Absolute path to a Chromium-based browser (e.g. system Chrome / Edge).
   * When omitted, Puppeteer's bundled chrome-headless-shell is used.
   */
  browserExecutablePath?: string;
}

const BROWSER_LAUNCH_FAILURE_PATTERN =
  /Could not find (Chrome|chrome-headless-shell)|Browser was not found|Failed to launch the browser process/i;

/**
 * Detects Mermaid CLI failures caused by a missing or unlaunchable browser.
 */
export function isBrowserLaunchFailure(stderr: string): boolean {
  return BROWSER_LAUNCH_FAILURE_PATTERN.test(stderr);
}

/**
 * Writes (once per browser path) a Puppeteer config file for Mermaid CLI's `-p` option.
 * System browsers require the new headless mode instead of mmdc's default `headless: "shell"`.
 */
export function ensurePuppeteerConfigFile(browserExecutablePath: string): string {
  const hash = crypto.createHash('sha1').update(browserExecutablePath).digest('hex').slice(0, 16);
  const configPath = path.join(os.tmpdir(), `md-tech-pdf-puppeteer-${hash}.json`);
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
      configPath,
      JSON.stringify({ executablePath: browserExecutablePath, headless: true }),
      'utf-8'
    );
  }
  return configPath;
}

/**
 * Builds the Mermaid CLI argument list for in-memory stdin/stdout SVG rendering.
 */
export function buildMermaidCliArgs(
  argsPrefix: string[],
  options?: MermaidExecutionOptions
): string[] {
  const args: string[] = [...argsPrefix, '-i', '-', '-o', '-', '-e', 'svg', '-q'];

  if (options?.theme) {
    args.push('-t', options.theme);
  }

  if (options?.backgroundColor) {
    args.push('-b', options.backgroundColor);
  }

  if (options?.browserExecutablePath) {
    args.push('-p', ensurePuppeteerConfigFile(options.browserExecutablePath));
  }

  return args;
}

/**
 * Resolves the path to the mmdc script or binary.
 */
export function resolveMmdcPath(): { command: string; argsPrefix: string[] } {
  const require = createRequire(import.meta.url);

  try {
    const entryPath = require.resolve('@mermaid-js/mermaid-cli');
    const pkgDir = path.dirname(entryPath);
    const cliScriptPath = path.join(pkgDir, 'cli.js');
    if (fs.existsSync(cliScriptPath)) {
      return {
        command: process.execPath,
        argsPrefix: [cliScriptPath],
      };
    }
  } catch {
    // Continue to fallback
  }

  // Check local node_modules/.bin/mmdc
  const localBin = path.resolve(process.cwd(), 'node_modules/.bin/mmdc');
  if (fs.existsSync(localBin)) {
    return {
      command: localBin,
      argsPrefix: [],
    };
  }

  // Fallback to globally/locally installed binary name in PATH
  return {
    command: 'mmdc',
    argsPrefix: [],
  };
}

/**
 * Executes Mermaid CLI via stdin/stdout streams entirely in memory.
 */
export async function executeMermaidCli(
  source: string,
  options?: MermaidExecutionOptions
): Promise<string> {
  const { command, argsPrefix } = resolveMmdcPath();

  const args = buildMermaidCliArgs(argsPrefix, options);

  return new Promise<string>((resolve, reject) => {
    let stdoutBuffer = '';
    let stderrBuffer = '';

    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
      },
    });

    child.stdout.setEncoding('utf-8');
    child.stderr.setEncoding('utf-8');

    child.stdout.on('data', (chunk: string) => {
      stdoutBuffer += chunk;
    });

    child.stderr.on('data', (chunk: string) => {
      stderrBuffer += chunk;
    });

    child.on('error', (err: Error) => {
      reject(
        new DiagramRenderError(`Failed to launch Mermaid CLI process: ${err.message}`, {
          cause: err,
        })
      );
    });

    child.on('close', (code: number | null) => {
      if (code === 0) {
        const trimmed = stdoutBuffer.trim();
        if (trimmed.includes('<svg')) {
          resolve(trimmed);
        } else {
          reject(
            new DiagramRenderError(
              `Mermaid CLI succeeded but output did not contain valid SVG: "${trimmed}"`
            )
          );
        }
      } else {
        const errorMsg = stderrBuffer.trim() || `Process exited with code ${code}`;
        reject(
          new DiagramRenderError(`Failed to render Mermaid diagram: ${errorMsg}`, {
            cause: new Error(errorMsg),
            code: isBrowserLaunchFailure(errorMsg) ? 'BROWSER_NOT_FOUND' : 'RENDER_FAILED',
          })
        );
      }
    });

    try {
      child.stdin.write(source);
      child.stdin.end();
    } catch (writeErr: unknown) {
      reject(
        new DiagramRenderError(
          `Failed to write to Mermaid CLI stdin: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`,
          { cause: writeErr }
        )
      );
    }
  });
}
