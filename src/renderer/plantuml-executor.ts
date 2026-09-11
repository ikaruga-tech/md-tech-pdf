import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { DiagramRenderError } from './error.js';

export interface ExecutePlantUmlOptions {
  jarPath: string;
  javaPath?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Executes the PlantUML CLI in pipe mode to render a PlantUML definition into SVG.
 * Does not use temporary files; uses stdin and stdout streams.
 */
export async function executePlantUml(
  source: string,
  options: ExecutePlantUmlOptions
): Promise<string> {
  const { jarPath, javaPath = 'java', timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  // 1. Verify jarPath exists
  try {
    const jarStat = await fs.stat(jarPath);
    if (!jarStat.isFile()) {
      throw new DiagramRenderError(`PlantUML jar was not found: ${jarPath}`);
    }
  } catch (err) {
    if (err instanceof DiagramRenderError) {
      throw err;
    }
    throw new DiagramRenderError(`PlantUML jar was not found: ${jarPath}`, { cause: err });
  }

  // 2. Launch Java process with pipe mode
  return new Promise<string>((resolve, reject) => {
    let childProcess;
    try {
      childProcess = spawn(
        javaPath,
        ['-Dfile.encoding=UTF-8', '-jar', jarPath, '-charset', 'UTF-8', '-tsvg', '-pipe'],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );
    } catch (err: unknown) {
      return reject(
        new DiagramRenderError(
          `Failed to start PlantUML. Java executable was not found: ${javaPath}`,
          { cause: err }
        )
      );
    }

    let stdoutData = '';
    let stderrData = '';
    let isTimedOut = false;

    const timer = setTimeout(() => {
      isTimedOut = true;
      childProcess.kill('SIGTERM');
      reject(new DiagramRenderError(`PlantUML rendering timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    childProcess.stdout.setEncoding('utf-8');
    childProcess.stdout.on('data', (chunk: string) => {
      stdoutData += chunk;
    });

    childProcess.stderr.setEncoding('utf-8');
    childProcess.stderr.on('data', (chunk: string) => {
      stderrData += chunk;
    });

    childProcess.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (err.code === 'ENOENT') {
        reject(
          new DiagramRenderError(
            `Failed to start PlantUML. Java executable was not found: ${javaPath}`,
            { cause: err }
          )
        );
      } else {
        reject(
          new DiagramRenderError(`PlantUML process encountered an error: ${err.message}`, {
            cause: err,
          })
        );
      }
    });

    childProcess.on('close', (code: number | null) => {
      clearTimeout(timer);
      if (isTimedOut) {
        return;
      }

      if (code !== 0) {
        const errorDetails = stderrData.trim() || `Process exited with code ${code}`;
        return reject(
          new DiagramRenderError(`PlantUML rendering failed: ${errorDetails}`, {
            cause: {
              exitCode: code,
              stderr: stderrData,
              stdout: stdoutData,
            },
          })
        );
      }

      // Validate SVG output
      if (!stdoutData.includes('<svg')) {
        return reject(
          new DiagramRenderError('PlantUML output did not contain valid SVG markup.', {
            cause: {
              stdout: stdoutData,
              stderr: stderrData,
            },
          })
        );
      }

      resolve(stdoutData.trim());
    });

    // Write source to stdin and close the stream
    childProcess.stdin.on('error', (err: unknown) => {
      // Avoid unhandled stream error if child process dies early
      clearTimeout(timer);
      reject(
        new DiagramRenderError(`Failed to write to PlantUML stdin: ${err}`, {
          cause: err,
        })
      );
    });

    childProcess.stdin.write(source, 'utf-8');
    childProcess.stdin.end();
  });
}
