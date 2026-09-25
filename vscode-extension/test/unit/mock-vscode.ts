let configStore: Record<string, unknown> = {};

export function setMockConfiguration(store: Record<string, unknown>): void {
  configStore = { ...store };
}

export function clearMockConfiguration(): void {
  configStore = {};
}

// Minimal mock of the 'vscode' module for Node.js unit testing outside extension host
const mockVscode = {
  Uri: {
    file: (fsPath: string) => ({
      fsPath,
      path: fsPath,
      scheme: 'file',
      toString: () => `file://${fsPath}`,
    }),
    parse: (value: string) => {
      if (value.startsWith('file://')) {
        const p = value.replace(/^file:\/\//, '');
        return {
          fsPath: p,
          path: p,
          scheme: 'file',
          toString: () => value,
        };
      }
      const schemeMatch = value.match(/^([a-zA-Z0-9_-]+):/);
      const scheme = schemeMatch ? schemeMatch[1] : '';
      return {
        fsPath: value,
        path: value,
        scheme,
        toString: () => value,
      };
    },
  },
  workspace: {
    getWorkspaceFolder: () => undefined,
    getConfiguration: (section?: string) => ({
      get: (key: string, defaultValue?: unknown) => {
        const fullKey = section ? `${section}.${key}` : key;
        if (configStore[fullKey] !== undefined) {
          return configStore[fullKey];
        }
        if (configStore[key] !== undefined) {
          return configStore[key];
        }
        return defaultValue;
      },
    }),
    onDidSaveTextDocument: () => ({ dispose: () => {} }),
    onDidChangeTextDocument: () => ({ dispose: () => {} }),
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
    visibleTextEditors: [] as any[],
  },
  TextEditorRevealType: {
    Default: 0,
    InCenter: 1,
    InCenterIfOutsideViewport: 2,
    AtTop: 3,
  },
  ViewColumn: {
    Beside: -2,
    One: 1,
    Two: 2,
  },
  Position: class {
    constructor(
      public line: number,
      public character: number
    ) {}
  },
  Range: class {
    public start: any;
    public end: any;
    constructor(a: any, b: any, c?: any, d?: any) {
      if (typeof a === 'number') {
        this.start = { line: a, character: b };
        this.end = { line: c ?? a, character: d ?? b };
      } else {
        this.start = a;
        this.end = b;
      }
    }
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
Module._resolveFilename = function (
  request: string,
  parent: unknown,
  isMain: boolean,
  options: unknown
) {
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
