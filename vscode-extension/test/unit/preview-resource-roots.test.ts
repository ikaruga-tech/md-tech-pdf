import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import './mock-vscode.js';
import * as vscode from 'vscode';
import { resolveLocalResourceRoots } from '../../src/preview/preview-panel.js';

describe('preview-resource-roots', () => {
  afterEach(() => {
    // Reset mock
    (vscode.workspace as any).getWorkspaceFolder = () => undefined;
  });

  it('should restrict local resource roots strictly to the parent directory for standalone markdown document', () => {
    (vscode.workspace as any).getWorkspaceFolder = () => undefined;

    const docPath = path.resolve('/workspace/project/docs/guide.md');
    const docUri = vscode.Uri.file(docPath);

    const roots = resolveLocalResourceRoots(docUri);

    assert.strictEqual(roots.length, 1);
    assert.strictEqual(roots[0].fsPath, path.dirname(docPath));
    assert.strictEqual(roots[0].fsPath, path.resolve('/workspace/project/docs'));
  });

  it('should include both document directory and workspace folder root when document belongs to a workspace', () => {
    const workspaceRoot = path.resolve('/workspace/project');
    (vscode.workspace as any).getWorkspaceFolder = (uri: vscode.Uri) => {
      if (uri.fsPath.startsWith(workspaceRoot)) {
        return {
          uri: vscode.Uri.file(workspaceRoot),
          name: 'project',
          index: 0,
        };
      }
      return undefined;
    };

    const docPath = path.resolve('/workspace/project/nested/sub/document.md');
    const docUri = vscode.Uri.file(docPath);

    const roots = resolveLocalResourceRoots(docUri);

    assert.strictEqual(roots.length, 2);
    assert.strictEqual(roots[0].fsPath, path.resolve('/workspace/project/nested/sub'));
    assert.strictEqual(roots[1].fsPath, workspaceRoot);
  });

  it('should include extensionUri in local resource roots when provided', () => {
    const docPath = path.resolve('/workspace/project/docs/guide.md');
    const docUri = vscode.Uri.file(docPath);
    const extensionUri = vscode.Uri.file('/opt/extensions/md-tech-pdf');

    const roots = resolveLocalResourceRoots(docUri, extensionUri);

    assert.strictEqual(roots.length, 2);
    assert.strictEqual(roots[0].fsPath, path.resolve('/workspace/project/docs'));
    assert.strictEqual(roots[1].fsPath, '/opt/extensions/md-tech-pdf');
  });
});
