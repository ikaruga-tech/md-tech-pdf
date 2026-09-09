import { describe, it, expect } from 'vitest';
import { generatePdf } from '../src/index.js';

describe('md-tech-pdf Core', () => {
  it('should initialize successfully', async () => {
    const result = await generatePdf();
    expect(result.success).toBe(true);
    expect(result.message).toContain('Core generator initialized');
  });
});
