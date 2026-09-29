import { type Locale, type MessageKey, t } from '../i18n/index.js';

export type GuidanceAction = 'runDoctor' | 'downloadPlantUml' | 'openSettings';

export interface ErrorGuidance {
  message: string;
  actions: GuidanceAction[];
}

const ACTION_LABEL_KEYS: Record<GuidanceAction, MessageKey> = {
  runDoctor: 'action.runDoctor',
  downloadPlantUml: 'action.downloadPlantUml',
  openSettings: 'action.openSettings',
};

const DIAGRAM_GUIDANCE: Record<string, { key: MessageKey; actions: GuidanceAction[] }> = {
  BROWSER_NOT_FOUND: {
    key: 'guidance.browserNotFound',
    actions: ['runDoctor', 'openSettings'],
  },
  PLANTUML_JAR_NOT_CONFIGURED: {
    key: 'guidance.plantumlJarNotConfigured',
    actions: ['downloadPlantUml', 'openSettings', 'runDoctor'],
  },
  PLANTUML_JAR_NOT_FOUND: {
    key: 'guidance.plantumlJarNotFound',
    actions: ['downloadPlantUml', 'openSettings', 'runDoctor'],
  },
  JAVA_NOT_FOUND: {
    key: 'guidance.javaNotFound',
    actions: ['runDoctor', 'openSettings'],
  },
};

const MAX_CAUSE_DEPTH = 10;

export function isGuidanceAction(value: unknown): value is GuidanceAction {
  return typeof value === 'string' && value in ACTION_LABEL_KEYS;
}

export function getActionLabel(action: GuidanceAction, locale: Locale): string {
  return t(ACTION_LABEL_KEYS[action], {}, locale);
}

/**
 * Returns localized guidance for an environment-related diagram error code.
 * Returns undefined for errors caused by the diagram source itself (e.g. syntax errors).
 */
export function getDiagramErrorGuidance(code: string, locale: Locale): ErrorGuidance | undefined {
  const entry = DIAGRAM_GUIDANCE[code];
  return entry ? { message: t(entry.key, {}, locale), actions: entry.actions } : undefined;
}

/**
 * Finds the first environment-related Core error code (e.g. BROWSER_NOT_FOUND)
 * along the error `cause` chain. Unrelated codes such as Node's ENOENT are skipped.
 */
export function findErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth++) {
    const code: unknown = (current as Error & { code?: unknown }).code;
    if (typeof code === 'string' && code in DIAGRAM_GUIDANCE) {
      return code;
    }
    current = current.cause;
  }
  return undefined;
}

/**
 * Returns localized guidance for a failed PDF export, or undefined for non-environment errors.
 */
export function getExportErrorGuidance(error: unknown, locale: Locale): ErrorGuidance | undefined {
  const code = findErrorCode(error);
  if (!code) {
    return undefined;
  }
  if (code === 'BROWSER_NOT_FOUND') {
    return {
      message: t('guidance.exportBrowserNotFound', {}, locale),
      actions: ['runDoctor', 'openSettings'],
    };
  }
  return getDiagramErrorGuidance(code, locale);
}
