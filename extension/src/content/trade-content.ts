/**
 * Content script for POE trade site pages
 * Extracts pricing data from trade search results
 */

console.log('[POE Pricer Trade] ========================================');
console.log('[POE Pricer Trade] Trade content script loaded');
console.log('[POE Pricer Trade] Current URL:', window.location.href);
console.log('[POE Pricer Trade] ========================================');

interface TradeListing {
  price: {
    amount: number;
    currency: string; // e.g., "chaos", "divine"
  };
  listed: string; // e.g., "3 hours ago"
  account: string;
}

interface TradeSearchResult {
  itemName: string;
  listings: TradeListing[];
  averagePrice?: number; // in chaos (excluding bottom 20% lowballs)
  medianPrice?: number; // in chaos (median of listings excluding bottom 20%)
  lowestPrice?: number; // in chaos (absolute lowest, might be lowball)
  totalListings: number;
}

/**
 * Extract pricing data from current trade search page
 */
function extractTradePricing(): TradeSearchResult | null {
  try {
    console.log('[POE Pricer Trade] ----------------------------------------');
    console.log('[POE Pricer Trade] extractTradePricing() called');
    console.log('[POE Pricer Trade] document.readyState:', document.readyState);
    console.log('[POE Pricer Trade] document.body exists:', !!document.body);

    // Log the page structure to understand what selectors to use
    console.log('[POE Pricer Trade] Looking for result elements...');
    console.log('[POE Pricer Trade] Testing selector: .resultset .row');

    // Find all listing elements on the page
    const resultElements = document.querySelectorAll('.resultset .row');
    console.log('[POE Pricer Trade] Found elements:', resultElements.length);

    if (!resultElements || resultElements.length === 0) {
      console.log('[POE Pricer Trade] No results found with .resultset .row selector');
      console.log('[POE Pricer Trade] Trying alternative selectors...');

      // Try to find what elements actually exist
      const bodyClasses = document.body?.className || 'no body';
      console.log('[POE Pricer Trade] Body classes:', bodyClasses);

      // Log all elements with class containing 'result'
      const resultLike = document.querySelectorAll('[class*="result"]');
      console.log('[POE Pricer Trade] Elements with "result" in class:', resultLike.length);
      if (resultLike.length > 0) {
        console.log('[POE Pricer Trade] First result-like element:', resultLike[0].className);
      }

      return null;
    }

    const listings: TradeListing[] = [];

    for (const element of Array.from(resultElements)) {
      try {
        // Extract price information
        // Price is in [data-field="price"] with format: "Exact Price: 1×Orb of Alchemy"
        const priceElement = element.querySelector('[data-field="price"]');
        if (!priceElement) {
          console.log('[POE Pricer Trade] No price element found in listing');
          continue;
        }

        // Get currency from image alt attribute
        const currencyImg = priceElement.querySelector('img');
        const currency = currencyImg?.alt || 'unknown';

        // Extract amount from price text (e.g., "1×" or "2.5×")
        const priceText = priceElement.textContent?.trim() || '';
        const amountMatch = priceText.match(/([\d.]+)×/);

        if (!amountMatch) {
          console.log('[POE Pricer Trade] Could not parse price amount from:', priceText);
          continue;
        }

        const amount = parseFloat(amountMatch[1]);
        console.log('[POE Pricer Trade] Parsed price:', amount, currency);

        // Extract account name
        const accountElement = element.querySelector('a[href^="/account/view-profile"]');
        const account = accountElement?.textContent?.trim() || 'unknown';

        // Extract listing age from text
        const elementText = element.textContent || '';
        const timeMatch = elementText.match(/listed (.+?) ago/);
        const listed = timeMatch ? timeMatch[0] : 'unknown';

        listings.push({
          price: { amount, currency },
          listed,
          account
        });

        console.log('[POE Pricer Trade] Added listing:', { amount, currency, account, listed });
      } catch (error) {
        console.error('[POE Pricer Trade] Error parsing listing:', error);
        continue;
      }
    }

    if (listings.length === 0) {
      return null;
    }

    // Calculate statistics
    // Currency conversion map (approximate values in chaos)
    const currencyToChaos: Record<string, number> = {
      'chaos': 1,
      'divine': 150, // Approximate - should get from market data
      'alch': 0.1,
      'fuse': 0.1,
      'vaal': 0.5,
      'gcp': 0.5,
      'chrom': 0.05,
      'jew': 0.05,
      'chance': 0.05,
      'chisel': 0.2,
      'scour': 0.3,
      'regret': 0.5,
      'blessed': 0.1
    };

    const chaosListings = listings.map(l => {
      const conversionRate = currencyToChaos[l.price.currency] || 0;
      if (conversionRate === 0) {
        console.warn('[POE Pricer Trade] Unknown currency:', l.price.currency);
      }
      return l.price.amount * conversionRate;
    }).filter(p => p > 0);

    if (chaosListings.length === 0) {
      return null;
    }

    // Sort prices ascending
    const sortedPrices = [...chaosListings].sort((a, b) => a - b);

    // Remove lowball outliers - skip bottom 20% of listings (price fixers)
    const skipCount = Math.floor(sortedPrices.length * 0.2);
    const cleanedPrices = sortedPrices.slice(skipCount);

    // Calculate statistics on cleaned data
    const lowestPrice = sortedPrices[0]; // Absolute lowest (might be lowball)

    // Median of middle 60% (excluding top and bottom 20%)
    const medianPrice = cleanedPrices.length > 0
      ? cleanedPrices[Math.floor(cleanedPrices.length / 2)]
      : sortedPrices[0];

    // Average of middle 60%
    const averagePrice = cleanedPrices.length > 0
      ? cleanedPrices.reduce((sum, p) => sum + p, 0) / cleanedPrices.length
      : sortedPrices[0];

    console.log('[POE Pricer Trade] Price analysis:');
    console.log('[POE Pricer Trade]   Total listings:', sortedPrices.length);
    console.log('[POE Pricer Trade]   Lowest (might be lowball):', lowestPrice + 'c');
    console.log('[POE Pricer Trade]   Median (excluding bottom 20%):', medianPrice + 'c');
    console.log('[POE Pricer Trade]   Average (excluding bottom 20%):', averagePrice.toFixed(1) + 'c');

    // Get item name from page title or search bar
    const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
    const itemName = searchInput?.value || 'Unknown Item';

    return {
      itemName,
      listings,
      averagePrice, // Average excluding lowballs
      medianPrice,  // Median excluding lowballs
      lowestPrice,  // Absolute lowest (for reference)
      totalListings: listings.length
    };
  } catch (error) {
    console.error('[POE Pricer Trade] Error extracting trade data:', error);
    return null;
  }
}

