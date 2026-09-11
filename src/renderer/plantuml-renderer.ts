import fs from 'node:fs';
import path from 'node:path';
import type { DiagramRenderer, DiagramRenderOptions } from './diagram-renderer.js';
import { DiagramRenderError } from './error.js';
import { executePlantUml } from './plantuml-executor.js';

export interface PlantUmlRendererOptions {
  jarPath?: string;
  javaPath?: string;
  timeoutMs?: number;
}

/**
 * Common default paths where PlantUML jar might reside.
 */
const KNOWN_JAR_CANDIDATES = [
  '/usr/local/opt/plantuml/libexec/plantuml.jar',
  '/usr/share/plantuml/plantuml.jar',
  '/opt/homebrew/opt/plantuml/libexec/plantuml.jar',
];

/**
 * Common default paths where Java executable might reside on macOS / Unix.
 */
const KNOWN_JAVA_CANDIDATES = [
  '/usr/local/opt/openjdk/bin/java',
  '/opt/homebrew/opt/openjdk/bin/java',
];

function resolveDefaultJavaPath(): string {
  if (process.env.PLANTUML_JAVA_PATH) {
    return process.env.PLANTUML_JAVA_PATH;
  }
  if (process.env.JAVA_HOME) {
    const javaBin = path.join(process.env.JAVA_HOME, 'bin', 'java');
    if (fs.existsSync(javaBin)) {
      return javaBin;
    }
  }
  for (const candidate of KNOWN_JAVA_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return 'java';
}

function resolveDefaultJarPath(): string | undefined {
  if (process.env.PLANTUML_JAR_PATH) {
    return process.env.PLANTUML_JAR_PATH;
  }

  // Check Cursor extension path if present
  const homeDir = process.env.HOME;
  if (homeDir) {
    const cursorCandidate = path.join(
      homeDir,
      '.cursor/extensions/jebbs.plantuml-2.18.1/plantuml.jar'
    );
    if (fs.existsSync(cursorCandidate)) {
      return cursorCandidate;
    }
    const vscodeCandidate = path.join(
      homeDir,
      '.vscode/extensions/jebbs.plantuml-2.18.1/plantuml.jar'
    );
    if (fs.existsSync(vscodeCandidate)) {
      return vscodeCandidate;
    }
  }

  for (const candidate of KNOWN_JAR_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Renders PlantUML diagram source code into SVG vector markup
 * using a local Java process and plantuml.jar.
 */
export class PlantUmlRenderer implements DiagramRenderer {
  private readonly jarPath?: string;
  private readonly javaPath: string;
  private readonly timeoutMs?: number;

  constructor(options?: PlantUmlRendererOptions) {
    this.jarPath = options?.jarPath ?? resolveDefaultJarPath();
    this.javaPath = options?.javaPath ?? resolveDefaultJavaPath();
    this.timeoutMs = options?.timeoutMs;
  }

  /**
   * Converts PlantUML diagram definition source code into an SVG string.
   *
   * @param source PlantUML diagram definition text (typically includes @startuml ... @enduml)
   * @param _options Optional diagram render options
   * @returns Pure vector SVG string
   * @throws DiagramRenderError on empty input, missing jar/java, or syntax/rendering errors
   */
  async render(source: string, _options?: DiagramRenderOptions): Promise<string> {
    if (!source || source.trim() === '') {
      throw new DiagramRenderError(
        'Failed to render PlantUML diagram: Source is empty or whitespace only.'
      );
    }

    if (!this.jarPath) {
      throw new DiagramRenderError(
        'PlantUML jar path is not configured. Please specify jarPath in PlantUmlRendererOptions or set PLANTUML_JAR_PATH.'
      );
    }

    return executePlantUml(source, {
      jarPath: this.jarPath,
      javaPath: this.javaPath,
      timeoutMs: this.timeoutMs,
    });
  }
}
