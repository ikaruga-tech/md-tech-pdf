import * as vscode from 'vscode';
import { getExtensionSettings } from '../config/extension-settings.js';
import { downloadPlantUmlJar, getManagedJarPath } from '../environment/plantuml-manager.js';
import { getLocale, t } from '../i18n/index.js';
import { getErrorMessage } from '../utils/error-utils.js';

const BYTES_PER_MB = 1024 * 1024;

function toMegabytes(bytes: number): string {
  return (bytes / BYTES_PER_MB).toFixed(1);
}

/**
 * Creates the command handler for "md-tech-pdf.downloadPlantUmlJar".
 * Downloads plantuml.jar into the extension global storage and refreshes open previews.
 */
export function createDownloadPlantUmlJarCommand(
  globalStorageDir: string,
  onDownloaded: () => Promise<void>
) {
  return async function downloadPlantUmlJarCommand(): Promise<void> {
    const locale = getLocale();
    const destPath = getManagedJarPath(globalStorageDir);
    const abortController = new AbortController();

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t('download.progressTitle', {}, locale),
          cancellable: true,
        },
        async (progress, token) => {
          token.onCancellationRequested(() => abortController.abort());
          let reportedPercent = 0;

          await downloadPlantUmlJar(destPath, {
            signal: abortController.signal,
            onProgress: ({ receivedBytes, totalBytes }) => {
              if (totalBytes) {
                const percent = Math.floor((receivedBytes / totalBytes) * 100);
                progress.report({
                  increment: percent - reportedPercent,
                  message: t(
                    'download.progressBytes',
                    { received: toMegabytes(receivedBytes), total: toMegabytes(totalBytes) },
                    locale
                  ),
                });
                reportedPercent = percent;
              } else {
                progress.report({
                  message: t(
                    'download.progressBytesUnknown',
                    { received: toMegabytes(receivedBytes) },
                    locale
                  ),
                });
              }
            },
          });
        }
      );
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        void vscode.window.showInformationMessage(t('download.cancelled', {}, locale));
        return;
      }
      console.error('[md-tech-pdf] PlantUML jar download failed', err);
      void vscode.window.showErrorMessage(
        t('download.failed', { message: getErrorMessage(err) }, locale)
      );
      return;
    }

    const isOverriddenBySetting = Boolean(getExtensionSettings().plantuml.jarPath);
    void vscode.window.showInformationMessage(
      t(
        isOverriddenBySetting ? 'download.completedButOverridden' : 'download.completed',
        { path: destPath },
        locale
      )
    );
    await onDownloaded();
  };
}
