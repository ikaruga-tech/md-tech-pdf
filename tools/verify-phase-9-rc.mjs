import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

console.log('=== Phase 9 RC Comprehensive Verification Suite Started ===');

const installedExtDir = path.join(
  os.homedir(),
  '.vscode/extensions/ikaruga-tech.md-tech-pdf-0.2.0'
);
const installedCorePath = path.join(installedExtDir, 'node_modules/md-tech-pdf/dist/index.js');
console.log('Loading Core from installed VSIX:', installedCorePath);

const core = await import(installedCorePath);

const plantumlJarCandidates = [
  path.join(os.homedir(), '.vscode/extensions/jebbs.plantuml-2.18.1/plantuml.jar'),
  path.join(os.homedir(), '.cursor/extensions/jebbs.plantuml-2.18.1/plantuml.jar'),
  '/usr/local/Cellar/plantuml/1.2026.6/libexec/plantuml.jar',
];
const plantumlJar = plantumlJarCandidates.find((p) => fs.existsSync(p)) || '';
console.log('Detected PlantUML JAR:', plantumlJar);

const scratchDir = path.resolve('scratch/phase-9-rc-tests');
fs.mkdirSync(scratchDir, { recursive: true });

const results = {};

function record(name, pass, note = '') {
  results[name] = { pass, note };
  const tag = pass ? '[PASS]' : '[FAIL]';
  console.log(`  ${tag} ${name} ${note ? `(${note})` : ''}`);
}

// -------------------------------------------------------------
// 1. Filename & Path Utilities (Section 24, 43)
// -------------------------------------------------------------
console.log('\n--- 1. Testing Path Utilities & Filenames (Sec 24, 43) ---');
try {
  // Test ensurePdfExtension from extension utils
  const { ensurePdfExtension, createPdfOutputPath, isMarkdownPath } = await import(
    path.join(installedExtDir, 'dist/utils/path-utils.js')
  );

  const t1 = ensurePdfExtension('output') === 'output.pdf';
  const t2 = ensurePdfExtension('output.pdf') === 'output.pdf';
  const t3 = ensurePdfExtension('OUTPUT.PDF') === 'OUTPUT.PDF';
  const t4 = ensurePdfExtension('sample.test') === 'sample.test.pdf';
  record('ensurePdfExtension avoids double .pdf (.pdf.pdf)', t1 && t2 && t3 && t4);

  const t5 = isMarkdownPath('日本語.md');
  const t6 = isMarkdownPath('document test.markdown');
  const t7 = !isMarkdownPath('data.json');
  const t8 = !isMarkdownPath('sample.txt');
  record('Special Filename and Markdown extension checking', t5 && t6 && t7 && t8);
} catch (err) {
  record('Path Utilities', false, err.message);
}

// -------------------------------------------------------------
// 2. Simple Markdown, Japanese, Mixed Text (Sec 25, 26, 27)
// -------------------------------------------------------------
console.log('\n--- 2. Testing Simple, Japanese, and Mixed Text (Sec 25, 26, 27) ---');
try {
  const simpleMd = `# Simple Title

This is a simple paragraph to test basic conversion.
`;
  const simplePdf = path.join(scratchDir, 'simple.pdf');
  const simpleMdFile = path.join(scratchDir, 'simple.md');
  fs.writeFileSync(simpleMdFile, simpleMd);
  await core.convertMarkdownToPdf(simpleMdFile, { output: simplePdf });
  record('Simple Markdown export', fs.existsSync(simplePdf) && fs.statSync(simplePdf).size > 1000);

  const jpMd = `# 2. 日本語ドキュメント検証

漢字・ひらがな・カタカナ・句読点「」【】（）の描画テストです。

- 項目１：高可用性構成
- 項目２：耐障害性設計
- 項目３：運用監視設計
`;
  const jpPdf = path.join(scratchDir, 'japanese.pdf');
  const jpMdFile = path.join(scratchDir, '日本語テスト.md');
  fs.writeFileSync(jpMdFile, jpMd);
  await core.convertMarkdownToPdf(jpMdFile, { output: jpPdf });
  record('Japanese characters export', fs.existsSync(jpPdf) && fs.statSync(jpPdf).size > 1000);

  const mixedMd = `# 3. Mixed Text Verification

マイクロサービスアーキテクチャにおいて、**AWS Lambda** と **API Gateway**、**PostgreSQL** を活用し、**OAuth 2.0** 認証を行います。
レイテンシ要件: P99 < 300ms (スループット 10,000 req/sec)。
`;
  const mixedPdf = path.join(scratchDir, 'mixed.pdf');
  const mixedMdFile = path.join(scratchDir, 'mixed test document.md');
  fs.writeFileSync(mixedMdFile, mixedMd);
  await core.convertMarkdownToPdf(mixedMdFile, { output: mixedPdf });
  record(
    'Mixed text & alphanumeric export',
    fs.existsSync(mixedPdf) && fs.statSync(mixedPdf).size > 1000
  );
} catch (err) {
  record('Text Rendering', false, err.message);
}

