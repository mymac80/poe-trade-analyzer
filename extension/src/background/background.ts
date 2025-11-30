import { PoeNinjaClient } from '@shared/api/poe-ninja-api';
import { ItemValuator } from '@shared/services/item-valuator';
import { Item, ValuedItem } from '@shared/models/types';

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
let currentLeague: string = 'Settlers';
let minValueChaos: number = 5;

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[POE Pricer] Extension installed');

  // Set default settings
  await chrome.storage.local.set({
    league: 'Settlers',
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

  return false;
});

// Preload market data when extension starts
console.log('[POE Pricer] Preloading market data...');
initializeValuator().catch(error => {
  console.error('[POE Pricer] Failed to preload market data:', error);
});
