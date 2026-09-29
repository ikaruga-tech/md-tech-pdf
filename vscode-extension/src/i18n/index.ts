import * as vscode from 'vscode';
import { type Locale, type MessageKey, MESSAGES } from './messages.js';

export type { Locale, MessageKey };

export type MessageParams = Record<string, string | number>;

/**
 * Maps a VS Code display language (e.g. "ja", "en-US") to a supported locale.
 */
export function resolveLocale(language: string | undefined): Locale {
  return language?.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

/**
 * Returns the locale matching the current VS Code display language.
 */
export function getLocale(): Locale {
  return resolveLocale(vscode.env?.language);
}

/**
 * Looks up a localized message and substitutes `{name}` placeholders.
 */
export function t(
  key: MessageKey,
  params: MessageParams = {},
  locale: Locale = getLocale()
): string {
  return MESSAGES[locale][key].replace(/\{(\w+)\}/g, (placeholder: string, name: string) =>
    name in params ? String(params[name]) : placeholder
  );
}