// -------------------------------------------------------------
// 3. Mermaid & PlantUML Diagrams (Sec 28, 29, 30, 40, 41)
// -------------------------------------------------------------
console.log('\n--- 3. Testing Diagrams (Sec 28, 29, 30, 40, 41) ---');
try {
  // Valid Mermaid
  const mermaidMd = `# Mermaid Test

\`\`\`mermaid {width="80%" align="center"}
sequenceDiagram
    autonumber
    Client->>Gateway: POST /api/v1/auth
    Gateway->>AuthService: ValidateToken
    AuthService-->>Gateway: 200 OK (JWT)
    Gateway-->>Client: 200 OK
\`\`\`
`;
  const mermaidPdf = path.join(scratchDir, 'mermaid.pdf');
  const mermaidMdFile = path.join(scratchDir, 'mermaid.md');
  fs.writeFileSync(mermaidMdFile, mermaidMd);
  await core.convertMarkdownToPdf(mermaidMdFile, { output: mermaidPdf });
  record(
    'Mermaid diagram rendering',
    fs.existsSync(mermaidPdf) && fs.statSync(mermaidPdf).size > 5000
  );

  // Invalid Mermaid (should reject gracefully without extension crash)
  const invalidMermaidMd = `# Invalid Mermaid

\`\`\`mermaid
this is completely invalid mermaid syntax 12345
\`\`\`
`;
  const invalidMermaidMdFile = path.join(scratchDir, 'invalid-mermaid.md');
  fs.writeFileSync(invalidMermaidMdFile, invalidMermaidMd);
  let mermaidErrorCaught = false;
  try {
    await core.convertMarkdownToPdf(invalidMermaidMdFile, {
      output: path.join(scratchDir, 'should-fail.pdf'),
    });
  } catch (err) {
    mermaidErrorCaught = true;
    record('Invalid Mermaid error handled gracefully', true, err.message.slice(0, 60));
  }
  if (!mermaidErrorCaught) {
    record('Invalid Mermaid error handled gracefully', false, 'Expected error was not thrown');
  }

  // PlantUML with configured JAR
  if (plantumlJar) {
    const plantumlMd = `# PlantUML Test

\`\`\`plantuml
@startuml
skinparam backgroundColor transparent
actor User
participant WebApp
database DB
User -> WebApp: Submit Query
WebApp -> DB: SELECT *
DB --> WebApp: Records
WebApp --> User: Render
@enduml
\`\`\`
`;
    const plantumlPdf = path.join(scratchDir, 'plantuml.pdf');
    const plantumlMdFile = path.join(scratchDir, 'plantuml.md');
    fs.writeFileSync(plantumlMdFile, plantumlMd);
    await core.convertMarkdownToPdf(plantumlMdFile, {
      output: plantumlPdf,
      config: { plantuml: { javaPath: 'java', jarPath: plantumlJar } },
    });
    record(
      'PlantUML diagram rendering',
      fs.existsSync(plantumlPdf) && fs.statSync(plantumlPdf).size > 5000
    );
  } else {
    console.log('  [SKIP] PlantUML JAR not detected on system, skipping valid render');
  }

  // PlantUML unconfigured (must produce clear message)
  const unconfiguredPlantumlMd = `# PlantUML Unconfigured

\`\`\`plantuml
@startuml
A -> B
@enduml
\`\`\`
`;
  const unconfMdFile = path.join(scratchDir, 'unconfigured-plantuml.md');
  fs.writeFileSync(unconfMdFile, unconfiguredPlantumlMd);
  let plantumlErrorCaught = false;
  try {
    await core.convertMarkdownToPdf(unconfMdFile, {
      output: path.join(scratchDir, 'unconf-fail.pdf'),
      config: { plantuml: { javaPath: 'java', jarPath: '' } },
    });
  } catch (err) {
    plantumlErrorCaught = true;
    const isClear = err.message.includes('PlantUML jar path is not configured');
    record('Unconfigured PlantUML produces clear error', isClear, err.message.slice(0, 60));
  }
  if (!plantumlErrorCaught) {
    record('Unconfigured PlantUML produces clear error', false, 'Expected error was not thrown');
  }
} catch (err) {
  record('Diagram Testing', false, err.message);
}

