/**
 * Client-side script running inside the md-tech-pdf Webview.
 * Handles scroll position preservation across document re-renders,
 * bi-directional scroll synchronization with VS Code editor,
 * toolbar interactions, and message communication with the extension host.
 */

interface WebviewState {
  scrollY: number;
  scrollRatio: number;
  syncEnabled?: boolean;
  syncAnim?: 'smooth' | 'instant';
  syncDelay?: number;
  zoomLevel?: string;
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

  let isSyncing = false;
  let syncResetTimer: ReturnType<typeof setTimeout> | undefined;

  // Retrieve initial defaults from toolbar attributes or fall back to system defaults
  const toolbarEl = document.querySelector<HTMLElement>('.preview-toolbar');
  const defaultSyncEnabled = toolbarEl?.getAttribute('data-default-sync-enabled') !== 'false';
  const defaultSyncAnim =
    (toolbarEl?.getAttribute('data-default-sync-anim') as 'smooth' | 'instant') || 'smooth';
  const defaultSyncDelay = parseInt(toolbarEl?.getAttribute('data-default-sync-delay') || '50', 10);
  const defaultZoom = toolbarEl?.getAttribute('data-default-zoom') || 'fit';

  // Restore previous state if available, otherwise apply settings defaults
  const initialState = vscode.getState();
  let scrollSyncEnabled =
    typeof initialState?.syncEnabled === 'boolean' ? initialState.syncEnabled : defaultSyncEnabled;
  let scrollSyncAnim: 'smooth' | 'instant' =
    initialState?.syncAnim === 'instant' || initialState?.syncAnim === 'smooth'
      ? initialState.syncAnim
      : defaultSyncAnim;
  let scrollSyncDelay: number =
    typeof initialState?.syncDelay === 'number' && Number.isFinite(initialState.syncDelay)
      ? initialState.syncDelay
      : defaultSyncDelay;
  let currentZoom: string = initialState?.zoomLevel || defaultZoom;

  if (initialState && typeof initialState.scrollY === 'number') {
    window.scrollTo({ top: initialState.scrollY, behavior: 'instant' });
  }

  // Secondary restore after DOM ready and images/fonts load (CLS mitigation)
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

  // Notify extension host of active scroll sync configuration
  function notifyScrollSyncConfig() {
    vscode?.postMessage({
      type: 'updateScrollSyncConfig',
      delay: scrollSyncDelay,
      behavior: scrollSyncAnim,
    });
  }

  // Save state helper
  function saveCurrentState(overrides?: Partial<WebviewState>) {
    const currentState = vscode?.getState() || { scrollY: 0, scrollRatio: 0 };
    const nextState: WebviewState = {
      ...currentState,
      syncEnabled: scrollSyncEnabled,
      syncAnim: scrollSyncAnim,
      syncDelay: scrollSyncDelay,
      zoomLevel: currentZoom,
      ...overrides,
    };
    vscode?.setState(nextState);
  }

  // Helper to find the top-most visible element with data-line in the preview viewport
  function getTopVisibleLine(): number | undefined {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-line]'));
    if (elements.length === 0) {
      return undefined;
    }

    const toolbar = document.querySelector<HTMLElement>('.preview-toolbar');
    const toolbarHeight = toolbar ? toolbar.offsetHeight : 44;
    const thresholdY = toolbarHeight + 20;

    let closestLine: number | undefined;
    let closestTop = -Infinity;

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      const lineAttr = el.getAttribute('data-line');
      if (!lineAttr) {
        continue;
      }
      const line = parseInt(lineAttr, 10);
      if (isNaN(line)) {
        continue;
      }

