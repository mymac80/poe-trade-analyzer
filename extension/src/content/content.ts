import { Item, ValuedItem, StashTabResponse } from '@shared/models/types';

console.log('[POE Pricer] Content script loaded');

/**
 * Check if an item type supports trade search pricing
 * Duplicated here to avoid code splitting issues with Vite
 */
function supportsTradeSearch(item: Item): boolean {
  // For now, only support Inscribed Ultimatums
  return item.typeLine.includes('Inscribed Ultimatum');
}

// State
let currentStashItems: Item[] = [];
let cachedStashItems: Item[] = []; // Cache most recent stash data
let valuedItems: ValuedItem[] = [];
let isAnalyzing = false;

// Create overlay panel
function createOverlayPanel(): void {
  if (document.getElementById('poe-pricer-overlay')) {
    return; // Already exists
  }

  const overlay = document.createElement('div');
  overlay.id = 'poe-pricer-overlay';
  overlay.className = 'poe-pricer-panel';
  overlay.innerHTML = `
    <div class="poe-pricer-header">
      <h3>POE Stash Pricer</h3>
      <div class="poe-pricer-actions">
        <button id="poe-pricer-analyze" class="poe-pricer-btn">Analyze</button>
        <button id="poe-pricer-close" class="poe-pricer-btn-close">×</button>
      </div>
    </div>
    <div id="poe-pricer-content" class="poe-pricer-content">
      <p class="poe-pricer-hint">Click "Analyze" to price items in your current stash tab</p>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add event listeners
  document.getElementById('poe-pricer-analyze')?.addEventListener('click', analyzeCurrentStash);
  document.getElementById('poe-pricer-close')?.addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  // Make panel draggable
  makeDraggable(overlay);
}

/**
 * Make an element draggable
 */
function makeDraggable(element: HTMLElement): void {
  const header = element.querySelector('.poe-pricer-header') as HTMLElement;
  if (!header) return;

  let isDragging = false;
  let currentX = 0;
  let currentY = 0;
  let initialX = 0;
  let initialY = 0;

  header.style.cursor = 'move';

  header.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;

    isDragging = true;
    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    element.style.transform = `translate(${currentX}px, ${currentY}px)`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

/**
 * Analyze current stash tab
 */
async function analyzeCurrentStash(): Promise<void> {
  if (isAnalyzing) {
    console.log('[POE Pricer] Already analyzing');
    return;
  }

  isAnalyzing = true;
  const contentDiv = document.getElementById('poe-pricer-content');
  if (contentDiv) {
    contentDiv.innerHTML = '<p class="poe-pricer-loading">Analyzing stash...</p>';
  }

  try {
    // Extract items from current page
    const items = await extractStashItems();

    if (!items || items.length === 0) {
      if (contentDiv) {
        contentDiv.innerHTML = '<p class="poe-pricer-error">No items found in current stash tab</p>';
      }
      return;
    }

    console.log(`[POE Pricer] Found ${items.length} items in stash`);

    // Send to background script for valuation
    const response = await chrome.runtime.sendMessage({
      type: 'VALUE_ITEMS',
      items: items
    });

    if (response.success) {
      valuedItems = response.valuedItems;
      displayResults(valuedItems);
    } else {
      if (contentDiv) {
        contentDiv.innerHTML = `<p class="poe-pricer-error">Error: ${response.error}</p>`;
      }
    }
  } catch (error) {
    console.error('[POE Pricer] Error analyzing stash:', error);
    if (contentDiv) {
      contentDiv.innerHTML = `<p class="poe-pricer-error">Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>`;
    }
  } finally {
    isAnalyzing = false;
  }
}

/**
 * Extract items from stash page
 */
async function extractStashItems(): Promise<Item[]> {
  // Method 1: Use cached data if available
  if (cachedStashItems.length > 0) {
    console.log(`[POE Pricer] Using cached stash data (${cachedStashItems.length} items)`);
    return cachedStashItems;
  }

  // Method 2: Try to find React component data
  const items = await extractFromReactData();
  if (items && items.length > 0) {
    console.log('[POE Pricer] Extracted items from React data');
    return items;
  }

  // Method 3: Wait for next API call (user needs to switch tabs)
  console.log('[POE Pricer] No cached data. Please switch stash tabs to load items...');
  return new Promise((resolve) => {
    const contentDiv = document.getElementById('poe-pricer-content');
    if (contentDiv) {
      contentDiv.innerHTML = '<p class="poe-pricer-hint">Switch stash tabs to load items, then click Analyze again</p>';
    }

    // Set a timeout
    const timeout = setTimeout(() => {
      console.warn('[POE Pricer] Timeout waiting for stash data');
      resolve([]);
    }, 10000); // Increased to 10 seconds

    // Listen for postMessage from injected script
    const messageHandler = (event: MessageEvent) => {
      // Only accept messages from same origin
      if (event.source !== window) return;

      if (event.data.type === 'POE_PRICER_STASH_DATA') {
        console.log('[POE Pricer] Received stash data from injected script');
        clearTimeout(timeout);
        window.removeEventListener('message', messageHandler);
        resolve(event.data.items || []);
      }
    };

    window.addEventListener('message', messageHandler);

    console.log('[POE Pricer] Waiting for stash data...');
  });
}

/**
 * Extract items from React component data in the page
 */
function extractFromReactData(): Item[] | null {
  try {
    // POE website uses React - try to find the stash data in window object
    // This is a heuristic approach and may need adjustment based on POE's implementation

    // Check if there's a stash data object in the window
    const windowAny = window as any;

    // Common places where React apps store data
    const possibleKeys = [
      '__REACT_DEVTOOLS_GLOBAL_HOOK__',
      '__INITIAL_STATE__',
      '__NEXT_DATA__',
      'stashData',
      'itemData'
    ];

    for (const key of possibleKeys) {
      if (windowAny[key]) {
        console.log(`[POE Pricer] Found potential data at window.${key}`);
        // Try to extract items from this object
        const extracted = recursivelyFindItems(windowAny[key]);
        if (extracted && extracted.length > 0) {
          return extracted;
        }
      }
    }

    // Try to find items in DOM data attributes
    const stashContainer = document.querySelector('[data-items]');
    if (stashContainer) {
      const itemsJson = stashContainer.getAttribute('data-items');
      if (itemsJson) {
        return JSON.parse(itemsJson);
      }
    }

    return null;
  } catch (error) {
    console.error('[POE Pricer] Error extracting from React data:', error);
    return null;
  }
}

/**
 * Recursively search object for items array
 */
function recursivelyFindItems(obj: any, depth: number = 0): Item[] | null {
  if (depth > 5) return null; // Prevent infinite recursion

  if (Array.isArray(obj)) {
    // Check if this looks like an items array
    if (obj.length > 0 && obj[0].typeLine && obj[0].frameType !== undefined) {
      return obj as Item[];
    }
  }

  if (obj && typeof obj === 'object') {
    // Check for common item container keys
    if (obj.items && Array.isArray(obj.items)) {
      if (obj.items.length > 0 && obj.items[0].typeLine) {
        return obj.items as Item[];
      }
    }

    // Recursively search nested objects
    for (const key in obj) {
      try {
        const found = recursivelyFindItems(obj[key], depth + 1);
        if (found) return found;
      } catch (e) {
        // Skip properties that throw errors
        continue;
      }
    }
  }

  return null;
}

/**
 * Display results in overlay
 */
function displayResults(items: ValuedItem[]): void {
  const contentDiv = document.getElementById('poe-pricer-content');
  if (!contentDiv) return;

  if (items.length === 0) {
    contentDiv.innerHTML = '<p class="poe-pricer-hint">No valuable items found (min value threshold not met)</p>';
    return;
  }

  // Calculate total value
  const totalChaos = items.reduce((sum, item) => sum + item.estimatedValue, 0);
  const totalDivine = items.reduce((sum, item) => sum + item.divineValue, 0);

  let html = `
    <div class="poe-pricer-summary">
      <strong>Total Value:</strong> ${totalChaos.toFixed(0)}c (${totalDivine.toFixed(1)}div)
      <br>
      <strong>Valuable Items:</strong> ${items.length}
    </div>
    <div class="poe-pricer-items">
  `;

  // Show top items
  const topItems = items.slice(0, 20);
  for (let i = 0; i < topItems.length; i++) {
    const valued = topItems[i];
    const item = valued.item;
    const itemName = item.name || item.typeLine;

    const confidenceClass = `confidence-${valued.confidence}`;
    const liquidityClass = `liquidity-${valued.liquidityEstimate}`;

    // Check if item supports trade search
    const showTradeButton = supportsTradeSearch(item);

    html += `
      <div class="poe-pricer-item ${confidenceClass}" data-item-index="${i}">
        <div class="item-header">
          <span class="item-name">${escapeHtml(itemName)}</span>
          <span class="item-value">${valued.estimatedValue.toFixed(0)}c</span>
        </div>
        <div class="item-details">
          <span class="item-confidence">${valued.confidence} confidence</span>
          <span class="item-liquidity">${valued.liquidityEstimate}</span>
        </div>
        ${valued.specialNotes && valued.specialNotes.length > 0 ?
          `<div class="item-notes">${valued.specialNotes.join(', ')}</div>` : ''}
        ${valued.marketData ?
          `<div class="item-trade-data">
            <strong>Trade Price:</strong> ~${valued.marketData.medianPrice?.toFixed(0) || valued.marketData.averagePrice?.toFixed(0) || '?'}c
            <span style="color: #888; font-size: 0.9em;">(${valued.marketData.listingsFound} listings, lowest: ${valued.marketData.lowestPrice?.toFixed(0)}c)</span>
          </div>` : ''}
        ${showTradeButton ?
          `<button class="poe-pricer-trade-btn" data-item-index="${i}">
            Check Trade Price
          </button>` : ''}
      </div>
    `;
  }

  html += '</div>';

  if (items.length > 20) {
    html += `<p class="poe-pricer-hint">Showing top 20 of ${items.length} valuable items</p>`;
  }

  contentDiv.innerHTML = html;

  // Add event listeners for trade price buttons
  const tradeBtns = contentDiv.querySelectorAll('.poe-pricer-trade-btn');
  tradeBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const itemIndex = parseInt(target.dataset.itemIndex || '0');
      const valued = items[itemIndex];

      if (!valued) return;

      // Disable button and show loading state
      target.textContent = 'Fetching...';
      target.setAttribute('disabled', 'true');

      try {
        // Request trade price from background worker
        const response = await chrome.runtime.sendMessage({
          type: 'GET_TRADE_PRICE',
          item: valued.item
        });

        if (response.success && response.data) {
          // Update the valued item with market data
          valued.marketData = {
            listingsFound: response.data.totalListings,
            averagePrice: response.data.averagePrice,
            medianPrice: response.data.medianPrice,
            lowestPrice: response.data.lowestPrice,
            trend: 'stable'
          };

          // Re-render just this item
          displayResults(items);
        } else {
          target.textContent = 'Error';
          console.error('[POE Pricer] Trade price fetch failed:', response.error);
        }
      } catch (error) {
        target.textContent = 'Error';
        console.error('[POE Pricer] Error fetching trade price:', error);
      }
    });
  });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// CRITICAL: Inject script into page context IMMEDIATELY
// Content scripts run in isolated world - can't intercept page's requests
// Must inject into page context to intercept POE's own XHR/fetch calls
function injectPageScript(): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function() {
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Inject immediately at document_start
injectPageScript();

// Listen for stash data and cache it (persistent listener)
window.addEventListener('message', (event: MessageEvent) => {
  // Only accept messages from same origin
  if (event.source !== window) return;

  if (event.data.type === 'POE_PRICER_STASH_DATA') {
    cachedStashItems = event.data.items || [];
  }
});

// Initialize UI after DOM is ready
function initUI(): void {

  // Create overlay
  createOverlayPanel();

  // Show overlay by default
  const overlay = document.getElementById('poe-pricer-overlay');
  if (overlay) {
    overlay.style.display = 'block';
  }
}

// Wait for DOM to be ready before creating UI elements
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUI);
} else {
  initUI();
}