// -------------------------------------------------------------
// 4. Front Matter, Tables, Code, Heading Orphans (Sec 31, 32, 35, 36, 38)
// -------------------------------------------------------------
console.log(
  '\n--- 4. Testing Front Matter, Tables, Code, and Orphans (Sec 31, 32, 35, 36, 38) ---'
);
try {
  // Front Matter with custom layout and google fonts
  const fmDoc = `---
title: "Technical Architecture Spec"
pdf:
  format: "A4"
  landscape: false
  margin:
    top: "10mm"
    bottom: "10mm"
    left: "15mm"
    right: "15mm"
fonts:
  - name: "LINE Seed JP"
    type: "google"
    weights: [400, 700]
---

# Technical Architecture

This document tests Front Matter options and table layouts.

| Parameter | Type | Required | Description | Example URL |
| :--- | :--- | :--- | :--- | :--- |
| endpoint_uri | string | Yes | Fully qualified service target endpoint address | https://api.service.internal.corp/v1/telemetry/metrics |
| max_retries | integer | No | Maximum number of exponential backoff retry attempts | 5 |
| timeout_ms | integer | No | Connection timeout in milliseconds for upstream requests | 30000 |

\`\`\`typescript
// Long code line wrapping verification (pre-wrap and overflow-wrap: anywhere)
export const config = { endpoint: "https://api.service.internal.corp/v1/telemetry/metrics?region=ap-northeast-1&env=production&trace_id=1234567890abcdef1234567890abcdef", retries: 5, timeoutMs: 30000 };
\`\`\`
`;
  const fmPdf = path.join(scratchDir, 'frontmatter-table-code.pdf');
  const fmFile = path.join(scratchDir, 'fm-test.md');
  fs.writeFileSync(fmFile, fmDoc);
  await core.convertMarkdownToPdf(fmFile, { output: fmPdf });
  record(
    'Front Matter + Table + Long Code export',
    fs.existsSync(fmPdf) && fs.statSync(fmPdf).size > 5000
  );

  // Document without Front Matter
  const noFmDoc = `# No Front Matter Document

Default options should be seamlessly applied here without errors.
`;
  const noFmPdf = path.join(scratchDir, 'no-frontmatter.pdf');
  const noFmFile = path.join(scratchDir, 'no-fm.md');
  fs.writeFileSync(noFmFile, noFmDoc);
  await core.convertMarkdownToPdf(noFmFile, { output: noFmPdf });
  record(
    'Document without Front Matter export',
    fs.existsSync(noFmPdf) && fs.statSync(noFmPdf).size > 1000
  );
} catch (err) {
  record('Front Matter / Tables / Code', false, err.message);
}

