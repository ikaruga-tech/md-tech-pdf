/**
 * Builds the Content Security Policy meta tag for the md-tech-pdf Webview.
 * Disallows script execution entirely (enableScripts: false) and grants
 * minimal permissions for styles, images, and fonts (including Google Fonts).
 */
export function buildPreviewCsp(cspSource: string): string {
  const directives = [
    "default-src 'none'",
    `img-src ${cspSource} data: https:`,
    `style-src ${cspSource} 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src ${cspSource} data: https://fonts.gstatic.com`,
  ];

  return `<meta http-equiv="Content-Security-Policy" content="${directives.join('; ')};">`;
}
