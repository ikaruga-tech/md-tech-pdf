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
  viewMode?: 'paged' | 'continuous';
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
  const defaultViewMode =
    (toolbarEl?.getAttribute('data-default-view-mode') as 'paged' | 'continuous') || 'paged';

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
  let currentViewMode: 'paged' | 'continuous' =
    initialState?.viewMode === 'continuous' || initialState?.viewMode === 'paged'
      ? initialState.viewMode
      : defaultViewMode;

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
      viewMode: currentViewMode,
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
    const contentWrapper = document.querySelector<HTMLElement>('.preview-content-wrapper');

    // Ensure outer container maintains full width
    if (contentWrapper) {
      contentWrapper.style.transform = 'none';
      contentWrapper.style.width = '100%';
    }
    if (canvas) {
      canvas.style.transform = 'none';
    }

    if (pages.length === 0) {
      saveCurrentState();
      return;
    }

    let scale = 1;
    if (zoomValue === 'fit') {
      if (pages[0]) {
        // Determine natural unzoomed page width
        let naturalPageWidth = parseFloat(pages[0].dataset.naturalWidth || '');
        if (!naturalPageWidth || isNaN(naturalPageWidth)) {
          pages[0].style.zoom = '1';
          pages[0].style.transform = 'none';
          naturalPageWidth = pages[0].offsetWidth || 794;
          pages[0].dataset.naturalWidth = String(naturalPageWidth);
        }

        const containerWidth = contentWrapper
          ? contentWrapper.clientWidth
          : canvas
            ? canvas.clientWidth
            : window.innerWidth;
        // Leave 32px for canvas padding (16px left + 16px right) + 4px safety margin = 36px
        const availableWidth = Math.max(100, containerWidth - 36);
        scale = Math.min(2.5, Math.max(0.2, availableWidth / naturalPageWidth));
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
      page.style.transform = 'none';
      page.style.zoom = String(scale);
    }

    saveCurrentState();
  }

  // Re-apply zoom on window resize when fit mode is active
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  function handleResize() {
    if (currentZoom === 'fit') {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = setTimeout(() => {
        applyZoom('fit');
      }, 50);
    }
  }

  window.addEventListener('resize', handleResize);

  const contentWrapperEl = document.querySelector<HTMLElement>('.preview-content-wrapper');
  if (typeof ResizeObserver !== 'undefined' && contentWrapperEl) {
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(contentWrapperEl);
  }

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

    const viewModeSelect = document.getElementById(
      'select-toolbar-view-mode'
    ) as HTMLSelectElement | null;
    if (viewModeSelect) {
      viewModeSelect.value = currentViewMode;
      viewModeSelect.addEventListener('change', () => {
        const nextMode = viewModeSelect.value === 'continuous' ? 'continuous' : 'paged';
        applyViewMode(nextMode);
      });
    }

    // Initial notification of scroll sync config to extension host
    notifyScrollSyncConfig();
  }

  // Check if an element represents a page break
  function isPageBreakElement(node: Node): boolean {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    const el = node as HTMLElement;
    if (el.classList.contains('page-break')) {
      return true;
    }
    const style = el.getAttribute('style') || '';
    return /break-before\s*:\s*page/i.test(style) || /page-break-before\s*:\s*always/i.test(style);
  }

  // Helper to measure accurate available content height per page in pixels
  function getPageContentMaxHeight(): number {
    const canvas = document.querySelector<HTMLElement>('.md-tech-pdf-preview-canvas');
    const firstPage = canvas?.querySelector<HTMLElement>('.md-tech-pdf-preview-page');
    if (!firstPage) {
      return 1000;
    }

    const computed = window.getComputedStyle(firstPage);
    const padTop = parseFloat(computed.paddingTop) || 0;
    const padBottom = parseFloat(computed.paddingBottom) || 0;
    const resolvedMinHeight = parseFloat(computed.minHeight) || 1123;
    const availableHeight = resolvedMinHeight - padTop - padBottom;

    // Reserve 28px buffer for page number badge and spacing
    return Math.max(availableHeight - 28, 400);
  }

  // Helper to calculate total layout height of a node including margins
  function getNodeLayoutHeight(node: Node): number {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (isPageBreakElement(el)) {
        return 0;
      }
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const marginTop = parseFloat(style.marginTop) || 0;
      const marginBottom = parseFloat(style.marginBottom) || 0;
      return (rect.height || el.offsetHeight) + marginTop + marginBottom;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      return text ? 24 : 0;
    }
    return 0;
  }

  // Helper to detect heading elements for orphan heading prevention
  function isHeadingElement(node: Node): boolean {
    if (node.nodeType === Node.ELEMENT_NODE) {
      return /^H[1-6]$/i.test((node as HTMLElement).tagName);
    }
    return false;
  }

  interface PageBreakGroup {
    nodes: Node[];
    hasExplicitBreakBefore: boolean;
  }

  // Splits document contents into physical page containers (explicit breaks and automatic pagination)
  function setupDocumentPages() {
    const canvas = document.querySelector<HTMLElement>('.md-tech-pdf-preview-canvas');
    if (!canvas || canvas.dataset.pagesSplit === 'true') {
      return;
    }

    const firstPage = canvas.querySelector<HTMLElement>('.md-tech-pdf-preview-page');
    if (!firstPage) {
      return;
    }

    const childNodes = Array.from(firstPage.childNodes);
    if (childNodes.length === 0) {
      return;
    }

    // 1. Group by explicit page break markers (e.g. ######## or break-before: page)
    const explicitChapters: Node[][] = [[]];
    for (const node of childNodes) {
      if (isPageBreakElement(node)) {
        explicitChapters.push([]);
      } else {
        explicitChapters[explicitChapters.length - 1].push(node);
      }
    }

    // 2. Perform automatic pagination within each chapter based on page height
    const pageMaxHeight = getPageContentMaxHeight();
    const finalPages: PageBreakGroup[] = [];

    explicitChapters.forEach((chapterNodes, chapterIndex) => {
      if (chapterNodes.length === 0) {
        return;
      }

      let currentPageNodes: Node[] = [];
      let currentHeight = 0;
      let isFirstInChapter = true;

      for (let i = 0; i < chapterNodes.length; i++) {
        const node = chapterNodes[i];
        const nodeHeight = getNodeLayoutHeight(node);

        if (nodeHeight <= 0) {
          currentPageNodes.push(node);
          continue;
        }

        // For headings, prevent orphan headings by checking if heading + following content (~60px) fits
        const requiredHeight = isHeadingElement(node) ? nodeHeight + 60 : nodeHeight;

        if (currentHeight > 0 && currentHeight + requiredHeight > pageMaxHeight) {
          finalPages.push({
            nodes: currentPageNodes,
            hasExplicitBreakBefore: isFirstInChapter && chapterIndex > 0,
          });
          isFirstInChapter = false;
          currentPageNodes = [node];
          currentHeight = nodeHeight;
        } else {
          currentPageNodes.push(node);
          currentHeight += nodeHeight;
        }
      }

      if (currentPageNodes.length > 0) {
        finalPages.push({
          nodes: currentPageNodes,
          hasExplicitBreakBefore: isFirstInChapter && chapterIndex > 0,
        });
      }
    });

    // 3. Render page elements into canvas
    if (finalPages.length > 1) {
      firstPage.innerHTML = '';
      canvas.innerHTML = '';

      finalPages.forEach((pageInfo, index) => {
        if (pageInfo.hasExplicitBreakBefore) {
          const divider = document.createElement('div');
          divider.className = 'page-break-divider';
          canvas.appendChild(divider);
        }

        const pageEl = document.createElement('main');
        pageEl.className = 'md-tech-pdf-preview-page';
        pageEl.dataset.pageIndex = String(index + 1);

        pageInfo.nodes.forEach((n) => pageEl.appendChild(n));

        const badge = document.createElement('div');
        badge.className = 'page-number-badge';
        badge.textContent = `Page ${index + 1}`;
        pageEl.appendChild(badge);

        canvas.appendChild(pageEl);
      });

      canvas.dataset.pagesSplit = 'true';
    } else {
      if (!firstPage.querySelector('.page-number-badge')) {
        const badge = document.createElement('div');
        badge.className = 'page-number-badge';
        badge.textContent = 'Page 1';
        firstPage.appendChild(badge);
      }
      canvas.dataset.pagesSplit = 'true';
    }
  }

  // Applies active view mode (paged vs continuous)
  function applyViewMode(mode: 'paged' | 'continuous') {
    currentViewMode = mode;
    document.body.classList.remove('view-mode-paged', 'view-mode-continuous');
    document.body.classList.add(`view-mode-${mode}`);

    const viewSelect = document.getElementById(
      'select-toolbar-view-mode'
    ) as HTMLSelectElement | null;
    if (viewSelect && viewSelect.value !== mode) {
      viewSelect.value = mode;
    }

    applyZoom(currentZoom);
    saveCurrentState({ viewMode: mode });
  }

  function initView() {
    setupDocumentPages();
    applyViewMode(currentViewMode);
    setupToolbarInteractions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initView);
  } else {
    initView();
  }
})();
