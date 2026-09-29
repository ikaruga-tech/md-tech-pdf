import { getActionLabel, getDiagramErrorGuidance } from '../environment/error-guidance.js';
import { type Locale, t } from '../i18n/index.js';

/**
 * Subset of Core's DiagramErrorEvent needed to build a localized error card.
 */
export interface DiagramErrorInfo {
  type: string;
  code: string;
  message: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function firstLine(message: string): string {
  return (message.split(/\r?\n/)[0] ?? '').replace(/^Error:\s*/, '').trim();
}

/**
 * Builds a preview error card with localized guidance, one-click action buttons
 * (handled by the preview client via `data-md-action`), and the raw error in a collapsible section.
 */
export function buildLocalizedDiagramErrorHtml(event: DiagramErrorInfo, locale: Locale): string {
  const title = t(
    event.type === 'plantuml' ? 'errorCard.title.plantuml' : 'errorCard.title.mermaid',
    {},
    locale
  );
  const guidance = getDiagramErrorGuidance(event.code, locale);
  const summary = guidance?.message ?? firstLine(event.message);

  const lines = [
    '<div class="md-tech-diagram md-tech-diagram-error">',
    '  <div class="md-tech-diagram-error-card">',
    `    <div class="md-tech-diagram-error-title">${escapeHtml(title)}</div>`,
    `    <div class="md-tech-diagram-error-guidance">${escapeHtml(summary)}</div>`,
  ];

  if (guidance && guidance.actions.length > 0) {
    lines.push('    <div class="md-tech-diagram-error-actions">');
    for (const action of guidance.actions) {
      lines.push(
        `      <button type="button" class="md-tech-diagram-error-action" data-md-action="${action}">${escapeHtml(getActionLabel(action, locale))}</button>`
      );
    }
    lines.push('    </div>');
  }

  lines.push(
    '    <details class="md-tech-diagram-error-details">',
    `      <summary>${escapeHtml(t('errorCard.details', {}, locale))}</summary>`,
    `      <pre class="md-tech-diagram-error-message">${escapeHtml(event.message.trim())}</pre>`,
    '    </details>',
    '  </div>',
    '</div>'
  );

  return lines.join('\n');
}
