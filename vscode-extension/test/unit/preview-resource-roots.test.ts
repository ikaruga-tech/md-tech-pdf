import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import './mock-vscode.js';
import * as vscode from 'vscode';
import { resolveLocalResourceRoots } from '../../src/preview/preview-panel.js';

describe('preview-resource-roots', () => {
  it('should restrict local resource roots strictly to the parent directory of the markdown document', () => {
    const docPath = path.resolve('/workspace/project/docs/guide.md');
    const docUri = vscode.Uri.file(docPath);

    const roots = resolveLocalResourceRoots(docUri);

    assert.strictEqual(roots.length, 1);
    assert.strictEqual(roots[0].fsPath, path.dirname(docPath));
    assert.strictEqual(roots[0].fsPath, path.resolve('/workspace/project/docs'));
  });

  it('should not include the root workspace directory in localResourceRoots according to Least Privilege', () => {
    const docPath = path.resolve('/workspace/project/nested/sub/document.md');
    const docUri = vscode.Uri.file(docPath);

    const roots = resolveLocalResourceRoots(docUri);

    // Only the immediate parent directory is permitted
    assert.strictEqual(roots.length, 1);
    assert.notStrictEqual(roots[0].fsPath, path.resolve('/workspace/project'));
    assert.strictEqual(roots[0].fsPath, path.resolve('/workspace/project/nested/sub'));
  });
});
