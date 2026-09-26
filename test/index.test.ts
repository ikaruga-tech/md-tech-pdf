import { describe, it, expect } from 'vitest';
import { generatePdf, convertMarkdownToPdf, resolveOutputPath } from '../src/index.js';

describe('md-tech-pdf Core', () => {
  it('should initialize successfully with default options', async () => {
    const result = await generatePdf();
    expect(result.success).toBe(true);
    expect(result.message).toContain('Core generator initialized');
  });

  it('should export primary conversion APIs', () => {
    expect(typeof convertMarkdownToPdf).toBe('function');
    expect(typeof resolveOutputPath).toBe('function');
    expect(typeof generatePdf).toBe('function');
  });
});
