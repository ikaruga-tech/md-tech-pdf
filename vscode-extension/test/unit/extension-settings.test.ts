import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import { parseExtensionSettings, resolveCustomOutputPath } from '../../src/config/settings.js';

describe('extension-settings', () => {
  describe('parseExtensionSettings', () => {
    it('should provide default settings when raw input is empty or undefined', () => {
      const settings = parseExtensionSettings();
      assert.strictEqual(settings.plantuml.javaPath, 'java');
      assert.strictEqual(settings.plantuml.jarPath, undefined);
      assert.strictEqual(settings.export.outputDirectory, undefined);
      assert.strictEqual(settings.export.afterExport, 'none');
      assert.strictEqual(settings.preview.debounceDelay, 500);
      assert.strictEqual(settings.preview.cache.persistent, true);
    });

    it('should parse preview.debounceDelay setting with bounds and fallback', () => {
      const customSetting = parseExtensionSettings({
        preview: { debounceDelay: 300 },
      });
      assert.strictEqual(customSetting.preview.debounceDelay, 300);

      const largeSetting = parseExtensionSettings({
        preview: { debounceDelay: 1200 },
      });
      assert.strictEqual(largeSetting.preview.debounceDelay, 1200);

      const floatSetting = parseExtensionSettings({
        preview: { debounceDelay: 250.9 },
      });
      assert.strictEqual(floatSetting.preview.debounceDelay, 250);

      const belowMinSetting = parseExtensionSettings({
        preview: { debounceDelay: 50 },
      });
      assert.strictEqual(belowMinSetting.preview.debounceDelay, 500);

      const negativeSetting = parseExtensionSettings({
        preview: { debounceDelay: -100 },
      });
      assert.strictEqual(negativeSetting.preview.debounceDelay, 500);

      const nanSetting = parseExtensionSettings({
        preview: { debounceDelay: NaN },
      });
      assert.strictEqual(nanSetting.preview.debounceDelay, 500);

      const invalidTypeSetting = parseExtensionSettings({
        preview: { debounceDelay: 'fast' as unknown as number },
      });
      assert.strictEqual(invalidTypeSetting.preview.debounceDelay, 500);
    });

    it('should parse preview.cache.persistent setting', () => {
      const falseSetting = parseExtensionSettings({
        preview: { cache: { persistent: false } },
      });
      assert.strictEqual(falseSetting.preview.cache.persistent, false);

      const trueSetting = parseExtensionSettings({
        preview: { cache: { persistent: true } },
      });
      assert.strictEqual(trueSetting.preview.cache.persistent, true);

      const nonBoolSetting = parseExtensionSettings({
        preview: { cache: { persistent: 'invalid' as unknown as boolean } },
      });
      assert.strictEqual(nonBoolSetting.preview.cache.persistent, true);
    });

    it('should trim string values properly', () => {
      const settings = parseExtensionSettings({
        plantuml: {
          javaPath: '  /usr/bin/java  ',
          jarPath: '  /opt/plantuml.jar  ',
        },
        export: {
          outputDirectory: '  dist/pdf  ',
          afterExport: 'open',
        },
      });

      assert.strictEqual(settings.plantuml.javaPath, '/usr/bin/java');
      assert.strictEqual(settings.plantuml.jarPath, '/opt/plantuml.jar');
      assert.strictEqual(settings.export.outputDirectory, 'dist/pdf');
      assert.strictEqual(settings.export.afterExport, 'open');
    });

    it('should treat empty or whitespace-only jarPath and outputDirectory as unspecified', () => {
      const settings = parseExtensionSettings({
        plantuml: {
          javaPath: '   ',
          jarPath: '   ',
        },
        export: {
          outputDirectory: '',
          afterExport: 'reveal',
        },
      });

      assert.strictEqual(settings.plantuml.javaPath, 'java');
      assert.strictEqual(settings.plantuml.jarPath, undefined);
      assert.strictEqual(settings.export.outputDirectory, undefined);
      assert.strictEqual(settings.export.afterExport, 'reveal');
    });

    it('should validate afterExport and fall back to none on invalid values', () => {
      const noneSetting = parseExtensionSettings({ export: { afterExport: 'none' } });
      assert.strictEqual(noneSetting.export.afterExport, 'none');

      const openSetting = parseExtensionSettings({ export: { afterExport: 'open' } });
      assert.strictEqual(openSetting.export.afterExport, 'open');

      const revealSetting = parseExtensionSettings({ export: { afterExport: 'reveal' } });
      assert.strictEqual(revealSetting.export.afterExport, 'reveal');

      const invalidSetting = parseExtensionSettings({ export: { afterExport: 'invalid_action' } });
      assert.strictEqual(invalidSetting.export.afterExport, 'none');
    });

    it('should parse and normalize styles array', () => {
      const defaultSetting = parseExtensionSettings();
      assert.deepStrictEqual(defaultSetting.styles, []);

      const validSetting = parseExtensionSettings({
        styles: ['  styles/theme.css  ', 'custom.css', '   ', ''],
      });
      assert.deepStrictEqual(validSetting.styles, ['styles/theme.css', 'custom.css']);

      const invalidTypeSetting = parseExtensionSettings({
        styles: 'not-an-array' as unknown as string[],
      });
      assert.deepStrictEqual(invalidTypeSetting.styles, []);

      const mixedTypeSetting = parseExtensionSettings({
        styles: ['valid.css', 123, null, undefined] as unknown as string[],
      });
      assert.deepStrictEqual(mixedTypeSetting.styles, ['valid.css']);
    });
  });

  describe('resolveCustomOutputPath', () => {
    it('should use input file directory when outputDirectory is undefined or empty', () => {
      const input = path.join('/work', 'docs', 'sample.md');
      const expected = path.join('/work', 'docs', 'sample.pdf');
      assert.strictEqual(resolveCustomOutputPath(input), expected);
      assert.strictEqual(resolveCustomOutputPath(input, ''), expected);
      assert.strictEqual(resolveCustomOutputPath(input, '   '), expected);
    });

    it('should resolve workspace-relative output directory', () => {
      const workspace = path.join('/work', 'project');
      const input = path.join('/work', 'project', 'docs', 'sample.md');
      const expected = path.join('/work', 'project', 'generated', 'pdf', 'sample.pdf');
      assert.strictEqual(resolveCustomOutputPath(input, 'generated/pdf', workspace), expected);
    });

    it('should resolve absolute output directory without using workspace', () => {
      const input = path.join('/work', 'project', 'docs', 'sample.md');
      const absoluteOutputDir = path.resolve('/tmp', 'pdf');
      const expected = path.join(absoluteOutputDir, 'sample.pdf');
      assert.strictEqual(
        resolveCustomOutputPath(input, absoluteOutputDir, '/work/project'),
        expected
      );
    });

    it('should fall back to input file directory if workspace folder is not provided for relative path', () => {
      const input = path.join('/standalone', 'folder', 'sample.md');
      const expected = path.join('/standalone', 'folder', 'sub', 'sample.pdf');
      assert.strictEqual(resolveCustomOutputPath(input, 'sub'), expected);
    });
  });
});
