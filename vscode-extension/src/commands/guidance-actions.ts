import * as vscode from 'vscode';
import {
  type ErrorGuidance,
  type GuidanceAction,
  getActionLabel,
} from '../environment/error-guidance.js';
import { type Locale, getLocale } from '../i18n/index.js';

export const RUN_DOCTOR_COMMAND = 'md-tech-pdf.runDoctor';
export const DOWNLOAD_PLANTUML_JAR_COMMAND = 'md-tech-pdf.downloadPlantUmlJar';
const EXTENSION_SETTINGS_QUERY = '@ext:ikaruga-tech.md-tech-pdf';

/**
 * Executes a one-click resolution action from an error card or notification.
 */
export async function executeGuidanceAction(action: GuidanceAction): Promise<void> {
  if (action === 'runDoctor') {
    await vscode.commands.executeCommand(RUN_DOCTOR_COMMAND);
  } else if (action === 'downloadPlantUml') {
    await vscode.commands.executeCommand(DOWNLOAD_PLANTUML_JAR_COMMAND);
  } else {
    await vscode.commands.executeCommand('workbench.action.openSettings', EXTENSION_SETTINGS_QUERY);
  }
}

/**
 * Shows an error notification with localized guidance and runs the action the user selects.
 */
export async function showGuidanceNotification(
  guidance: ErrorGuidance,
  locale: Locale = getLocale()
): Promise<void> {
  const labels = guidance.actions.map((action) => getActionLabel(action, locale));
  const selected = await vscode.window.showErrorMessage(
    `md-tech-pdf: ${guidance.message}`,
    ...labels
  );
  const action = guidance.actions.find(
    (candidate) => getActionLabel(candidate, locale) === selected
  );
  if (action) {
    await executeGuidanceAction(action);
  }
}
