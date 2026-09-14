import * as assert from 'node:assert/strict';
import './mock-vscode.js';
import { getPreviewOutputChannel } from '../../src/preview/preview-panel.js';

describe('preview-panel OutputChannel', () => {
  it('should return a singleton OutputChannel instance named md-tech-pdf', () => {
    const ch1 = getPreviewOutputChannel();
    const ch2 = getPreviewOutputChannel();

    assert.ok(ch1);
    assert.strictEqual(ch1, ch2);
  });
});
