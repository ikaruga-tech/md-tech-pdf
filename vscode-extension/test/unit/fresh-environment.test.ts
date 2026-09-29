import * as assert from 'node:assert/strict';
import { formatDoctorReport, runDiagnostics } from '../../src/environment/doctor.js';
import { resolveBrowserPath } from '../../src/environment/browser-resolver.js';
import { resolvePlantUmlJar } from '../../src/environment/plantuml-manager.js';
import { buildLocalizedDiagramErrorHtml } from '../../src/preview/diagram-error-card.js';

/**
 * Simulates a brand-new machine: no browser, no Java, no PlantUML jar,
 * and no bundled chrome-headless-shell (every probe fails).
 */
describe('fresh environment simulation (no browser, no Java, no jar)', () => {
  const nothingExists = () => false;
  const commandFails = async (): Promise<never> => {
    throw new Error('spawn ENOENT');
  };
  const probeFails = async (): Promise<never> => {
    throw new Error('Could not find Chrome (ver. 140.0.0). This can occur if ...');
  };

  for (const platform of ['darwin', 'win32', 'linux'] as const) {
    it(`should resolve nothing on ${platform}`, () => {
      assert.strictEqual(
        resolveBrowserPath({ platform, env: { LOCALAPPDATA: 'C:\\Local' }, exists: nothingExists }),
        undefined
      );
      assert.strictEqual(
        resolvePlantUmlJar(undefined, '/storage', { exists: nothingExists }),
        undefined
      );
    });

    it(`should report every dependency as missing on ${platform}`, async () => {
      const results = await runDiagnostics({
        locale: 'en',
        settings: { javaPath: 'java' },
        globalStorageDir: '/storage',
        platform,
        env: {},
        exists: nothingExists,
        runCommand: commandFails,
        resolveCoreDefaultJar: () => undefined,
        probeMermaid: probeFails,
        probePdf: probeFails,
      });

      assert.deepStrictEqual(
        results.map((r) => r.status),
        ['ERROR', 'ERROR', 'NOT_CONFIGURED', 'ERROR', 'ERROR']
      );
      assert.ok(results.every((r) => r.hints.length > 0));

      const report = formatDoctorReport(results, 'en');
      assert.match(report, /5 item\(s\) need attention/);
      assert.match(report, /md-tech-pdf: Download PlantUML Jar/);
      assert.doesNotMatch(report, /All systems are ready!/);
    });
  }

  it('should show actionable error cards for every missing dependency', () => {
    const cases = [
      { type: 'mermaid', code: 'BROWSER_NOT_FOUND' },
      { type: 'plantuml', code: 'PLANTUML_JAR_NOT_CONFIGURED' },
      { type: 'plantuml', code: 'JAVA_NOT_FOUND' },
    ];
    const allActions = new Set<string>();
    for (const c of cases) {
      const html = buildLocalizedDiagramErrorHtml({ ...c, message: 'raw' }, 'ja');
      for (const m of html.matchAll(/data-md-action="([^"]+)"/g)) {
        allActions.add(m[1]);
      }
    }
    assert.deepStrictEqual([...allActions].sort(), [
      'downloadPlantUml',
      'openSettings',
      'runDoctor',
    ]);
  });
});
