/**
 * Client-side script running inside the md-tech-pdf Webview.
 * Handles scroll position preservation across document re-renders,
 * toolbar interactions, and message communication with the VS Code extension host.
 */

interface WebviewState {
  scrollY: number;
  scrollRatio: number;
  zoomLevel?: number;
}

interface VsCodeApi {
  postMessage(message: unknown): void;
  setState(state: WebviewState): void;
  getState(): WebviewState | undefined;
}

declare function acquireVsCodeApi(): VsCodeApi;

(function initPreviewClient() {
  let vscode: VsCodeApi | undefined;
  try {
    vscode = acquireVsCodeApi();
  } catch {
    // Graceful fallback when executed outside VS Code Webview (e.g. standalone browser tests)
    return;
  }

  // 1. Restore scroll position immediately upon script execution
  const initialState = vscode.getState();
  if (initialState && typeof initialState.scrollY === 'number') {
    window.scrollTo({ top: initialState.scrollY, behavior: 'instant' });
  }

  // 2. Secondary restore after DOM ready and images/fonts load (CLS mitigation)
  const restoreScrollPosition = () => {
    const currentState = vscode?.getState();
    if (currentState && typeof currentState.scrollY === 'number') {
      window.scrollTo({ top: currentState.scrollY, behavior: 'instant' });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreScrollPosition);
  } else {
    restoreScrollPosition();
  }
  window.addEventListener('load', restoreScrollPosition);

  // 3. Track scroll changes with 100ms debounce
  let scrollDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  let isSyncing = false;
  let syncResetTimer: ReturnType<typeof setTimeout> | undefined;

  window.addEventListener('scroll', () => {
    // Suppress reporting scroll when programmatic scroll sync is in progress
    if (isSyncing) {
      return;
    }

    if (scrollDebounceTimer) {
      clearTimeout(scrollDebounceTimer);
    }

    scrollDebounceTimer = setTimeout(() => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 1;
      const clientHeight = window.innerHeight || document.documentElement.clientHeight || 1;
      const maxScroll = Math.max(1, scrollHeight - clientHeight);
      const scrollRatio = Math.min(1, Math.max(0, scrollY / maxScroll));

      const existingState = vscode?.getState() || { scrollY: 0, scrollRatio: 0 };
      const nextState: WebviewState = {
        ...existingState,
        scrollY,
        scrollRatio
      };

      vscode?.setState(nextState);
      vscode?.postMessage({
        type: 'didScroll',
        scrollY,
        scrollRatio
      });
    }, 100);
  });

  // 4. Handle incoming messages from extension host
  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || typeof message !== 'object') {
      return;
    }

    switch (message.type) {
      case 'restoreScroll': {
        if (typeof message.scrollY === 'number') {
          window.scrollTo({ top: message.scrollY, behavior: 'instant' });
        }
        break;
      }
      case 'scrollToLine': {
        if (typeof message.line === 'number') {
          scrollToAnchorLine(message.line);
        }
        break;
      }
    }
  });

  // Helper to scroll to heading/element anchor with toolbar offset compensation
  function scrollToAnchorLine(targetLine: number) {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-line]'));
    if (elements.length === 0) {
      return;
    }

    let targetElement: HTMLElement | undefined;
    let maxPreviousLine = -1;

    for (const el of elements) {
      const lineAttr = el.getAttribute('data-line');
      if (lineAttr) {
        const line = parseInt(lineAttr, 10);
        if (!isNaN(line)) {
          if (line <= targetLine && line > maxPreviousLine) {
            maxPreviousLine = line;
            targetElement = el;
          }
        }
      }
    }

    if (!targetElement && elements.length > 0) {
      targetElement = elements[0];
    }

    if (targetElement) {
      isSyncing = true;
      if (syncResetTimer) {
        clearTimeout(syncResetTimer);
      }
      syncResetTimer = setTimeout(() => {
        isSyncing = false;
      }, 300);

      const toolbar = document.querySelector<HTMLElement>('.preview-toolbar');
      const toolbarHeight = toolbar ? toolbar.offsetHeight : 44;
      const rect = targetElement.getBoundingClientRect();
      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const targetScrollY = Math.max(0, currentScrollY + rect.top - (toolbarHeight + 12));

      window.scrollTo({
        top: targetScrollY,
        behavior: 'smooth',
      });
    }
  }

  // 5. Toolbar action bindings
  function setupToolbarInteractions() {
    const reloadBtn = document.getElementById('btn-toolbar-reload');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        vscode?.postMessage({ type: 'reload' });
      });
    }

    const exportBtn = document.getElementById('btn-toolbar-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        vscode?.postMessage({ type: 'exportPdf' });
      });
    }

    const zoomSelect = document.getElementById('select-toolbar-zoom') as HTMLSelectElement | null;
    if (zoomSelect) {
      zoomSelect.addEventListener('change', () => {
        const zoomValue = zoomSelect.value;
        applyZoom(zoomValue);
      });
    }
  }

  function applyZoom(zoomValue: string) {
    const pagesContainer =
      document.querySelector<HTMLElement>('.preview-content-wrapper') ||
      document.querySelector<HTMLElement>('.md-tech-pdf-preview-canvas') ||
      document.querySelector<HTMLElement>('.preview-canvas') ||
      document.body;
    switch (zoomValue) {
      case '50%':
        pagesContainer.style.transform = 'scale(0.5)';
        pagesContainer.style.transformOrigin = 'top center';
        break;
      case '75%':
        pagesContainer.style.transform = 'scale(0.75)';
        pagesContainer.style.transformOrigin = 'top center';
        break;
      case '125%':
        pagesContainer.style.transform = 'scale(1.25)';
        pagesContainer.style.transformOrigin = 'top center';
        break;
      case '100%':
      default:
        pagesContainer.style.transform = 'none';
        pagesContainer.style.transformOrigin = 'top center';
        break;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupToolbarInteractions);
  } else {
    setupToolbarInteractions();
  }
})();