// -------------------------------------------------------------
// 5. Empty Document & Permission Error handling (Sec 39, 42)
// -------------------------------------------------------------
console.log('\n--- 5. Testing Empty Document & Permission Error (Sec 39, 42) ---');
try {
  // Empty markdown: Should generate clean empty/minimal PDF without crashing
  const emptyFile = path.join(scratchDir, 'empty.md');
  const emptyPdf = path.join(scratchDir, 'empty.pdf');
  fs.writeFileSync(emptyFile, '');
  await core.convertMarkdownToPdf(emptyFile, { output: emptyPdf });
  const emptyPdfValid = fs.existsSync(emptyPdf) && fs.statSync(emptyPdf).size > 0;
  record(
    'Empty Markdown handled safely without crash',
    emptyPdfValid,
    `PDF size: ${fs.statSync(emptyPdf).size} bytes`
  );

  // Permission error
  let permHandled = false;
  try {
    await core.convertMarkdownToPdf(path.join(scratchDir, 'simple.md'), {
      output: '/System/Library/test.pdf',
    });
  } catch (err) {
    permHandled = true;
    record('Permission error handled gracefully', true, err.message.slice(0, 60));
  }
  if (!permHandled) {
    record(
      'Permission error handled gracefully',
      false,
      'Expected permission error was not caught'
    );
  }
} catch (err) {
  record('Edge Case Handling', false, err.message);
}

// -------------------------------------------------------------
// 6. Long Document & Baseline Comparison (Sec 37, 45)
// -------------------------------------------------------------
console.log('\n--- 6. Testing Long Document & Consistency (Sec 37, 45) ---');
try {
  const sourceDoc = path.resolve('examples/real-world/system-design.md');
  const existingBaselinePdf = path.resolve('examples/real-world/system-design.pdf');
  const vsixSystemPdf = path.join(scratchDir, 'system-design.pdf');

  console.log('Rendering examples/real-world/system-design.md with VSIX runtime...');
  await core.convertMarkdownToPdf(sourceDoc, {
    output: vsixSystemPdf,
    config: plantumlJar ? { plantuml: { javaPath: 'java', jarPath: plantumlJar } } : undefined,
  });

  const baselineSize = fs.statSync(existingBaselinePdf).size;
  const vsixSize = fs.statSync(vsixSystemPdf).size;
  const diffPercent = (Math.abs(vsixSize - baselineSize) / baselineSize) * 100;
  console.log(
    `Baseline size: ${(baselineSize / 1024).toFixed(1)} KB, VSIX size: ${(vsixSize / 1024).toFixed(1)} KB, Diff: ${diffPercent.toFixed(2)}%`
  );
  record(
    'Long Document (system-design.md) consistency (<5% diff)',
    diffPercent < 5.0,
    `diff: ${diffPercent.toFixed(2)}%`
  );
} catch (err) {
  record('Long Document Consistency', false, err.message);
}

// -------------------------------------------------------------
// 7. CLI Regression (Sec 44)
// -------------------------------------------------------------
console.log('\n--- 7. Testing CLI Regression (Sec 44) ---');
try {
  const cliPdf = path.join(scratchDir, 'cli-test.pdf');
  execSync(`node dist/cli/index.js scratch/phase-9-rc-tests/simple.md -o "${cliPdf}"`, {
    stdio: 'pipe',
  });
  record(
    'CLI execution from command line',
    fs.existsSync(cliPdf) && fs.statSync(cliPdf).size > 1000
  );
} catch (err) {
  record('CLI execution from command line', false, err.message);
}

console.log('\n=== Summary of Phase 9 RC Verification Suite ===');
let allPass = true;
for (const [k, v] of Object.entries(results)) {
  if (!v.pass) allPass = false;
}
console.log('Overall Status:', allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
if (!allPass) process.exit(1);
