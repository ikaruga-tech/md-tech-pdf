import { type Locale, t } from '../i18n/index.js';
import { type ResolvedBrowser, resolveBrowserPath } from './browser-resolver.js';
import { type ResolvedPlantUmlJar, resolvePlantUmlJar } from './plantuml-manager.js';

export type DoctorStatus = 'OK' | 'WARNING' | 'ERROR' | 'NOT_CONFIGURED';

export type DoctorCheckId = 'browser' | 'java' | 'plantumlJar' | 'mermaidCli' | 'pdfEngine';

export interface DoctorCheckResult {
  id: DoctorCheckId;
  status: DoctorStatus;
  details: string[];
  hints: string[];
}

export interface CommandOutput {
  stdout: string;
  stderr: string;
}

export interface DoctorSettings {
  browserExecutablePath?: string;
  javaPath: string;
  jarPath?: string;
}

export interface DoctorDependencies {
  locale: Locale;
  settings: DoctorSettings;
  globalStorageDir?: string;
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  exists: (filePath: string) => boolean;
  /** Runs an executable and rejects when it cannot be started or exits with a non-zero code. */
  runCommand: (command: string, args: string[]) => Promise<CommandOutput>;
  resolveCoreDefaultJar: () => string | undefined;
  probeMermaid: (browserExecutablePath?: string) => Promise<void>;
  probePdf: (browserExecutablePath?: string) => Promise<void>;
}

const CHECK_LABELS: Record<DoctorCheckId, string> = {
  browser: 'Browser / Chromium',
  java: 'Java Runtime',
  plantumlJar: 'PlantUML Jar',
  mermaidCli: 'Mermaid CLI',
  pdfEngine: 'PDF Export Engine',
};

function firstLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .find((line) => line.trim() !== '')
      ?.trim() ?? ''
  );
}

function errorText(err: unknown): string {
  return firstLine(err instanceof Error ? err.message : String(err));
}

async function readVersion(
  deps: DoctorDependencies,
  command: string,
  args: string[]
): Promise<string | undefined> {
  try {
    const output = await deps.runCommand(command, args);
    return firstLine(output.stdout) || firstLine(output.stderr) || undefined;
  } catch {
    return undefined;
  }
}

async function checkBrowser(
  deps: DoctorDependencies,
  browser: ResolvedBrowser | undefined
): Promise<DoctorCheckResult> {
  const { locale, settings } = deps;
  const configuredMissing =
    Boolean(settings.browserExecutablePath) && browser?.source !== 'setting';
  const details = configuredMissing
    ? [
        t(
          'doctor.browser.configuredMissing',
          { path: settings.browserExecutablePath ?? '' },
          locale
        ),
      ]
    : [];

  if (!browser) {
    details.push(t('doctor.browser.notFound', {}, locale));
    return {
      id: 'browser',
      status: 'ERROR',
      details,
      hints: [t('doctor.browser.hint', {}, locale)],
    };
  }

  const version =
    (await readVersion(deps, browser.path, ['--version'])) ??
    t('doctor.versionUnknown', {}, locale);
  const source =
    browser.source === 'setting'
      ? t('doctor.source.setting', { key: 'md-tech-pdf.browser.executablePath' }, locale)
      : t('doctor.source.auto', {}, locale);
  details.push(
    browser.name,
    `${t('doctor.label.path', {}, locale)}: ${browser.path}`,
    `${t('doctor.label.version', {}, locale)}: ${version}`,
    `${t('doctor.label.source', {}, locale)}: ${source}`
  );

  return {
    id: 'browser',
    status: configuredMissing ? 'WARNING' : 'OK',
    details,
    hints: configuredMissing ? [t('doctor.browser.hint', {}, locale)] : [],
  };
}

async function checkJava(deps: DoctorDependencies): Promise<DoctorCheckResult> {
  const { locale, settings } = deps;
  try {
    const output = await deps.runCommand(settings.javaPath, ['-version']);
    const version = firstLine(output.stderr) || firstLine(output.stdout);
    return {
      id: 'java',
      status: 'OK',
      details: [
        `${t('doctor.label.path', {}, locale)}: ${settings.javaPath}`,
        `${t('doctor.label.version', {}, locale)}: ${version || t('doctor.versionUnknown', {}, locale)}`,
      ],
      hints: [],
    };
  } catch {
    return {
      id: 'java',
      status: 'ERROR',
      details: [t('doctor.java.notFound', { path: settings.javaPath }, locale)],
      hints: [t('doctor.java.hint', {}, locale)],
    };
  }
}

