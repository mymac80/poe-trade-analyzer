import { PoeNinjaClient } from '@shared/api/poe-ninja-api';
import { ItemValuator } from '@shared/services/item-valuator';
import { Item, ValuedItem } from '@shared/models/types';
import { createTradeSearch, supportsTradeSearch, buildInscribedUltimatumSearch } from '@shared/services/trade-search-builder';

// Background service worker for POE Stash Pricer extension
console.log('[POE Pricer] Background service worker started');

interface StorageData {
  league: string;
  minValueChaos: number;
  marketDataTimestamp?: number;
  marketData?: any;
}

// Store valuator instance
let valuator: ItemValuator | null = null;
let currentLeague: string = 'Keepers';
let minValueChaos: number = 5;

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[POE Pricer] Extension installed');

  // Set default settings
  await chrome.storage.local.set({
    league: 'Keepers',
    minValueChaos: 5
  });

  console.log('[POE Pricer] Default settings saved');
});

// Load settings on startup
chrome.storage.local.get(['league', 'minValueChaos'], (result) => {
  if (result.league) {
    currentLeague = result.league;
  }
  if (result.minValueChaos !== undefined) {
    minValueChaos = result.minValueChaos;
  }
  console.log(`[POE Pricer] Settings loaded: league=${currentLeague}, minValue=${minValueChaos}c`);
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.league) {
      currentLeague = changes.league.newValue;
      console.log(`[POE Pricer] League changed to: ${currentLeague}`);
      valuator = null; // Reset valuator to reload market data
    }
    if (changes.minValueChaos) {
      minValueChaos = changes.minValueChaos.newValue;
      console.log(`[POE Pricer] Min value changed to: ${minValueChaos}c`);
    }
  }
});

/**
 * Fetch market data and initialize valuator
 */
async function initializeValuator(): Promise<void> {
  if (valuator) {
    console.log('[POE Pricer] Valuator already initialized');
    return;
  }

  console.log('[POE Pricer] Initializing valuator...');

  try {
    const ninjaClient = new PoeNinjaClient(currentLeague);
    const marketData = await ninjaClient.fetchAllMarketData();

    valuator = new ItemValuator(
      marketData.uniques,
      marketData.gems,
      marketData.currency,
      marketData.fragments,
      marketData.divination,
      marketData.oils,
      marketData.essences,
      marketData.divinePrice
    );

    // Cache market data
    await chrome.storage.local.set({
      marketDataTimestamp: Date.now()
    });

    console.log('[POE Pricer] Valuator initialized successfully');
  } catch (error) {
    console.error('[POE Pricer] Failed to initialize valuator:', error);
    throw error;
  }
}

/**
 * Value a list of items
 */
async function valueItems(items: Item[]): Promise<ValuedItem[]> {
  // Initialize valuator if needed
  if (!valuator) {
    await initializeValuator();
  }

  if (!valuator) {
    throw new Error('Failed to initialize valuator');
  }

  const valuedItems: ValuedItem[] = [];

  for (const item of items) {
    try {
      const valued = valuator.valueItem(item);
      if (valued && valued.estimatedValue >= minValueChaos) {
        valuedItems.push(valued);
      }
    } catch (error) {
      console.error('[POE Pricer] Error valuing item:', error);
    }
  }

  // Sort by value (highest first)
  valuedItems.sort((a, b) => b.estimatedValue - a.estimatedValue);

  return valuedItems;
}

/**
 * Handle messages from content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[POE Pricer] Received message:', request.type);

  if (request.type === 'VALUE_ITEMS') {
    // Value items asynchronously
    valueItems(request.items)
      .then((valuedItems) => {
        console.log(`[POE Pricer] Valued ${valuedItems.length} items`);
        sendResponse({ success: true, valuedItems });
      })
      .catch((error) => {
        console.error('[POE Pricer] Error valuing items:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep message channel open for async response
  }

  if (request.type === 'GET_SETTINGS') {
    sendResponse({
      success: true,
      settings: {
        league: currentLeague,
        minValueChaos: minValueChaos
      }
    });
    return false;
  }

  if (request.type === 'UPDATE_SETTINGS') {
    chrome.storage.local.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === 'REFRESH_MARKET_DATA') {
    // Clear valuator to force reload
    valuator = null;
    initializeValuator()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.type === 'GET_TRADE_PRICE') {
    // Fetch trade price for a specific item
    fetchTradePrice(request.item)
      .then((result) => {
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  return false;
});

/**
 * Fetch trade price for an item by opening a trade search
 */
