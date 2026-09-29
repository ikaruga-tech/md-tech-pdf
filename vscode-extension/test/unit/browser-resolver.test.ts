import * as assert from 'node:assert/strict';
import {
  detectBrowserName,
  getBrowserCandidates,
  resolveBrowserPath,
} from '../../src/environment/browser-resolver.js';

function existsOnly(...paths: string[]): (filePath: string) => boolean {
  const available = new Set(paths);
  return (filePath) => available.has(filePath);
}

describe('browser-resolver', () => {
  describe('getBrowserCandidates', () => {
    it('should list macOS browsers in priority order', () => {
      assert.deepStrictEqual(
        getBrowserCandidates('darwin', {}).map((c) => c.path),
        [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
          '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ]
      );
    });

    it('should list Windows browsers including expanded %LOCALAPPDATA% paths', () => {
      assert.deepStrictEqual(
        getBrowserCandidates('win32', { LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' }).map(
          (c) => c.path
        ),
        [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Users\\me\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Users\\me\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe',
        ]
      );
    });

    it('should omit user-local Windows paths when LOCALAPPDATA is not set', () => {
      assert.strictEqual(getBrowserCandidates('win32', {}).length, 4);
    });

    it('should list Linux browsers in priority order', () => {
      assert.deepStrictEqual(
        getBrowserCandidates('linux', {}).map((c) => c.path),
        [
          '/usr/bin/google-chrome',
          '/usr/bin/microsoft-edge',
          '/usr/bin/brave-browser',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
        ]
      );
    });

    it('should return no candidates for unsupported platforms', () => {
      assert.deepStrictEqual(getBrowserCandidates('aix', {}), []);
    });
  });

  describe('resolveBrowserPath', () => {
    it('should prefer the configured path when it exists', () => {
      const configured = '/opt/custom/msedge';
      const result = resolveBrowserPath({
        configuredPath: `  ${configured}  `,
        platform: 'darwin',
        exists: existsOnly(
          configured,
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        ),
      });
      assert.deepStrictEqual(result, {
        name: 'Microsoft Edge',
        path: configured,
        source: 'setting',
      });
    });

    it('should fall back to auto-detection when the configured path does not exist', () => {
      const edge = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
      const result = resolveBrowserPath({
        configuredPath: '/missing/chrome',
        platform: 'darwin',
        exists: existsOnly(edge),
      });
      assert.deepStrictEqual(result, { name: 'Microsoft Edge', path: edge, source: 'auto' });
    });

    it('should pick the first installed candidate on Windows', () => {
      const localEdge = 'C:\\Users\\me\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe';
      const x86Edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
      const result = resolveBrowserPath({
        platform: 'win32',
        env: { LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' },
        exists: existsOnly(localEdge, x86Edge),
      });
      assert.strictEqual(result?.path, x86Edge);
    });

    it('should detect Chromium on Linux', () => {
      const result = resolveBrowserPath({
        platform: 'linux',
        exists: existsOnly('/usr/bin/chromium-browser'),
      });
      assert.deepStrictEqual(result, {
        name: 'Chromium',
        path: '/usr/bin/chromium-browser',
        source: 'auto',
      });
    });

    it('should return undefined when no browser is installed', () => {
      assert.strictEqual(resolveBrowserPath({ platform: 'linux', exists: () => false }), undefined);
    });
  });

  describe('detectBrowserName', () => {
    it('should infer well-known browser names from executable paths', () => {
      assert.strictEqual(detectBrowserName('C:\\x\\msedge.exe'), 'Microsoft Edge');
      assert.strictEqual(detectBrowserName('/usr/bin/brave-browser'), 'Brave Browser');
      assert.strictEqual(detectBrowserName('/usr/bin/chromium'), 'Chromium');
      assert.strictEqual(detectBrowserName('/usr/bin/google-chrome'), 'Google Chrome');
      assert.strictEqual(detectBrowserName('/opt/vivaldi/vivaldi'), 'vivaldi');
    });
  });
});
