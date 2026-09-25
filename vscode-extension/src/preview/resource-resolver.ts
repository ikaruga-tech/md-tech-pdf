import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 * Splits a resource URL or path into the base path component and any query/fragment suffix.
 */
export function splitQueryAndFragment(rawUrl: string): { cleanPath: string; suffix: string } {
  const queryIndex = rawUrl.indexOf('?');
  const hashIndex = rawUrl.indexOf('#');

  let splitIndex = -1;
  if (queryIndex !== -1 && hashIndex !== -1) {
    splitIndex = Math.min(queryIndex, hashIndex);
  } else if (queryIndex !== -1) {
    splitIndex = queryIndex;
  } else if (hashIndex !== -1) {
    splitIndex = hashIndex;
  }

  if (splitIndex === -1) {
    return { cleanPath: rawUrl, suffix: '' };
  }

  return {
    cleanPath: rawUrl.slice(0, splitIndex),
    suffix: rawUrl.slice(splitIndex),
  };
}

/**
 * Checks whether a given target path is strictly contained within an allowed boundary directory,
 * taking symlink realpaths into account.
 */
export function isPathWithinBoundary(boundaryDir: string, targetPath: string): boolean {
  let normalizedBoundary = path.resolve(boundaryDir);
  try {
    if (fs.existsSync(normalizedBoundary)) {
      normalizedBoundary = fs.realpathSync(normalizedBoundary);
    }
  } catch {
    // Keep resolved path if realpathSync fails
  }

  let normalizedTarget = path.resolve(targetPath);

  // Initial lexical check
  const lexicalRelative = path.relative(normalizedBoundary, normalizedTarget);
  if (lexicalRelative.startsWith('..') || path.isAbsolute(lexicalRelative)) {
    return false;
  }

  // If target exists on disk, resolve symlinks to prevent symlink traversal attacks
  try {
    if (fs.existsSync(normalizedTarget)) {
      normalizedTarget = fs.realpathSync(normalizedTarget);
    }
  } catch {
    // Keep resolved path if realpathSync fails
  }

  const relative = path.relative(normalizedBoundary, normalizedTarget);
  // If the relative path does not start with '..' and is not absolute, it is inside the boundary
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Creates a resource URL transformer function tailored for the VS Code Webview environment.
 * Converts local relative paths and file: URIs into Webview-safe URIs while strictly enforcing security boundaries.
 */
export function createResourceUrlTransformer(
  documentUri: vscode.Uri,
  webview: vscode.Webview,
  outputChannel?: vscode.OutputChannel
): (rawUrl: string) => string {
  const docDir = documentUri.scheme === 'file' ? path.dirname(documentUri.fsPath) : undefined;

  // Determine security boundary directory:
  // - If the document belongs to a workspace folder: workspace folder root
  // - Otherwise (standalone file): markdown document directory
  let boundaryDir: string | undefined;
  if (documentUri.scheme === 'file') {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
    boundaryDir = workspaceFolder ? workspaceFolder.uri.fsPath : docDir;
  }

  return (rawUrl: string): string => {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return rawUrl;
    }

    // 1. Immediately preserve remote HTTPS and data URIs
    if (trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      return rawUrl;
    }

    // 2. Reject hazardous, script, or internal webview schemes directly referenced in markdown
    if (
      trimmed.startsWith('javascript:') ||
      trimmed.startsWith('vbscript:') ||
      trimmed.startsWith('vscode-webview:') ||
      trimmed.startsWith('vscode-resource:')
    ) {
      return '';
    }

    // 3. Keep http: as-is without local resolution (will be blocked by CSP if insecure)
    if (trimmed.startsWith('http://')) {
      return rawUrl;
    }

    // 4. For untitled documents or non-file schemes, relative paths cannot be resolved safely
    if (!docDir || !boundaryDir || documentUri.scheme !== 'file') {
      return rawUrl;
    }

    // 5. Separate query / fragment from the file path
    const { cleanPath, suffix } = splitQueryAndFragment(trimmed);

    // Decode percent-encoded paths (e.g. %20 -> space)
    let decodedPath = cleanPath;
    try {
      decodedPath = decodeURIComponent(cleanPath);
    } catch {
      // Fallback to cleanPath if decoding fails
    }

    // 6. Resolve absolute filesystem path
    let resolvedFsPath: string;
    if (decodedPath.startsWith('file://')) {
      try {
        const parsedUri = vscode.Uri.parse(decodedPath);
        resolvedFsPath = path.resolve(parsedUri.fsPath);
      } catch {
        return rawUrl;
      }
    } else {
      // Relative path: resolve against the Markdown document directory
      resolvedFsPath = path.resolve(docDir, decodedPath);
    }

    // 7. Security check: verify if the target path is within the allowed boundary
    const isAllowed = isPathWithinBoundary(boundaryDir, resolvedFsPath);

    if (!isAllowed) {
      if (outputChannel) {
        outputChannel.appendLine(
          `[Preview Resource] Access denied: resource path is outside the allowed boundary.`
        );
        outputChannel.appendLine(`Document: ${path.basename(documentUri.fsPath)}`);
        outputChannel.appendLine(`Resource: ${trimmed}`);
        outputChannel.appendLine('----------------------------------------');
      }
      return rawUrl;
    }

    // 8. Transform into webview URI
    const targetUri = vscode.Uri.file(resolvedFsPath);
    const webviewUri = webview.asWebviewUri(targetUri);

    return `${webviewUri.toString()}${suffix}`;
  };
}
