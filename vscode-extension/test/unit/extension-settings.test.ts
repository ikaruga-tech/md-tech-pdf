import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import {
  parseExtensionSettings,
  resolveCustomOutputPath,
} from '../../src/config/settings.js';

describe('extension-settings', () => {
  describe('parseExtensionSettings', () => {
    it('should provide default settings when raw input is empty or undefined', () => {
      const settings = parseExtensionSettings();
      assert.strictEqual(settings.plantuml.javaPath, 'java');
      assert.strictEqual(settings.plantuml.jarPath, undefined);
      assert.strictEqual(settings.export.outputDirectory, undefined);
      assert.strictEqual(settings.export.afterExport, 'none');
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
      assert.strictEqual(
        resolveCustomOutputPath(input, 'generated/pdf', workspace),
        expected
      );
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
