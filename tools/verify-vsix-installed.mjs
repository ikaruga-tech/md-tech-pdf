import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

console.log('=== VSIX Installed Runtime Verification Started ===');

const installedExtDir = path.join(os.homedir(), '.vscode/extensions/ikaruga-tech.md-tech-pdf-0.2.0');
console.log('Installed extension dir:', installedExtDir);

if (!fs.existsSync(installedExtDir)) {
  console.error('ERROR: Installed extension not found at', installedExtDir);
  process.exit(1);
}

// Check installed package.json
const pkgJson = JSON.parse(fs.readFileSync(path.join(installedExtDir, 'package.json'), 'utf-8'));
console.log('Extension Name:', pkgJson.name);
console.log('Extension DisplayName:', pkgJson.displayName);
console.log('Extension Version:', pkgJson.version);
console.log('Extension Publisher:', pkgJson.publisher);
console.log('Extension Commands:');
for (const cmd of pkgJson.contributes.commands) {
  console.log(`  - ${cmd.command} (${cmd.title})`);
}
console.log('Configuration keys:');
for (const key of Object.keys(pkgJson.contributes.configuration.properties)) {
  console.log(`  - ${key}`);
}

// 1. Test importing core module strictly from the installed extension directory
console.log('\n--- 1. Importing md-tech-pdf from installed extension ---');
const installedCorePath = path.join(installedExtDir, 'node_modules/md-tech-pdf/dist/index.js');
console.log('Core path:', installedCorePath);
const core = await import(installedCorePath);
console.log('Exported functions:', Object.keys(core));

if (typeof core.convertMarkdownToPdf !== 'function') {
  console.error('ERROR: convertMarkdownToPdf is not exported');
  process.exit(1);
}
console.log('PASS: convertMarkdownToPdf successfully imported from installed VSIX.');

// 2. Perform end-to-end PDF generation in an isolated directory
console.log('\n--- 2. End-to-end PDF Generation using installed extension runtime ---');
const isolatedDir = path.resolve('scratch/vsix-clean-test');
fs.mkdirSync(isolatedDir, { recursive: true });

// A: Simple Markdown + Front Matter + Google Fonts (Pattern D verification)
const testDocPath = path.join(isolatedDir, 'clean-test-doc.md');
const testPdfPath = path.join(isolatedDir, 'clean-test-doc.pdf');

const markdownContent = `---
title: "VSIX Installed Test Document"
pdf:
  format: "A4"
  landscape: false
  margin:
    top: "20mm"
    bottom: "20mm"
    left: "20mm"
    right: "20mm"
fonts:
  - name: "LINE Seed JP"
    type: "google"
    weights: [400, 700]
---

# 1. Heading Level 1 (Pattern D 700)

Here is a paragraph with **strong emphasis text** and regular text.

## 1.1 Heading Level 2 (Pattern D 700)

### 1.1.1 Heading Level 3 (Pattern D 700)

#### 1.1.1.1 Heading Level 4 (Pattern D 400)

Here is a table testing Phase 7.5-D table header styling:

| Column A | Column B | Column C |
| :--- | :--- | :--- |
| Cell 1 | Cell 2 | Cell 3 |
| Value X | Value Y | Value Z |

\`\`\`typescript
// Code block test
export function test(): string {
  return "Hello from installed VSIX";
}
\`\`\`

## 1.2 Mermaid Diagram Test

\`\`\`mermaid
flowchart TD
  A[Start from VSIX] --> B{Process Document}
  B -->|Valid| C[Generate PDF]
  B -->|Invalid| D[Show Error]
\`\`\`
`;

fs.writeFileSync(testDocPath, markdownContent, 'utf-8');

console.log('Generating PDF from isolated document...');
await core.convertMarkdownToPdf(testDocPath, {
  output: testPdfPath,
  onProgress: (event) => {
    console.log(`  [Progress] ${event.message}`);
  },
});

if (fs.existsSync(testPdfPath)) {
  const pdfStats = fs.statSync(testPdfPath);
  console.log(`PASS: PDF successfully generated! File size: ${(pdfStats.size / 1024).toFixed(1)} KB`);
} else {
  console.error('ERROR: Output PDF was not generated.');
  process.exit(1);
}

// 3. Verify HTML Typography rendered by installed VSIX core
console.log('\n--- 3. Verifying Typography styles in installed VSIX HTML ---');
const style = core.DEFAULT_DOCUMENT_STYLE;
const fontsUrl = core.buildGoogleFontsUrl({
  families: [{ name: 'LINE Seed JP', weights: [400, 700] }],
});

// Check Pattern D typography in default styles
const checks = [
  { name: 'body weight 400', check: /body\s*{[^}]*font-weight:\s*400/.test(style) },
  { name: 'h1 weight 700', check: /h1\s*{[^}]*font-weight:\s*700/.test(style) },
  { name: 'h2 weight 700', check: /h2\s*{[^}]*font-weight:\s*700/.test(style) },
  { name: 'h3 weight 700', check: /h3\s*{[^}]*font-weight:\s*700/.test(style) },
  { name: 'h4 weight 400', check: /h4\s*{[^}]*font-weight:\s*400/.test(style) },
  { name: 'h5 weight 400', check: /h5\s*{[^}]*font-weight:\s*400/.test(style) },
  { name: 'h6 weight 400', check: /h6\s*{[^}]*font-weight:\s*400/.test(style) },
  { name: 'strong, b weight 700', check: /strong,\s*b\s*{[^}]*font-weight:\s*700/.test(style) },
  { name: 'th weight 400', check: /table\s+th\s*{[^}]*font-weight:\s*400/.test(style) },
  { name: 'th background #f0f3f6', check: /table\s+th\s*{[^}]*background-color:\s*#f0f3f6/.test(style) },
  { name: 'th border-bottom 2px solid #cbd5e1', check: /table\s+th\s*{[^}]*border-bottom:\s*2px solid #cbd5e1/.test(style) },
  { name: 'code weight 400', check: /code\s*{[^}]*font-weight:\s*400/.test(style) },
  { name: 'pre weight 400', check: /pre\s*{[^}]*font-weight:\s*400/.test(style) },
  { name: 'LINE Seed JP font link', check: fontsUrl.includes('family=LINE+Seed+JP:wght@400;700') },
];

let allPassed = true;
for (const c of checks) {
  if (c.check) {
    console.log(`  [PASS] ${c.name}`);
  } else {
    console.error(`  [FAIL] ${c.name}`);
    allPassed = false;
  }
}

if (!allPassed) {
  console.error('ERROR: Typography verification failed in installed VSIX.');
  process.exit(1);
}

console.log('\n=== All Installed VSIX Verifications PASSED ===');
