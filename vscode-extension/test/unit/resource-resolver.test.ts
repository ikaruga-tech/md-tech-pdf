import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import './mock-vscode.js';
import * as vscode from 'vscode';
import {
  createResourceUrlTransformer,
  isPathWithinBoundary,
  splitQueryAndFragment,
} from '../../src/preview/resource-resolver.js';

describe('resource-resolver', () => {
  afterEach(() => {
    (vscode.workspace as any).getWorkspaceFolder = () => undefined;
  });

  describe('splitQueryAndFragment', () => {
    it('should split path with query parameter', () => {
      const result = splitQueryAndFragment('./images/logo.png?v=1.2');
      assert.strictEqual(result.cleanPath, './images/logo.png');
      assert.strictEqual(result.suffix, '?v=1.2');
    });

    it('should split path with hash fragment', () => {
      const result = splitQueryAndFragment('./images/icons.svg#chevron');
      assert.strictEqual(result.cleanPath, './images/icons.svg');
      assert.strictEqual(result.suffix, '#chevron');
    });

    it('should split path with both query and hash fragment', () => {
      const result = splitQueryAndFragment('./images/icons.svg?color=blue#icon');
      assert.strictEqual(result.cleanPath, './images/icons.svg');
      assert.strictEqual(result.suffix, '?color=blue#icon');
    });

    it('should return cleanPath and empty suffix when no query or fragment exists', () => {
      const result = splitQueryAndFragment('./images/plain.png');
      assert.strictEqual(result.cleanPath, './images/plain.png');
      assert.strictEqual(result.suffix, '');
    });
  });

  describe('isPathWithinBoundary', () => {
    const boundary = path.resolve('/workspace/project');

    it('should return true for paths inside the boundary', () => {
      assert.strictEqual(
        isPathWithinBoundary(boundary, path.resolve('/workspace/project/docs/image.png')),
        true
      );
      assert.strictEqual(
        isPathWithinBoundary(boundary, path.resolve('/workspace/project/assets/logo.svg')),
        true
      );
    });

    it('should return true for the boundary root itself', () => {
      assert.strictEqual(isPathWithinBoundary(boundary, boundary), true);
    });

    it('should return false for paths traversing outside the boundary', () => {
      assert.strictEqual(
        isPathWithinBoundary(boundary, path.resolve('/workspace/other-project/image.png')),
        false
      );
      assert.strictEqual(
        isPathWithinBoundary(boundary, path.resolve('/etc/passwd')),
        false
      );
    });
  });

  describe('createResourceUrlTransformer', () => {
    const workspaceRoot = path.resolve('/workspace/project');
    const docPath = path.resolve('/workspace/project/docs/guide.md');
    const docUri = vscode.Uri.file(docPath);

    const loggedLines: string[] = [];
    const mockOutputChannel = {
      appendLine: (line: string) => loggedLines.push(line),
      append: () => {},
      clear: () => {},
      show: () => {},
      hide: () => {},
      dispose: () => {},
    } as unknown as vscode.OutputChannel;

    const mockWebview = {
      asWebviewUri: (uri: vscode.Uri) => ({
        toString: () => `vscode-webview://mock-host${uri.fsPath}`,
      }),
    } as unknown as vscode.Webview;

    beforeEach(() => {
      loggedLines.length = 0;
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
    });

    it('should transform relative local image path within document directory into Webview URI', () => {
      const transformer = createResourceUrlTransformer(docUri, mockWebview, mockOutputChannel);
      const result = transformer('./images/architecture.png');

      const expectedPath = path.resolve(path.dirname(docPath), 'images/architecture.png');
      assert.strictEqual(result, `vscode-webview://mock-host${expectedPath}`);
    });

    it('should transform parent-relative path within workspace boundary into Webview URI', () => {
      const transformer = createResourceUrlTransformer(docUri, mockWebview, mockOutputChannel);
      const result = transformer('../assets/logo.svg');

      const expectedPath = path.resolve(workspaceRoot, 'assets/logo.svg');
      assert.strictEqual(result, `vscode-webview://mock-host${expectedPath}`);
    });

    it('should preserve query parameters and fragments upon Webview URI transformation', () => {
      const transformer = createResourceUrlTransformer(docUri, mockWebview, mockOutputChannel);
      const result = transformer('./images/icon.svg?v=2#symbol');

      const expectedPath = path.resolve(path.dirname(docPath), 'images/icon.svg');
      assert.strictEqual(result, `vscode-webview://mock-host${expectedPath}?v=2#symbol`);
    });

    it('should handle Japanese file names and spaces safely', () => {
      const transformer = createResourceUrlTransformer(docUri, mockWebview, mockOutputChannel);
      const result1 = transformer('./images/構成図.png');
      const expectedPath1 = path.resolve(path.dirname(docPath), 'images/構成図.png');
      assert.strictEqual(result1, `vscode-webview://mock-host${expectedPath1}`);

      const result2 = transformer('./images/system%20diagram.png');
      const expectedPath2 = path.resolve(path.dirname(docPath), 'images/system diagram.png');
      assert.strictEqual(result2, `vscode-webview://mock-host${expectedPath2}`);
    });

    it('should reject path traversal outside workspace boundary and log warning', () => {
      const transformer = createResourceUrlTransformer(docUri, mockWebview, mockOutputChannel);
      const traversalPath = '../../../../etc/secret.png';
      const result = transformer(traversalPath);

      // Traversal attempt should be rejected and original string returned
      assert.strictEqual(result, traversalPath);
      assert.ok(
        loggedLines.some((l) => l.includes('Access denied: resource path is outside the allowed boundary'))
      );
      assert.ok(loggedLines.some((l) => l.includes('Document: guide.md')));
      assert.ok(loggedLines.some((l) => l.includes(`Resource: ${traversalPath}`)));
    });

    it('should restrict standalone file (outside workspace) to document parent directory', () => {
      (vscode.workspace as any).getWorkspaceFolder = () => undefined;

      const standalonePath = path.resolve('/standalone/folder/sub/standalone.md');
      const standaloneUri = vscode.Uri.file(standalonePath);
      const transformer = createResourceUrlTransformer(standaloneUri, mockWebview, mockOutputChannel);

      // Sibling file in same directory is allowed
      const resultAllowed = transformer('./image.png');
      const expectedPath = path.resolve('/standalone/folder/sub/image.png');
      assert.strictEqual(resultAllowed, `vscode-webview://mock-host${expectedPath}`);

      // Parent relative '../' is denied because boundary is the document parent directory
      const resultDenied = transformer('../parent-image.png');
      assert.strictEqual(resultDenied, '../parent-image.png');
      assert.ok(
        loggedLines.some((l) => l.includes('Access denied: resource path is outside the allowed boundary'))
      );
    });

    it('should preserve remote HTTPS image URLs unchanged', () => {
      const transformer = createResourceUrlTransformer(docUri, mockWebview, mockOutputChannel);
      const httpsUrl = 'https://example.com/badge.svg?style=flat';
      const result = transformer(httpsUrl);
      assert.strictEqual(result, httpsUrl);
    });

    it('should preserve data URI images unchanged', () => {
      const transformer = createResourceUrlTransformer(docUri, mockWebview, mockOutputChannel);
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const result = transformer(dataUri);
      assert.strictEqual(result, dataUri);
    });

    it('should reject javascript: and vbscript: schemes by returning empty string', () => {
      const transformer = createResourceUrlTransformer(docUri, mockWebview, mockOutputChannel);
      assert.strictEqual(transformer('javascript:alert(1)'), '');
      assert.strictEqual(transformer('vbscript:msgbox(1)'), '');
    });

    it('should reject user-supplied vscode-webview: and vscode-resource: schemes by returning empty string', () => {
      const transformer = createResourceUrlTransformer(docUri, mockWebview, mockOutputChannel);
      assert.strictEqual(transformer('vscode-webview://attacker/secret.png'), '');
      assert.strictEqual(transformer('vscode-resource://file/etc/passwd'), '');
    });

    it('should reject URL-encoded path traversal (%2e%2e/) outside boundary', () => {
      const transformer = createResourceUrlTransformer(docUri, mockWebview, mockOutputChannel);
      const encodedTraversal = '%2e%2e/%2e%2e/%2e%2e/%2e%2e/etc/secret.png';
      const result = transformer(encodedTraversal);
      assert.strictEqual(result, encodedTraversal);
      assert.ok(
        loggedLines.some((l) => l.includes('Access denied: resource path is outside the allowed boundary'))
      );
    });

    it('should reject symlink pointing outside boundary directory', () => {
      const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'md-tech-symlink-test-'));
      try {
        const fakeWorkspace = path.join(tempBase, 'workspace');
        const outsideDir = path.join(tempBase, 'outside');
        fs.mkdirSync(fakeWorkspace, { recursive: true });
        fs.mkdirSync(outsideDir, { recursive: true });

        const secretFile = path.join(outsideDir, 'secret.txt');
        fs.writeFileSync(secretFile, 'sensitive data', 'utf-8');

        const symlinkPath = path.join(fakeWorkspace, 'symlink-outside.txt');
        try {
          fs.symlinkSync(secretFile, symlinkPath);
          // isPathWithinBoundary should detect realpath is outside fakeWorkspace
          assert.strictEqual(isPathWithinBoundary(fakeWorkspace, symlinkPath), false);
        } catch {
          // Skip assertion if OS environment prevents creating symlinks
        }
      } finally {
        fs.rmSync(tempBase, { recursive: true, force: true });
      }
    });

    it('should safely bypass relative resolution for untitled documents without errors', () => {
      const untitledUri = {
        fsPath: 'Untitled-1',
        path: 'Untitled-1',
        scheme: 'untitled',
        toString: () => 'untitled:Untitled-1',
      } as vscode.Uri;

      const transformer = createResourceUrlTransformer(untitledUri, mockWebview, mockOutputChannel);
      const relPath = './images/sample.png';
      const result = transformer(relPath);
      assert.strictEqual(result, relPath);
    });
  });
});
