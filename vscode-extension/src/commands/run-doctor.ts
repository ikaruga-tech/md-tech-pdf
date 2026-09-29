import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getExtensionSettings } from '../config/extension-settings.js';
import {
  type CommandOutput,
  type DoctorDependencies,
  formatDoctorReport,
  runDiagnostics,
} from '../environment/doctor.js';
import { getLocale } from '../i18n/index.js';

const COMMAND_TIMEOUT_MS = 15000;
const PROBE_MERMAID_SOURCE = 'graph TD\n  Doctor --> Ready';
const PROBE_HTML = '<!DOCTYPE html><html><body><p>md-tech-pdf doctor</p></body></html>';

let doctorOutputChannel: vscode.OutputChannel | undefined;

function getDoctorOutputChannel(): vscode.OutputChannel {
  doctorOutputChannel ??= vscode.window.createOutputChannel('md-tech-pdf: Doctor');
  return doctorOutputChannel;
}

function runCommand(command: string, args: string[]): Promise<CommandOutput> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: COMMAND_TIMEOUT_MS }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function probeMermaid(browserExecutablePath?: string): Promise<void> {
  const { MermaidRenderer } = await import('md-tech-pdf');
  await new MermaidRenderer({ browserExecutablePath }).render(PROBE_MERMAID_SOURCE);
}

async function probePdf(browserExecutablePath?: string): Promise<void> {
  const { PdfGenerator } = await import('md-tech-pdf');
  const probeDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'md-tech-pdf-doctor-'));
  try {
    await new PdfGenerator().generate(PROBE_HTML, path.join(probeDir, 'probe.pdf'), {
      browserExecutablePath,
    });
  } finally {
    await fs.promises.rm(probeDir, { recursive: true, force: true });
  }
}

/**
 * Creates the command handler for "md-tech-pdf.runDoctor".
 * Writes the environment health report to the "md-tech-pdf: Doctor" output channel.
 */
export function createRunDoctorCommand(globalStorageDir: string) {
  return async function runDoctorCommand(): Promise<void> {
    const locale = getLocale();
    const settings = getExtensionSettings();
    const { resolveDefaultJarPath } = await import('md-tech-pdf');

    const deps: DoctorDependencies = {
      locale,
      settings: {
        browserExecutablePath: settings.browser.executablePath,
        javaPath: settings.plantuml.javaPath,
        jarPath: settings.plantuml.jarPath,
      },
      globalStorageDir,
      exists: fs.existsSync,
      runCommand,
      resolveCoreDefaultJar: resolveDefaultJarPath,
      probeMermaid,
      probePdf,
    };

    const results = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: 'md-tech-pdf: Doctor',
      },
      () => runDiagnostics(deps)
    );

    const channel = getDoctorOutputChannel();
    channel.clear();
    channel.appendLine(formatDoctorReport(results, locale));
    channel.show(true);
  };
}
