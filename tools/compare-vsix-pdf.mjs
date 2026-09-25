import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

console.log('=== VSIX PDF Comparison Started ===');

const installedExtDir = path.join(
  os.homedir(),
  '.vscode/extensions/ikaruga-tech.md-tech-pdf-0.2.0'
);
const installedCorePath = path.join(installedExtDir, 'node_modules/md-tech-pdf/dist/index.js');
const core = await import(installedCorePath);

const sourceDoc = path.resolve('examples/real-world/system-design.md');
const existingPdf = path.resolve('examples/real-world/system-design.pdf');
const vsixGeneratedPdf = path.resolve('scratch/vsix-system-design.pdf');

console.log('Rendering system-design.md using installed VSIX core...');
await core.convertMarkdownToPdf(sourceDoc, {
  output: vsixGeneratedPdf,
  onProgress: (event) => {
    console.log(`  [VSIX Progress] ${event.message}`);
  },
  config: {
    plantuml: {
      javaPath: 'java',
      jarPath: path.join(os.homedir(), '.vscode/extensions/jebbs.plantuml-2.18.1/plantuml.jar'),
    },
  },
});

console.log('\n--- Comparing Output Properties ---');
const existingStats = fs.statSync(existingPdf);
const vsixStats = fs.statSync(vsixGeneratedPdf);

console.log('Existing baseline PDF size:', (existingStats.size / 1024).toFixed(1), 'KB');
console.log('VSIX-generated PDF size:', (vsixStats.size / 1024).toFixed(1), 'KB');

const sizeDiffPercent = (Math.abs(vsixStats.size - existingStats.size) / existingStats.size) * 100;
console.log('Size difference:', sizeDiffPercent.toFixed(2), '%');

if (sizeDiffPercent < 5.0) {
  console.log('PASS: File size is consistent with baseline (diff < 5%).');
} else {
  console.log('NOTE: Size diff exceeds 5%, inspecting further.');
}

console.log('\n=== VSIX PDF Comparison Complete ===');
