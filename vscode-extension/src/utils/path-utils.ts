import * as path from 'node:path';

/**
 * Derives destination PDF file path from input Markdown file path in the same directory.
 * Works with .md, .markdown, or other extensions.
 */
export function createPdfOutputPath(inputPath: string): string {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.pdf`);
}

/**
 * Ensures the target file path has a .pdf extension (case-insensitive).
 * Prevents duplicate extensions like .pdf.pdf.
 */
export function ensurePdfExtension(filePath: string): string {
  if (filePath.toLowerCase().endsWith('.pdf')) {
    return filePath;
  }
  return `${filePath}.pdf`;
}

/**
 * Checks if a given file path has a Markdown file extension (.md, .markdown), case-insensitively.
 */
export function isMarkdownPath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.md' || ext === '.markdown';
}
