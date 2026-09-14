/**
 * Safely extracts a clean, single-line error message from an unknown error.
 * Prevents multiline stack traces or internal paths from leaking into UI notification popups.
 */
export function getErrorMessage(error: unknown): string {
  let message = '';
  if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }

  // Extract the first non-empty line
  const firstLine = message.split(/[\r\n]+/)[0]?.trim() ?? '';
  return firstLine || 'An unknown error occurred.';
}
