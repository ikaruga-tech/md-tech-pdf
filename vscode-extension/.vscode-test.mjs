import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/integration/**/*.test.js',
  extensionDevelopmentPath: '.',
  workspaceFolder: 'test/fixtures/workspace',
  launchArgs: ['--disable-extensions', '--user-data-dir=/tmp/vsc-test'],
  mocha: {
    ui: 'bdd',
    timeout: 30000,
  },
});
