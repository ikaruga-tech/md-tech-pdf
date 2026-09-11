import type { GoogleFontsOptions } from '../config/document-options.js';

export const ALLOWED_GOOGLE_FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

/**
 * Builds Google Fonts CSS2 API URL from GoogleFontsOptions.
 * Returns null if no families are specified.
 *
 * Example output:
 * https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Roboto+Mono:wght@400;700&display=swap
 */
export function buildGoogleFontsUrl(options?: GoogleFontsOptions): string | null {
  if (!options || !Array.isArray(options.families) || options.families.length === 0) {
    return null;
  }

  const familyParams: string[] = [];

  for (const item of options.families) {
    const trimmedName = item.name?.trim();
    if (!trimmedName) {
      continue;
    }

    // Google Fonts format replaces spaces with '+'
    // Encode special URI characters while representing spaces as '+'
    const encodedName = encodeURIComponent(trimmedName).replace(/%20/g, '+');

    if (item.weights && item.weights.length > 0) {
      // Deduplicate and sort weights ascending
      const uniqueWeights = Array.from(new Set(item.weights)).sort((a, b) => a - b);
      const weightsStr = uniqueWeights.join(';');
      familyParams.push(`family=${encodedName}:wght@${weightsStr}`);
    } else {
      familyParams.push(`family=${encodedName}`);
    }
  }

  if (familyParams.length === 0) {
    return null;
  }

  return `https://fonts.googleapis.com/css2?${familyParams.join('&')}&display=swap`;
}

/**
 * Sanitizes a font family name and formats it safely for CSS font-family declarations.
 * Prevents CSS injection by removing control characters, quotes, and structural CSS delimiters.
 *
 * Example:
 * buildFontFamilyCss("Noto Sans JP", "sans-serif")
 * -> '"Noto Sans JP", sans-serif'
 */
export function buildFontFamilyCss(family: string, fallback: 'sans-serif' | 'monospace'): string {
  // Disallow or sanitize characters that could break CSS syntax: ", ', ;, {, }, \, \r, \n
  const sanitized = family.replace(/["';{}\\\r\n]/g, '').trim();

  return `"${sanitized}", ${fallback}`;
}
