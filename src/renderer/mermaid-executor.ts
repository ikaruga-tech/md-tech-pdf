import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { DiagramRenderError } from './error.js';

export interface MermaidExecutionOptions {
  theme?: string;
  backgroundColor?: string;
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

  const args: string[] = [...argsPrefix, '-i', '-', '-o', '-', '-e', 'svg', '-q'];

  if (options?.theme) {
    args.push('-t', options.theme);
  }

  if (options?.backgroundColor) {
    args.push('-b', options.backgroundColor);
  }

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
