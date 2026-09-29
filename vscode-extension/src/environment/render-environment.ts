import type { ExtensionSettings } from '../config/settings.js';
import { resolveBrowserPath } from './browser-resolver.js';
import { resolvePlantUmlJar } from './plantuml-manager.js';

export interface RenderEnvironment {
  browserExecutablePath?: string;
  plantumlJarPath?: string;
}

/**
 * Resolves the browser and PlantUML jar shared by preview rendering and PDF export,
 * so both paths render diagrams with the identical toolchain.
 * An undefined value lets Core fall back to its own defaults.
 */
export function resolveRenderEnvironment(
  settings: ExtensionSettings,
  globalStorageDir?: string
): RenderEnvironment {
  const browser = resolveBrowserPath({ configuredPath: settings.browser.executablePath });
  const jar = resolvePlantUmlJar(settings.plantuml.jarPath, globalStorageDir);
  return {
    browserExecutablePath: browser?.path,
    plantumlJarPath: jar?.path,
  };
}
