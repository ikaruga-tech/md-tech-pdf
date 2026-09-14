import * as path from 'node:path';

// Minimal mock of the 'vscode' module for Node.js unit testing outside extension host
const mockVscode = {
  Uri: {
    file: (fsPath: string) => ({
      fsPath,
      path: fsPath,
      scheme: 'file',
      toString: () => `file://${fsPath}`,
    }),
  },
  workspace: {
    getWorkspaceFolder: () => undefined,
  },
  window: {
    createWebviewPanel: () => ({}),
    showErrorMessage: async () => undefined,
    showWarningMessage: async () => undefined,
    createOutputChannel: (_name: string) => ({
      appendLine: (_line: string) => {},
      append: (_value: string) => {},
      clear: () => {},
      show: () => {},
      hide: () => {},
      dispose: () => {},
    }),
  },
  ViewColumn: {
    Beside: -2,
    One: 1,
    Two: 2,
  },
  EventEmitter: class {
    public event = () => ({ dispose: () => {} });
    public fire = () => {};
    public dispose = () => {};
  },
};

// Intercept require('vscode')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require('node:module');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request: string, parent: unknown, isMain: boolean, options: unknown) {
  if (request === 'vscode') {
    return 'vscode';
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

require.cache['vscode'] = {
  id: 'vscode',
  filename: 'vscode',
  loaded: true,
  exports: mockVscode,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;