async function checkPlantUmlJar(
  deps: DoctorDependencies,
  jar: ResolvedPlantUmlJar | undefined
): Promise<DoctorCheckResult> {
  const { locale, settings } = deps;
  const hints = [t('doctor.jar.hint', {}, locale)];

  if (!jar) {
    return {
      id: 'plantumlJar',
      status: 'NOT_CONFIGURED',
      details: [t('doctor.jar.notConfigured', {}, locale)],
      hints,
    };
  }
  if (!deps.exists(jar.path)) {
    return {
      id: 'plantumlJar',
      status: 'NOT_CONFIGURED',
      details: [t('doctor.jar.missing', { path: jar.path }, locale)],
      hints,
    };
  }

  const sourceKey =
    jar.source === 'setting'
      ? t('doctor.source.setting', { key: 'md-tech-pdf.plantuml.jarPath' }, locale)
      : jar.source === 'managed'
        ? t('doctor.source.managed', {}, locale)
        : t('doctor.source.auto', {}, locale);
  const details = [
    `${t('doctor.label.path', {}, locale)}: ${jar.path}`,
    `${t('doctor.label.source', {}, locale)}: ${sourceKey}`,
  ];
  const version = await readVersion(deps, settings.javaPath, ['-jar', jar.path, '-version']);
  if (!version) {
    details.push(t('doctor.jar.versionFailed', {}, locale));
    return {
      id: 'plantumlJar',
      status: 'WARNING',
      details,
      hints: [t('doctor.java.hint', {}, locale)],
    };
  }
  details.push(`${t('doctor.label.version', {}, locale)}: ${version}`);
  return { id: 'plantumlJar', status: 'OK', details, hints: [] };
}

async function checkProbe(
  deps: DoctorDependencies,
  id: 'mermaidCli' | 'pdfEngine',
  browser: ResolvedBrowser | undefined
): Promise<DoctorCheckResult> {
  const { locale } = deps;
  const probe = id === 'mermaidCli' ? deps.probeMermaid : deps.probePdf;
  const details = browser ? [] : [t('doctor.bundledBrowser', {}, locale)];
  try {
    await probe(browser?.path);
    details.unshift(t(id === 'mermaidCli' ? 'doctor.mermaid.ok' : 'doctor.pdf.ok', {}, locale));
    return { id, status: browser ? 'OK' : 'WARNING', details, hints: [] };
  } catch (err: unknown) {
    return {
      id,
      status: 'ERROR',
      details: [t('doctor.probeFailed', { message: errorText(err) }, locale)],
      hints: [t('doctor.probe.hint', {}, locale)],
    };
  }
}

/**
 * Runs all environment health checks (browser, Java, PlantUML jar, Mermaid CLI, PDF engine).
 */
export async function runDiagnostics(deps: DoctorDependencies): Promise<DoctorCheckResult[]> {
  const browser = resolveBrowserPath({
    configuredPath: deps.settings.browserExecutablePath,
    platform: deps.platform,
    env: deps.env,
    exists: deps.exists,
  });
  const jar = resolvePlantUmlJar(deps.settings.jarPath, deps.globalStorageDir, {
    exists: deps.exists,
    resolveCoreDefault: deps.resolveCoreDefaultJar,
  });

  return [
    await checkBrowser(deps, browser),
    await checkJava(deps),
    await checkPlantUmlJar(deps, jar),
    await checkProbe(deps, 'mermaidCli', browser),
    await checkProbe(deps, 'pdfEngine', browser),
  ];
}

/**
 * Formats diagnostic results as a plain-text report for the Doctor output channel.
 */
export function formatDoctorReport(
  results: DoctorCheckResult[],
  locale: Locale,
  checkedAt: Date = new Date()
): string {
  const lines = [
    `=== ${t('doctor.title', {}, locale)} ===`,
    t('doctor.runningAt', { time: checkedAt.toLocaleString() }, locale),
    '',
  ];

  for (const result of results) {
    lines.push(`[${result.status}] ${CHECK_LABELS[result.id]}`);
    for (const detail of result.details) {
      lines.push(`    ${detail}`);
    }
    for (const hint of result.hints) {
      lines.push(`    ${t('doctor.label.hint', {}, locale)}: ${hint}`);
    }
    lines.push('');
  }

  const issueCount = results.filter((result) => result.status !== 'OK').length;
  lines.push(
    issueCount === 0
      ? t('doctor.allReady', {}, locale)
      : t('doctor.issuesFound', { count: issueCount }, locale)
  );
  return lines.join('\n');
}