async function fetchTradePrice(item: Item): Promise<any> {
  console.log('[POE Pricer] ========================================');
  console.log('[POE Pricer] fetchTradePrice called');
  console.log('[POE Pricer] Item typeLine:', item.typeLine);
  console.log('[POE Pricer] Item name:', item.name);
  console.log('[POE Pricer] Current league:', currentLeague);

  // Check if this item type supports trade search
  if (!supportsTradeSearch(item)) {
    console.error('[POE Pricer] Item type does not support trade search');
    throw new Error('Item type does not support trade search');
  }
  console.log('[POE Pricer] Item supports trade search ✓');

  try {
    // Build trade search for this item
    console.log('[POE Pricer] Building search query...');
    const searchQuery = buildInscribedUltimatumSearch(item, currentLeague);
    console.log('[POE Pricer] Search query built:', searchQuery);

    // Create trade search via API
    console.log('[POE Pricer] Creating trade search via API...');
    const searchUrl = await createTradeSearch(searchQuery.apiQuery, currentLeague);
    console.log('[POE Pricer] createTradeSearch returned:', searchUrl);

    if (!searchUrl) {
      console.error('[POE Pricer] Failed to create trade search - no URL returned');
      throw new Error('Failed to create trade search');
    }

    console.log('[POE Pricer] Trade search created successfully:', searchUrl);

    // Open trade search in a new tab (must be foreground - background tabs are throttled)
    console.log('[POE Pricer] Opening tab...');
    const tab = await chrome.tabs.create({
      url: searchUrl,
      active: true // Must be foreground - Chrome throttles background tabs and dynamic content won't load
    });

    console.log('[POE Pricer] Tab created:', tab);
    console.log('[POE Pricer] Tab ID:', tab.id);
    console.log('[POE Pricer] Tab URL:', tab.url);

    if (!tab.id) {
      console.error('[POE Pricer] Tab creation failed - no ID');
      throw new Error('Failed to create tab');
    }

    // Wait for the tab to finish loading before injecting the script
    console.log('[POE Pricer] Waiting for tab to load...');
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.warn('[POE Pricer] Tab load timeout after 10 seconds');
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('Tab load timeout'));
      }, 10000);

      const listener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
        if (tabId === tab.id && info.status === 'complete') {
          console.log('[POE Pricer] Tab loaded completely');
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);

      // Also resolve if already loaded
      if (tab.status === 'complete') {
        console.log('[POE Pricer] Tab already complete');
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });

    // Manually inject the trade-content script
    console.log('[POE Pricer] Injecting trade-content script...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['trade-content.js']
      });
      console.log('[POE Pricer] ✓ Trade-content script injected successfully');
    } catch (error) {
      console.error('[POE Pricer] ✗ Failed to inject trade-content script:', error);
      chrome.tabs.remove(tab.id);
      throw new Error('Failed to inject trade-content script');
    }

    console.log('[POE Pricer] Waiting for trade content script to extract data...');
    console.log('[POE Pricer] Will timeout in 30 seconds');

    // Wait for the trade content script to extract pricing data
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[POE Pricer] Timeout! No response from trade content script after 30 seconds');
        console.log('[POE Pricer] Closing tab:', tab.id);
        chrome.tabs.remove(tab.id!);
        reject(new Error('Timeout waiting for trade data'));
      }, 30000); // 30 second timeout (increased from 15)

      // Listen for trade data extraction
      const messageListener = (message: any, sender: chrome.runtime.MessageSender) => {
        console.log('[POE Pricer] Received message:', message.type, 'from tab:', sender.tab?.id);

        if (message.type === 'TRADE_DATA_EXTRACTED' && sender.tab?.id === tab.id) {
          console.log('[POE Pricer] ✓ Received TRADE_DATA_EXTRACTED from correct tab!');
          console.log('[POE Pricer] Success:', message.success);
          console.log('[POE Pricer] Data:', message.data);

          clearTimeout(timeout);
          chrome.runtime.onMessage.removeListener(messageListener);

          // Close the tab
          console.log('[POE Pricer] Closing tab:', tab.id);
          chrome.tabs.remove(tab.id!);

          // Check if extraction was successful
          if (!message.success || !message.data) {
            console.warn('[POE Pricer] Trade data extraction failed - page may not have loaded properly');
            console.log('[POE Pricer] Resolving with null (extraction failed)');
            resolve(null);
          } else {
            console.log('[POE Pricer] Resolving with successful data');
            resolve(message.data);
          }
        } else if (message.type === 'TRADE_DATA_EXTRACTED') {
          console.warn('[POE Pricer] Got TRADE_DATA_EXTRACTED but from wrong tab');
          console.log('[POE Pricer] Expected tab ID:', tab.id, 'Got tab ID:', sender.tab?.id);
        }
      };

      console.log('[POE Pricer] Message listener registered');
      chrome.runtime.onMessage.addListener(messageListener);
    });
  } catch (error) {
    console.error('[POE Pricer] Error fetching trade price:', error);
    throw error;
  }
}

// Preload market data when extension starts
console.log('[POE Pricer] Preloading market data...');
initializeValuator().catch(error => {
  console.error('[POE Pricer] Failed to preload market data:', error);
});