      if (rect.top <= thresholdY) {
        if (rect.top > closestTop) {
          closestTop = rect.top;
          closestLine = line;
        }
      }
    }

    if (closestLine === undefined && elements.length > 0) {
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.bottom > thresholdY) {
          const lineAttr = el.getAttribute('data-line');
          if (lineAttr) {
            const line = parseInt(lineAttr, 10);
            if (!isNaN(line)) {
              return line;
            }
          }
        }
      }
    }

    return closestLine;
  }

  // Track scroll changes with configurable debounce delay
  let scrollDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  window.addEventListener('scroll', () => {
    if (scrollDebounceTimer) {
      clearTimeout(scrollDebounceTimer);
    }

    const delay = Math.max(0, scrollSyncDelay);
    scrollDebounceTimer = setTimeout(() => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 1;
      const clientHeight = window.innerHeight || document.documentElement.clientHeight || 1;
      const maxScroll = Math.max(1, scrollHeight - clientHeight);
      const scrollRatio = Math.min(1, Math.max(0, scrollY / maxScroll));

      saveCurrentState({ scrollY, scrollRatio });
      vscode?.postMessage({
        type: 'didScroll',
        scrollY,
        scrollRatio,
      });

      // Synchronize preview scroll position back to editor if not programmatically syncing
      if (scrollSyncEnabled && !isSyncing) {
        const visibleLine = getTopVisibleLine();
        if (typeof visibleLine === 'number') {
          vscode?.postMessage({
            type: 'previewScroll',
            line: visibleLine,
          });
        }
      }
    }, delay);
  });

  // Handle incoming messages from extension host
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
        if (typeof message.line === 'number' && scrollSyncEnabled) {
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
      // Mute reflection timer proportionally to sync delay
      const muteDuration = Math.max(150, scrollSyncDelay * 3);
      syncResetTimer = setTimeout(() => {
        isSyncing = false;
      }, muteDuration);

      const toolbar = document.querySelector<HTMLElement>('.preview-toolbar');
      const toolbarHeight = toolbar ? toolbar.offsetHeight : 44;
      const rect = targetElement.getBoundingClientRect();
      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const targetScrollY = Math.max(0, currentScrollY + rect.top - (toolbarHeight + 12));

      window.scrollTo({
        top: targetScrollY,
        behavior: scrollSyncAnim,
      });
    }
  }

  // Zoom management: scales preview pages inside full-width canvas
  function applyZoom(zoomValue: string) {
    currentZoom = zoomValue;
    const pages = Array.from(document.querySelectorAll<HTMLElement>('.md-tech-pdf-preview-page'));
    const canvas = document.querySelector<HTMLElement>('.md-tech-pdf-preview-canvas');

    // Ensure outer container maintains full width
    const contentWrapper = document.querySelector<HTMLElement>('.preview-content-wrapper');
    if (contentWrapper) {
      contentWrapper.style.transform = 'none';
      contentWrapper.style.width = '100%';
    }
    if (canvas) {
      canvas.style.transform = 'none';
      canvas.style.width = '100%';
    }

    if (pages.length === 0) {
      saveCurrentState();
      return;
    }

    let scale = 1;
    if (zoomValue === 'fit') {
      if (canvas && pages[0]) {
        const availableWidth = Math.max(200, canvas.clientWidth - 48);
        const pageWidth = pages[0].offsetWidth || 794; // A4 standard width ~794px
        scale = Math.min(2.5, Math.max(0.3, availableWidth / pageWidth));
      }
    } else {
      switch (zoomValue) {
        case '50%':
          scale = 0.5;
          break;
        case '75%':
          scale = 0.75;
          break;
        case '125%':
          scale = 1.25;
          break;
        case '150%':
          scale = 1.5;
          break;
        case '100%':
        default:
          scale = 1;
          break;
      }
    }

    for (const page of pages) {
      if (scale === 1) {
        page.style.transform = 'none';
      } else {
        page.style.transform = `scale(${scale})`;
        page.style.transformOrigin = 'top center';
      }
    }

    saveCurrentState();
  }

  // Re-apply zoom on window resize when fit mode is active
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    if (currentZoom === 'fit') {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = setTimeout(() => {
        applyZoom('fit');
      }, 100);
    }
  });

  function updateSyncButtonUi(btn: HTMLElement) {
    if (scrollSyncEnabled) {
      btn.classList.add('toolbar-btn-active');
      btn.innerHTML = '<span>⇄</span> Sync: ON';
      btn.title = 'Scroll synchronization is active. Click to disable.';
    } else {
      btn.classList.remove('toolbar-btn-active');
      btn.innerHTML = '<span>⇥</span> Sync: OFF';
      btn.title = 'Scroll synchronization is disabled. Click to enable.';
    }
  }

  // Toolbar action bindings
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

    const syncBtn = document.getElementById('btn-toolbar-sync');
    if (syncBtn) {
      updateSyncButtonUi(syncBtn);
      syncBtn.addEventListener('click', () => {
        scrollSyncEnabled = !scrollSyncEnabled;
        updateSyncButtonUi(syncBtn);
        saveCurrentState();
      });
    }

    const animSelect = document.getElementById(
      'select-toolbar-sync-anim'
    ) as HTMLSelectElement | null;
    if (animSelect) {
      animSelect.value = scrollSyncAnim;
      animSelect.addEventListener('change', () => {
        scrollSyncAnim = animSelect.value === 'instant' ? 'instant' : 'smooth';
        saveCurrentState();
        notifyScrollSyncConfig();
      });
    }

    const delaySelect = document.getElementById(
      'select-toolbar-sync-delay'
    ) as HTMLSelectElement | null;
    if (delaySelect) {
      delaySelect.value = String(scrollSyncDelay);
      delaySelect.addEventListener('change', () => {
        scrollSyncDelay = parseInt(delaySelect.value, 10);
        saveCurrentState();
        notifyScrollSyncConfig();
      });
    }

    const zoomSelect = document.getElementById('select-toolbar-zoom') as HTMLSelectElement | null;
    if (zoomSelect) {
      zoomSelect.value = currentZoom;
      applyZoom(currentZoom);
      zoomSelect.addEventListener('change', () => {
        applyZoom(zoomSelect.value);
      });
    }

    // Initial notification of scroll sync config to extension host
    notifyScrollSyncConfig();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupToolbarInteractions);
  } else {
    setupToolbarInteractions();
  }
})();
