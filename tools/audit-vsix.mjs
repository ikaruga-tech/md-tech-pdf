import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const vsixPath = path.resolve('vscode-extension/md-tech-pdf-0.2.0.vsix');
const tmpDir = path.resolve('scratch/vsix-audit');

console.log('=== VSIX Audit Started ===');
console.log('VSIX File:', vsixPath);
const stats = fs.statSync(vsixPath);
console.log('Size:', (stats.size / (1024 * 1024)).toFixed(2), 'MB');

if (fs.existsSync(tmpDir)) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
fs.mkdirSync(tmpDir, { recursive: true });

console.log('Unpacking VSIX...');
execSync(`unzip -q "${vsixPath}" -d "${tmpDir}"`);

const allFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else {
      allFiles.push(path.relative(tmpDir, full));
    }
  }
}
walk(tmpDir);

console.log('Total unpacked files:', allFiles.length);

// 1. Check for unwanted file patterns
const unwantedPatterns = [
  /\.git\b/,
  /\.github\b/,
  /\.vscode\b/,
  /coverage\b/,
  /\.pdf$/i,
  /\.png$/i,
  /phase-7/i,
  /\.map$/,
  /test[s]?\/(?!.*node_modules)/,
  /fixture/i,
];

console.log('\n--- 1. Checking for Unwanted Files ---');
const foundUnwanted = [];
for (const f of allFiles) {
  // Ignore images inside node_modules that belong to dependencies (e.g. mermaid themes if any)
  for (const p of unwantedPatterns) {
    if (p.test(f)) {
      // Check if it is inside extension/dist or extension root (not inside third-party node_modules)
      if (!f.startsWith('extension/node_modules/')) {
        foundUnwanted.push({ file: f, pattern: p.toString() });
      }
    }
  }
}
if (foundUnwanted.length === 0) {
  console.log('PASS: No unwanted top-level development files found.');
} else {
  console.log('WARNING: Found potential unwanted files:', foundUnwanted);
}

// Check if any test fixtures, generated PDFs, or comparison PNGs in entire archive
const generatedPdfs = allFiles.filter(f => f.endsWith('.pdf'));
console.log('PDF files in VSIX:', generatedPdfs.length);

// 2. Check for Chromium / browser binaries
console.log('\n--- 2. Checking for Browser Binaries in VSIX ---');
const browserBinaries = allFiles.filter(f =>
  /chrome|chromium|playwright\/\.local-browsers/i.test(f) && (f.endsWith('.exe') || f.endsWith('.app') || !path.extname(f))
);
console.log('Browser binaries count:', browserBinaries.length);
if (browserBinaries.length === 0) {
  console.log('INFO: Chromium binaries are NOT bundled in VSIX.');
} else {
  console.log('FOUND browser binaries:', browserBinaries.slice(0, 5));
}

// 3. Scan for local absolute paths (/Users/...) and credentials in extension source
console.log('\n--- 3. Scanning for Local Absolute Paths & Credentials ---');
const sourceFilesToCheck = allFiles.filter(f =>
  f.startsWith('extension/dist/') ||
  f === 'extension/package.json' ||
  f === 'extension/readme.md' ||
  f === 'extension.vsixmanifest'
);

let suspiciousCount = 0;
for (const f of sourceFilesToCheck) {
  const content = fs.readFileSync(path.join(tmpDir, f), 'utf-8');
  if (content.includes('/Users/')) {
    console.log(`WARNING: /Users/ path found in: ${f}`);
    suspiciousCount++;
  }
  if (/api[_-]?key|password|token/i.test(content)) {
    // Check context
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (/(?:api[_-]?key|password|token)\s*[:=]\s*['"][a-zA-Z0-9_\-]{8,}['"]/i.test(line)) {
        console.log(`WARNING: Potential secret on ${f}:${idx + 1}: ${line.trim()}`);
        suspiciousCount++;
      }
    });
  }
}
if (suspiciousCount === 0) {
  console.log('PASS: No /Users/ paths or credentials found in extension sources.');
}

// 4. Check core runtime presence
console.log('\n--- 4. Checking Core Runtime in VSIX ---');
const coreEntry = path.join(tmpDir, 'extension/node_modules/md-tech-pdf/dist/index.js');
console.log('md-tech-pdf dist/index.js exists:', fs.existsSync(coreEntry));

// 5. Breakdown of size
console.log('\n--- 5. Top Directory Sizes in VSIX ---');
const dirSizes = {};
for (const f of allFiles) {
  const parts = f.split(path.sep);
  const top = parts.slice(0, 3).join(path.sep);
  const size = fs.statSync(path.join(tmpDir, f)).size;
  dirSizes[top] = (dirSizes[top] || 0) + size;
}
const sorted = Object.entries(dirSizes).sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [d, s] of sorted) {
  console.log(`${(s / (1024 * 1024)).toFixed(2)} MB : ${d}`);
}

console.log('\n=== VSIX Audit Complete ===');
