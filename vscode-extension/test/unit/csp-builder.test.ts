import * as assert from 'node:assert/strict';
import { buildPreviewCsp } from '../../src/preview/csp-builder.js';

describe('csp-builder', () => {
  const dummyCspSource = 'vscode-webview-resource:';

  it('should generate a Content-Security-Policy meta tag', () => {
    const metaTag = buildPreviewCsp(dummyCspSource);
    assert.match(metaTag, /^<meta http-equiv="Content-Security-Policy" content=".*">$/);
  });

  it('should deny scripts completely by not declaring script-src and setting default-src to none', () => {
    const metaTag = buildPreviewCsp(dummyCspSource);
    assert.match(metaTag, /default-src 'none'/);
    assert.doesNotMatch(metaTag, /script-src/);
  });

  it('should allow Google Fonts in style-src and font-src', () => {
    const metaTag = buildPreviewCsp(dummyCspSource);
    assert.match(metaTag, /style-src[^;]*https:\/\/fonts\.googleapis\.com/);
    assert.match(metaTag, /font-src[^;]*https:\/\/fonts\.gstatic\.com/);
  });

  it('should include the provided cspSource in style-src, img-src, and font-src', () => {
    const customSource = 'https://*.vscode-cdn.net';
    const metaTag = buildPreviewCsp(customSource);
    assert.match(metaTag, /img-src[^;]*https:\/\/\*\.vscode-cdn\.net/);
    assert.match(metaTag, /style-src[^;]*https:\/\/\*\.vscode-cdn\.net/);
    assert.match(metaTag, /font-src[^;]*https:\/\/\*\.vscode-cdn\.net/);
  });

  it('should explicitly permit https: and data: in img-src for remote diagrams/badges and inline SVG/data images', () => {
    const metaTag = buildPreviewCsp(dummyCspSource);
    assert.match(metaTag, /img-src[^;]*data:/);
    assert.match(metaTag, /img-src[^;]*https:/);
    // Disallows unsafe inline or wildcard schemes outside https:/data:
    assert.doesNotMatch(metaTag, /img-src[^;]*'unsafe-inline'/);
    assert.doesNotMatch(metaTag, /img-src[^;]*http:/);
  });
});
