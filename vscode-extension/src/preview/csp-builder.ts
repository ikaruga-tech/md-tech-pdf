/**
 * Builds the Content Security Policy meta tag for the md-tech-pdf Webview.
 * Disallows untrusted scripts via default-src 'none' and strictly permits
 * internal extension scripts using a cryptographic nonce when provided.
 * Grants minimal permissions for styles, images, and fonts (including Google Fonts).
 */
export function buildPreviewCsp(cspSource: string, nonce?: string): string {
  const directives = [
    "default-src 'none'",
    `img-src ${cspSource} data: https:`,
    `style-src ${cspSource} 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src ${cspSource} data: https://fonts.gstatic.com`,
  ];

  if (nonce) {
    directives.push(`script-src 'nonce-${nonce}'`);
  }

  return `<meta http-equiv="Content-Security-Policy" content="${directives.join('; ')};">`;
}
