import * as assert from 'node:assert/strict';
import {
  type CommandOutput,
  type DoctorDependencies,
  formatDoctorReport,
  runDiagnostics,
} from '../../src/environment/doctor.js';
import { getManagedJarPath } from '../../src/environment/plantuml-manager.js';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const STORAGE = '/storage';
const MANAGED_JAR = getManagedJarPath(STORAGE);

type CommandHandler = (command: string, args: string[]) => CommandOutput;

function healthyCommands(command: string, args: string[]): CommandOutput {
  if (command === CHROME) {
    return { stdout: 'Google Chrome 140.0.7339.0\n', stderr: '' };
  }
  if (args[0] === '-version') {
    return { stdout: '', stderr: 'openjdk version "21.0.2" 2024-01-16\nOpenJDK Runtime\n' };
  }
  return { stdout: 'PlantUML version 1.2025.4 (Sat Jun 28 2025)\n', stderr: '' };
}

function createDeps(overrides: {
  existing?: string[];
  commands?: CommandHandler;
  settings?: Partial<DoctorDependencies['settings']>;
  probeFails?: boolean;
}): DoctorDependencies {
  const existing = new Set(overrides.existing ?? [CHROME, MANAGED_JAR]);
  const commands = overrides.commands ?? healthyCommands;
  const probe = async () => {
    if (overrides.probeFails) {
      throw new Error('Failed to launch the browser process!\nstack trace');
    }
  };
  return {
    locale: 'en',
    settings: { javaPath: 'java', ...overrides.settings },
    globalStorageDir: STORAGE,
    platform: 'darwin',
    env: {},
    exists: (p) => existing.has(p),
    runCommand: async (command, args) => commands(command, args),
    resolveCoreDefaultJar: () => undefined,
    probeMermaid: probe,
    probePdf: probe,
  };
}

describe('doctor', () => {
  it('should report every check as OK on a fully configured machine', async () => {
    const results = await runDiagnostics(createDeps({}));
    assert.deepStrictEqual(
      results.map((r) => [r.id, r.status]),
      [
        ['browser', 'OK'],
        ['java', 'OK'],
        ['plantumlJar', 'OK'],
        ['mermaidCli', 'OK'],
        ['pdfEngine', 'OK'],
      ]
    );
    const browser = results[0];
    assert.ok(browser.details.includes('Google Chrome'));
    assert.ok(browser.details.includes('Version: Google Chrome 140.0.7339.0'));
    assert.ok(results[1].details.includes('Version: openjdk version "21.0.2" 2024-01-16'));
    assert.ok(results[2].details.includes('Source: Downloaded by md-tech-pdf'));
    assert.ok(results[2].details.includes('Version: PlantUML version 1.2025.4 (Sat Jun 28 2025)'));

    const report = formatDoctorReport(results, 'en');
    assert.match(report, /\[OK\] Browser \/ Chromium/);
    assert.match(report, /All systems are ready!/);
  });

  it('should warn when the configured browser is missing but another is auto-detected', async () => {
    const results = await runDiagnostics(
      createDeps({ settings: { browserExecutablePath: '/missing/browser' } })
    );
    assert.strictEqual(results[0].status, 'WARNING');
    assert.ok(results[0].details[0].includes('/missing/browser'));
    assert.strictEqual(results[0].hints.length, 1);
  });

  it('should report an unknown browser version when --version fails', async () => {
    const results = await runDiagnostics(
      createDeps({
        commands: (command, args) => {
          if (command === CHROME) {
            throw new Error('no version output');
          }
          return healthyCommands(command, args);
        },
      })
    );
    assert.strictEqual(results[0].status, 'OK');
    assert.ok(results[0].details.includes('Version: unknown'));
  });

  it('should warn when the jar exists but Java cannot check its version', async () => {
    const results = await runDiagnostics(
      createDeps({
        commands: (command, args) => {
          if (command === 'java') {
            throw new Error('spawn java ENOENT');
          }
          return healthyCommands(command, args);
        },
      })
    );
    assert.strictEqual(results[1].status, 'ERROR');
    assert.strictEqual(results[2].status, 'WARNING');
  });

  it('should report a configured but missing jar as NOT_CONFIGURED', async () => {
    const results = await runDiagnostics(
      createDeps({ settings: { jarPath: '/missing/plantuml.jar' } })
    );
    assert.strictEqual(results[2].status, 'NOT_CONFIGURED');
    assert.ok(results[2].details[0].includes('/missing/plantuml.jar'));
  });

  it('should mark Mermaid and PDF as WARNING when only the bundled browser works', async () => {
    const results = await runDiagnostics(createDeps({ existing: [MANAGED_JAR] }));
    assert.strictEqual(results[0].status, 'ERROR');
    assert.strictEqual(results[3].status, 'WARNING');
    assert.strictEqual(results[4].status, 'WARNING');
  });

  it('should localize the report in Japanese with hints and an issue count', async () => {
    const deps = { ...createDeps({ existing: [], probeFails: true }), locale: 'ja' as const };
    const report = formatDoctorReport(await runDiagnostics(deps), 'ja');
    assert.match(report, /md-tech-pdf 環境診断/);
    assert.match(report, /解決方法: コマンド「md-tech-pdf: Download PlantUML Jar」/);
    // browser, PlantUML jar, Mermaid CLI and PDF engine fail; Java is healthy
    assert.match(report, /4 件の項目に対応が必要です/);
    assert.doesNotMatch(report, /stack trace/);
  });
});
