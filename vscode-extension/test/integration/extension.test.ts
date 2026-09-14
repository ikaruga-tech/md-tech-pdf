import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { isMarkdownDocument } from '../../src/commands/export-pdf.js';
import { getExtensionSettings } from '../../src/config/extension-settings.js';

describe('Extension Integration Tests', () => {
  it('should find and activate md-tech-pdf extension', async () => {
    const extension = vscode.extensions.getExtension('ikaruga-tech.md-tech-pdf');
    assert.ok(extension, 'Extension ikaruga-tech.md-tech-pdf should be installed in the host');

    if (!extension.isActive) {
      await extension.activate();
    }
    assert.strictEqual(extension.isActive, true, 'Extension should be active');
  });

  it('should register exportPdf command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('md-tech-pdf.exportPdf'),
      'Command md-tech-pdf.exportPdf must be registered in VS Code'
    );
  });

  it('should register exportPdfAs command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('md-tech-pdf.exportPdfAs'),
      'Command md-tech-pdf.exportPdfAs must be registered in VS Code'
    );
  });

  it('should register openPreview command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('md-tech-pdf.openPreview'),
      'Command md-tech-pdf.openPreview must be registered in VS Code'
    );
  });

  it('should register configuration settings with expected default values', () => {
    const config = vscode.workspace.getConfiguration('md-tech-pdf');

    const javaPathInspect = config.inspect<string>('plantuml.javaPath');
    assert.strictEqual(
      javaPathInspect?.defaultValue,
      'java',
      'plantuml.javaPath default should be "java"'
    );

    const jarPathInspect = config.inspect<string>('plantuml.jarPath');
    assert.strictEqual(
      jarPathInspect?.defaultValue,
      '',
      'plantuml.jarPath default should be empty string'
    );

    const outputDirInspect = config.inspect<string>('export.outputDirectory');
    assert.strictEqual(
      outputDirInspect?.defaultValue,
      '',
      'export.outputDirectory default should be empty string'
    );

    const afterExportInspect = config.inspect<string>('export.afterExport');
    assert.strictEqual(
      afterExportInspect?.defaultValue,
      'none',
      'export.afterExport default should be "none"'
    );

    const refreshInspect = config.inspect<string>('preview.refresh');
    assert.strictEqual(
      refreshInspect?.defaultValue,
      'onSave',
      'preview.refresh default should be "onSave"'
    );
  });

  it('should load workspace settings from .vscode/settings.json', () => {
    const config = vscode.workspace.getConfiguration('md-tech-pdf');
    assert.strictEqual(
      config.get<string>('export.outputDirectory'),
      'generated/pdf',
      'export.outputDirectory should be overridden by workspace settings'
    );
    assert.strictEqual(
      config.get<string>('export.afterExport'),
      'none',
      'export.afterExport should be none'
    );

    const resolvedSettings = getExtensionSettings();
    assert.strictEqual(
      resolvedSettings.export.outputDirectory,
      'generated/pdf',
      'getExtensionSettings should reflect workspace outputDirectory'
    );
    assert.strictEqual(
      resolvedSettings.export.afterExport,
      'none',
      'getExtensionSettings should reflect workspace afterExport'
    );
  });

  it('should detect Markdown document correctly for opened workspace file', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    assert.ok(workspaceFolders && workspaceFolders.length > 0, 'Workspace folder should be opened');

    const sampleUri = vscode.Uri.joinPath(workspaceFolders[0].uri, 'sample.md');
    const document = await vscode.workspace.openTextDocument(sampleUri);

    assert.ok(document, 'Should open fixture sample.md');
    assert.strictEqual(isMarkdownDocument(document), true, 'sample.md must be recognized as Markdown document');
  });
});