/**
 * Listen for requests from background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_TRADE_PRICING') {
    console.log('[POE Pricer Trade] Extracting pricing data...');

    // Wait a moment for page to fully load
    setTimeout(() => {
      const result = extractTradePricing();
      sendResponse({ success: true, data: result });
    }, 1000);

    return true; // Keep channel open for async response
  }

  return false;
});

// Auto-extract - trigger immediately since we're injected after page load
console.log('[POE Pricer Trade] Triggering auto-extraction...');
console.log('[POE Pricer Trade] document.readyState:', document.readyState);
console.log('[POE Pricer Trade] Waiting 2 seconds for dynamic content to load...');

setTimeout(() => {
  console.log('[POE Pricer Trade] 2 second wait complete, extracting data...');
  const result = extractTradePricing();

  if (result) {
    console.log('[POE Pricer Trade] ✓ Successfully extracted trade data:', result);
  } else {
    console.error('[POE Pricer Trade] ✗ Failed to extract trade data (result is null)');
  }

  // ALWAYS send response, even if extraction failed
  console.log('[POE Pricer Trade] Sending TRADE_DATA_EXTRACTED message to background...');
  chrome.runtime.sendMessage({
    type: 'TRADE_DATA_EXTRACTED',
    data: result, // Can be null if extraction failed
    success: !!result
  }, (response) => {
    console.log('[POE Pricer Trade] Message sent, response:', response);
  });
}, 2000); // Wait 2 seconds for dynamic content to load

console.log('[POE Pricer Trade] Auto-extraction scheduled');
