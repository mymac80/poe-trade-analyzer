import { PoeNinjaClient } from '@shared/api/poe-ninja-api';
import { ItemValuator } from '@shared/services/item-valuator';
import { Item, ValuedItem, PoeNinjaCurrencyResponse } from '@shared/models/types';
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

    // Combine fragments and scarabs into a single array
    const allFragments: PoeNinjaCurrencyResponse = {
      lines: [
        ...marketData.fragments.lines,
        ...marketData.scarabs.lines
      ],
      currencyDetails: [
        ...(marketData.fragments.currencyDetails || []),
        ...(marketData.scarabs.currencyDetails || [])
      ]
    };

    valuator = new ItemValuator(
      marketData.uniques,
      marketData.gems,
      marketData.currency,
      allFragments,
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
  const itemTypeStats: Record<string, {total: number, valued: number, belowThreshold: number, noValue: number}> = {};

  for (const item of items) {
    try {
      // Track stats by baseType
      const baseType = item.baseType || item.typeLine || 'unknown';
      if (!itemTypeStats[baseType]) {
        itemTypeStats[baseType] = { total: 0, valued: 0, belowThreshold: 0, noValue: 0 };
      }
      itemTypeStats[baseType].total++;

      const valued = valuator.valueItem(item);
      if (valued) {
        if (valued.estimatedValue >= minValueChaos) {
          valuedItems.push(valued);
          itemTypeStats[baseType].valued++;
        } else {
          itemTypeStats[baseType].belowThreshold++;
        }
      } else {
        itemTypeStats[baseType].noValue++;
      }
    } catch (error) {
      console.error('[POE Pricer] Error valuing item:', item.typeLine, error);
    }
  }

  // Log stats
  console.log('[POE Pricer] Item valuation stats:');
  for (const [type, stats] of Object.entries(itemTypeStats)) {
    if (stats.total > 1) { // Only log types with multiple items
      console.log(`  ${type}: ${stats.valued} valued, ${stats.belowThreshold} below threshold (${minValueChaos}c), ${stats.noValue} no value`);
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
  // Check if this item type supports trade search
  if (!supportsTradeSearch(item)) {
    console.error('[POE Pricer] Item type does not support trade search');
    throw new Error('Item type does not support trade search');
  }

  try {
    // Build trade search for this item
    const searchQuery = buildInscribedUltimatumSearch(item, currentLeague);

    // Create trade search via API (logs success URL automatically)
    const searchResult = await createTradeSearch(searchQuery.apiQuery, currentLeague);

    if (!searchResult) {
      console.error('[POE Pricer] Failed to create trade search');
      throw new Error('Failed to create trade search');
    }

    const { url: searchUrl, resultCount } = searchResult;

    // If 0 results, just open the tab briefly and auto-close after 5 seconds
    if (resultCount === 0) {
      const tab = await chrome.tabs.create({
        url: searchUrl,
        active: true
      });

      // Auto-close the tab after 5 seconds
      setTimeout(() => {
        if (tab.id) {
          chrome.tabs.remove(tab.id);
        }
      }, 5000);

      return {
        noResults: true,
        searchUrl: searchUrl
      };
    }

    // Open trade search in a new tab (must be foreground - background tabs are throttled)
    const tab = await chrome.tabs.create({
      url: searchUrl,
      active: true
    });

    if (!tab.id) {
      console.error('[POE Pricer] Tab creation failed');
      throw new Error('Failed to create tab');
    }

    // Wait for the tab to finish loading before injecting the script
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('Tab load timeout'));
      }, 10000);

      const listener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
        if (tabId === tab.id && info.status === 'complete') {
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);

      // Also resolve if already loaded
      if (tab.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });

    // Manually inject the trade-content script
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['trade-content.js']
      });
    } catch (error) {
      console.error('[POE Pricer] Failed to inject trade-content script:', error);
      chrome.tabs.remove(tab.id);
      throw new Error('Failed to inject trade-content script');
    }

    // Wait for the trade content script to extract pricing data
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[POE Pricer] Timeout waiting for trade data (30s)');
        chrome.tabs.remove(tab.id!);
        reject(new Error('Timeout waiting for trade data'));
      }, 30000);

      // Listen for trade data extraction
      const messageListener = (message: any, sender: chrome.runtime.MessageSender) => {
        if (message.type === 'TRADE_DATA_EXTRACTED' && sender.tab?.id === tab.id) {
          clearTimeout(timeout);
          chrome.runtime.onMessage.removeListener(messageListener);
          chrome.tabs.remove(tab.id!);

          // Check if extraction was successful
          if (!message.success || !message.data) {
            console.warn('[POE Pricer] Trade data extraction failed');
            resolve(null);
          } else {
            resolve(message.data);
          }
        }
      };

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
