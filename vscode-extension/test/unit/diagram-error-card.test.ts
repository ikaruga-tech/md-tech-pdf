import * as assert from 'node:assert/strict';
import {
  findErrorCode,
  getExportErrorGuidance,
  isGuidanceAction,
} from '../../src/environment/error-guidance.js';
import { buildLocalizedDiagramErrorHtml } from '../../src/preview/diagram-error-card.js';

function actionsIn(html: string): string[] {
  return [...html.matchAll(/data-md-action="([^"]+)"/g)].map((m) => m[1]);
}

describe('diagram-error-card', () => {
  it('should show Japanese browser guidance with Run Doctor and Open Settings', () => {
    const html = buildLocalizedDiagramErrorHtml(
      { type: 'mermaid', code: 'BROWSER_NOT_FOUND', message: 'Could not find Chrome\n    at x' },
      'ja'
    );
    assert.ok(html.startsWith('<div class="md-tech-diagram md-tech-diagram-error">'));
    assert.match(html, /Mermaid ダイアグラムを描画できませんでした/);
    assert.match(
      html,
      /Mermaid ダイアグラムの描画に必要なブラウザ環境（Chrome \/ Edge）が見つかりません。/
    );
    assert.deepStrictEqual(actionsIn(html), ['runDoctor', 'openSettings']);
    assert.match(html, /<details class="md-tech-diagram-error-details">/);
  });

  it('should offer the jar download first when PlantUML jar is not configured', () => {
    const html = buildLocalizedDiagramErrorHtml(
      {
        type: 'plantuml',
        code: 'PLANTUML_JAR_NOT_CONFIGURED',
        message: 'jar path is not configured',
      },
      'en'
    );
    assert.match(html, /PlantUML jar path is not configured\. You can download it automatically/);
    assert.deepStrictEqual(actionsIn(html), ['downloadPlantUml', 'openSettings', 'runDoctor']);
    assert.match(html, />Download PlantUML Jar</);
  });

  it('should show Java guidance', () => {
    const html = buildLocalizedDiagramErrorHtml(
      { type: 'plantuml', code: 'JAVA_NOT_FOUND', message: 'spawn java ENOENT' },
      'ja'
    );
    assert.match(html, /Java 実行環境（JRE\/JDK）が検出されませんでした。/);
    assert.deepStrictEqual(actionsIn(html), ['runDoctor', 'openSettings']);
  });

  it('should show the first error line without actions for syntax errors', () => {
    const html = buildLocalizedDiagramErrorHtml(
      { type: 'mermaid', code: 'RENDER_FAILED', message: 'Error: Parse error on line 2\nstack' },
      'en'
    );
    assert.match(html, /<div class="md-tech-diagram-error-guidance">Parse error on line 2<\/div>/);
    assert.deepStrictEqual(actionsIn(html), []);
  });

  it('should escape raw error messages', () => {
    const html = buildLocalizedDiagramErrorHtml(
      { type: 'mermaid', code: 'RENDER_FAILED', message: '<script>alert(1)</script>' },
      'en'
    );
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
  });
});

describe('error-guidance', () => {
  it('should accept only known actions', () => {
    assert.strictEqual(isGuidanceAction('runDoctor'), true);
    assert.strictEqual(isGuidanceAction('exportPdf'), false);
    assert.strictEqual(isGuidanceAction(undefined), false);
  });

  it('should find environment error codes along the cause chain and skip unrelated codes', () => {
    const inner = Object.assign(new Error('Could not find Chrome'), { code: 'BROWSER_NOT_FOUND' });
    const middle = Object.assign(new Error('spawn failed', { cause: inner }), { code: 'ENOENT' });
    const outer = new Error('Failed to render HTML document', { cause: middle });
    assert.strictEqual(findErrorCode(outer), 'BROWSER_NOT_FOUND');
    assert.strictEqual(findErrorCode(new Error('plain')), undefined);
    assert.strictEqual(findErrorCode('not an error'), undefined);
  });

  it('should build export guidance for browser and PlantUML problems only', () => {
    const browserError = new Error('wrap', {
      cause: Object.assign(new Error('launch'), { code: 'BROWSER_NOT_FOUND' }),
    });
    assert.deepStrictEqual(getExportErrorGuidance(browserError, 'en'), {
      message:
        'Could not find a supported browser (Google Chrome or Microsoft Edge) required to export PDF.',
      actions: ['runDoctor', 'openSettings'],
    });

    const jarError = Object.assign(new Error('jar'), { code: 'PLANTUML_JAR_NOT_CONFIGURED' });
    assert.deepStrictEqual(getExportErrorGuidance(jarError, 'en')?.actions, [
      'downloadPlantUml',
      'openSettings',
      'runDoctor',
    ]);
    assert.strictEqual(getExportErrorGuidance(new Error('disk full'), 'en'), undefined);
  });
});
