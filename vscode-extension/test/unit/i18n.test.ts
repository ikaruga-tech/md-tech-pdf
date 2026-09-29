import * as assert from 'node:assert/strict';
import { setMockLanguage } from './mock-vscode.js';
import { getLocale, resolveLocale, t } from '../../src/i18n/index.js';
import { MESSAGES } from '../../src/i18n/messages.js';

describe('i18n', () => {
  afterEach(() => {
    setMockLanguage('en');
  });

  describe('resolveLocale', () => {
    it('should map Japanese display languages to ja', () => {
      assert.strictEqual(resolveLocale('ja'), 'ja');
      assert.strictEqual(resolveLocale('ja-JP'), 'ja');
    });

    it('should fall back to en for every other language', () => {
      assert.strictEqual(resolveLocale('en'), 'en');
      assert.strictEqual(resolveLocale('zh-cn'), 'en');
      assert.strictEqual(resolveLocale(undefined), 'en');
    });
  });

  describe('getLocale', () => {
    it('should follow vscode.env.language', () => {
      setMockLanguage('ja');
      assert.strictEqual(getLocale(), 'ja');
      setMockLanguage('de');
      assert.strictEqual(getLocale(), 'en');
    });
  });

  describe('t', () => {
    it('should return the specified guidance messages in both languages', () => {
      assert.strictEqual(
        t('guidance.browserNotFound', {}, 'ja'),
        'Mermaid ダイアグラムの描画に必要なブラウザ環境（Chrome / Edge）が見つかりません。'
      );
      assert.strictEqual(
        t('guidance.javaNotFound', {}, 'en'),
        'Java runtime environment (JRE/JDK) was not found. Java is required to execute PlantUML.'
      );
    });

    it('should substitute placeholders and keep unknown ones', () => {
      assert.strictEqual(
        t('download.progressBytes', { received: '1.0', total: '10.0' }, 'en'),
        '1.0 MB / 10.0 MB'
      );
      assert.strictEqual(t('download.progressBytes', { received: 2 }, 'en'), '2 MB / {total} MB');
    });

    it('should use the current VS Code language when locale is omitted', () => {
      setMockLanguage('ja');
      assert.strictEqual(t('action.runDoctor'), '環境診断を実行');
    });
  });

  it('should define non-empty messages for every key in every locale', () => {
    for (const messages of Object.values(MESSAGES)) {
      for (const key of Object.keys(MESSAGES.en)) {
        const value = messages[key as keyof typeof MESSAGES.en];
        assert.ok(value && value.trim().length > 0, `missing message: ${key}`);
      }
    }
  });
});
