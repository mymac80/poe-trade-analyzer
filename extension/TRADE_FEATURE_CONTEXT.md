# Trade Site Integration - Development Context

## Goal
Add real market pricing from pathofexile.com/trade to supplement poe.ninja estimates, especially for Inscribed Ultimatums.

## Current Status: Trade Feature Committed, Variant Matching Completed

### Recent Session (2024-11-30): Variant Matching Improvements
✅ **COMPLETED** - Fixed critical pricing bugs in main stash pricer extension:

**Gem Variant Matching Fix**:
- Fixed bug where Level 21/0% quality gems matched 21/23 variants (192c instead of ~2c)
- Added tiebreaker logic: when scores are equal, selects variant with closest quality match
- File: `src/shared/services/item-valuator.ts:313-335`

**Unique Item Variant Matching Fix**:
- Changed storage from single variant to array of variants
- Unique items now match based on corruption status and link count
- Added tiebreaker for closest link count match
- Files: `src/shared/services/item-valuator.ts:7, 39-46, 198-306`

**Code Cleanup**:
- Removed excessive debug logging from production build
- Fixed TypeScript type error in `injected.ts` fetch interceptor
- Reduced build size from 59.13 kB to 56.80 kB
- All TypeScript type checks pass

**Documentation Updates**:
- Updated CLAUDE.md with variant matching details
- Added note about variant matching being critical
- All documentation now current

**Git Commits**:
- Commit 1: `fix: Implement variant matching for gems and unique items`
- Commit 2: `feat: Add trade search functionality for Inscribed Ultimatums`
- Both commits pushed to GitHub (main branch)

### Trade Feature Status: Ready to Test DOM Selectors

### What's Working (As of 2024-11-30 Latest Session)
✅ Extension builds successfully
✅ "Check Trade Price" button appears on Inscribed Ultimatums
✅ Item extraction from stash works
✅ Ultimatum details extraction fixed (using `properties` array, not `explicitMods`)
✅ Trade API query structure fixed (using `ultimatum_filters` with `stats` array)
✅ League mismatch fixed (now uses `item.league` instead of settings)
✅ Default league changed to "Keepers"
✅ Trade API returns 200 and creates search URL successfully
✅ Background tab opens with correct search URL (in foreground for debugging)
✅ Manual script injection implemented using `chrome.scripting.executeScript`
✅ Script waits for tab to fully load before injecting
✅ Trade-content script injection succeeds (logs show "✓ Trade-content script injected successfully")
✅ Trade-content now triggers extraction immediately (not waiting for window load event)
✅ Comprehensive logging added throughout

### Next Step
⚠️ **NEED TO TEST**: Check if DOM selectors (`.resultset .row`) find actual elements on trade page
⚠️ **NEED TO VERIFY**: If selectors fail, inspect actual POE trade page HTML structure
⚠️ **NEED TO IMPLEMENT**: Correct selectors based on actual page structure

### Latest Changes (2024-11-30 - Complete Session Summary)

**Session 1: Fixed Ultimatum Extraction**
- Changed from `item.explicitMods` to `item.properties` array
- See "Recent Fixes" section below for details

**Session 2: Fixed Trade API + Script Injection**
**Fixed trade API query structure** (`trade-search-builder.ts`):
- Changed from `type_filters` to `ultimatum_filters` (discovered via web search)
- Removed incorrect `category: "map"` filter
- Query now returns 200 status instead of 400 "Invalid query"

**Fixed league mismatch** (`background.ts`):
- Now uses `item.league` from the item data ("Keepers")
- Previously was using settings league ("Settlers") - caused mismatch
- Changed default league to "Keepers"

**Fixed script injection** (`background.ts` + `manifest.json`):
- Manifest-based content script wasn't loading on programmatically opened tabs
- Removed trade-content from manifest's content_scripts
- Added `"scripting"` permission to manifest
- Manually inject trade-content.js using `chrome.scripting.executeScript()`
- Waits for tab to load completely before injecting
- Added comprehensive error handling

**Enhanced logging**:
- `background.ts` - Tab creation, script injection, message passing
- `trade-content.ts` - Script loading, DOM inspection, data extraction
- All stages now have detailed logs with ✓/✗ indicators

**Fixed window load event issue** (`trade-content.ts`):
- Script was waiting for `window.addEventListener('load')` event
- But page is already loaded when script is injected!
- Changed to trigger extraction immediately via `setTimeout`
- Now scheduled automatically when script loads

**CURRENT STATUS**: Extension built and ready to test. Need to:
1. Remove and re-add extension
2. Click "Check Trade Price"
3. Open DevTools on trade tab immediately
4. Check if DOM selectors find elements
5. If not, inspect actual page HTML and fix selectors

### Architecture Overview

```
User clicks "Check Trade Price"
    ↓
Content Script (content.ts)
    ↓ chrome.runtime.sendMessage({ type: 'GET_TRADE_PRICE', item })
    ↓
Background Worker (background.ts)
    ↓ fetchTradePrice(item)
    ↓
Trade Search Builder (trade-search-builder.ts)
    ↓ buildInscribedUltimatumSearch(item, league) - ✅ FIXED
    ↓ extractUltimatumDetails(item) - ✅ FIXED
    ↓ createTradeSearch(query, league) - ✅ WORKING (returns 200)
    ↓
Opens foreground tab with search URL
    ↓
Waits for tab to load
    ↓
Manually injects trade-content.js - ⚠️ TESTING
    ↓
Trade Content Script (trade-content.ts)
    ↓ Extracts pricing from page
    ↓
Returns data to background → content → UI
```

## Key Files

### 1. `/src/content/content.ts`
- Displays "Check Trade Price" button for Inscribed Ultimatums
- Sends `GET_TRADE_PRICE` message to background worker
- Receives and displays trade pricing data

### 2. `/src/background/background.ts`
- Message handler for `GET_TRADE_PRICE`
- `fetchTradePrice(item)` function - orchestrates the trade search
- Opens **foreground** tab with search results (changed for debugging)
- Waits for tab to fully load (`status === 'complete'`)
- **Manually injects** trade-content.js using `chrome.scripting.executeScript()`
- Listens for `TRADE_DATA_EXTRACTED` message from trade-content script
- 30-second timeout with automatic tab cleanup

### 3. `/src/shared/services/trade-search-builder.ts`
- `buildInscribedUltimatumSearch(item, league)` - Builds search query
- `extractUltimatumDetails(item)` - Extracts ultimatum properties ✅ FIXED
- `createTradeSearch(query, league)` - POSTs to trade API
- `supportsTradeSearch(item)` - Checks if item type is supported

### 4. `/src/content/trade-content.ts`
- **Manually injected** into trade search pages (not via manifest)
- Extracts pricing data from search results using DOM selectors
- Attempts auto-extraction 2 seconds after page load
- Sends `TRADE_DATA_EXTRACTED` message back to background worker
- **Status**: DOM selectors are guesses - need verification against actual page structure

## Data Structure Discoveries

### Inscribed Ultimatum Item Structure
```javascript
// ✅ CORRECT: Data is in properties array
item.properties = [
  { name: "Challenge", values: [["Stand in the Stone Circles", 0]] },
  { name: "Area Level", values: [["83", 0]] },
  { name: "Requires Sacrifice: {0} {1}", values: [["Divine Orb", 18], ["x1", 0]] },
  { name: "Reward: {0}", values: [["Doubles sacrificed Currency", 0]] }
]

// ❌ WRONG: explicitMods only contains difficulty modifiers
item.explicitMods = [
  "Choking Miasma II",
  "Totem of Costly Potency",
  // ...
]
```

### Trade API Response Structure
```javascript
{
  "result": [
    {
      "id": "...",
      "listing": {
        "price": { "amount": 20, "currency": "chaos" },
        "indexed": "2025-11-28T12:32:22Z",
        // ...
      },
      "item": {
        "typeLine": "Inscribed Ultimatum",
        "properties": [...],
        // ...
      }
    }
  ]
}
```

## Recent Fixes

### 2024-11-30 Session 1: Fixed Ultimatum Extraction
**Problem**: Looking for data in `item.explicitMods` (wrong)
**Solution**: Changed to `item.properties` (correct)
**File**: `trade-search-builder.ts:78-138`

**Code Change**:
```typescript
// OLD (wrong)
const mods = item.explicitMods || [];

// NEW (correct)
const properties = item.properties || [];
for (const prop of properties) {
  if (prop.name === 'Challenge') {
    challenge = prop.values?.[0]?.[0] || '';
  }
  // etc...
}
```

### 2024-11-30 Session 2: Fixed Trade API Query Structure
**Problem**: API returning 400 "Invalid query" with `type_filters`
**Solution**: Changed to `ultimatum_filters` based on official trade site URLs
**File**: `trade-search-builder.ts:47-67`

**Code Change**:
```typescript
// OLD (returned 400)
filters: {
  type_filters: {
    filters: {
      category: { option: "map" }
    }
  }
}

// NEW (returns 200)
filters: {
  ultimatum_filters: {
    filters: {
      // Ultimatum-specific filters go here
      // Input/reward filters to be added later
    }
  }
}
```

### 2024-11-30 Session 2: Fixed League Mismatch
**Problem**: Using settings league ("Settlers") instead of item league ("Keepers")
**Solution**: Use `item.league` property from the item data
**File**: `background.ts:217`, also changed defaults

**Code Change**:
```typescript
// OLD
const searchQuery = buildInscribedUltimatumSearch(item, currentLeague);

// NEW
const searchQuery = buildInscribedUltimatumSearch(item, item.league);
```

### 2024-11-30 Session 2: Fixed Content Script Injection (Part 1)
**Problem**: Trade-content script not loading via manifest content_scripts
**Root Cause**: Chrome doesn't reliably inject manifest scripts on programmatically opened tabs
**Solution**: Manual injection using `chrome.scripting.executeScript()`
**Files**: `manifest.json`, `background.ts:248-280`

**Code Change**:
```typescript
// Wait for tab to load
await new Promise<void>((resolve) => {
  const listener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
    if (tabId === tab.id && info.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }
  };
  chrome.tabs.onUpdated.addListener(listener);
});

// Manually inject script
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['trade-content.js']
});
```

### 2024-11-30 Session 2: Fixed Window Load Event (Part 2)
**Problem**: Trade-content script waiting for `window.addEventListener('load')` event
**Root Cause**: Page already loaded when script is manually injected - load event never fires
**Solution**: Trigger extraction immediately via `setTimeout` instead of waiting for event
**File**: `trade-content.ts:159-184`

**Code Change**:
```typescript
// OLD (never triggers - page already loaded)
window.addEventListener('load', () => {
  setTimeout(() => {
    const result = extractTradePricing();
    // ...
  }, 2000);
});

// NEW (triggers immediately)
console.log('[POE Pricer Trade] Triggering auto-extraction...');
setTimeout(() => {
  const result = extractTradePricing();
  if (result) {
    chrome.runtime.sendMessage({
      type: 'TRADE_DATA_EXTRACTED',
      data: result
    });
  }
}, 2000);
```

## Current Debug Strategy

### Logging Status: ✅ Complete
All components now have comprehensive logging:

**Service Worker Console** (`chrome://extensions/` → service worker):
```
[POE Pricer] fetchTradePrice called
[POE Pricer] Item typeLine: Inscribed Ultimatum
[Trade Search] Building search for Inscribed Ultimatum
[Trade Search] Details extracted: {challenge, areaLevel, sacrifice, reward}
[Trade Search] Creating search with query: {...}
[Trade Search] Response status: 200
[Trade Search] Search URL created: https://...
[POE Pricer] Opening background tab...
[POE Pricer] Waiting for tab to load...
[POE Pricer] Tab loaded completely
[POE Pricer] Injecting trade-content script...
[POE Pricer] ✓ Trade-content script injected successfully
[POE Pricer] Waiting for trade content script to extract data...
```

**Trade Page Console** (DevTools on trade search tab):
```
[POE Pricer Trade] ========================================
[POE Pricer Trade] Trade content script loaded
[POE Pricer Trade] Current URL: https://...
[POE Pricer Trade] extractTradePricing() called
[POE Pricer Trade] Testing selector: .resultset .row
[POE Pricer Trade] Found elements: X
```

## Next Steps (IMMEDIATE ACTIONS REQUIRED)

### **RIGHT NOW** - Test DOM Selectors
1. ✅ ~~Fix trade API query structure~~ - DONE (using `ultimatum_filters`)
2. ✅ ~~Fix league mismatch~~ - DONE (uses `item.league`)
3. ✅ ~~Fix script injection~~ - DONE (manual injection)
4. ✅ ~~Fix window load event~~ - DONE (immediate trigger)
5. ⚠️ **TEST NOW**: Verify DOM selectors work
   - Remove and re-add extension from chrome://extensions/
   - Go to stash and click "Check Trade Price"
   - Trade tab opens in foreground
   - **IMMEDIATELY** open DevTools (F12) on that trade tab
   - Look for `[POE Pricer Trade]` logs
   - Check if "Found elements: X" shows non-zero number
6. ❌ **If selectors fail**: Inspect actual POE trade page HTML
   - Right-click on first search result → Inspect
   - Find the actual class names used
   - Update selectors in `trade-content.ts:43` (currently `.resultset .row`)
   - Also update price selector (`.price`), time selector (`.time`), etc.
7. ❌ **Test pricing extraction** - Ensure data is parsed correctly
8. ❌ **Test end-to-end flow** - Button click → price display
9. ❌ **Change tab to background** - Once working, set `active: false` in background.ts:236

### Expected Logs on Trade Page
```
[POE Pricer Trade] ========================================
[POE Pricer Trade] Trade content script loaded
[POE Pricer Trade] Current URL: https://www.pathofexile.com/trade/search/Keepers/...
[POE Pricer Trade] Triggering auto-extraction...
[POE Pricer Trade] document.readyState: complete
[POE Pricer Trade] Waiting 2 seconds for dynamic content...
[POE Pricer Trade] 2 second wait complete, extracting data...
[POE Pricer Trade] extractTradePricing() called
[POE Pricer Trade] Testing selector: .resultset .row
[POE Pricer Trade] Found elements: X  <-- THIS NUMBER IS CRITICAL!
```

If "Found elements: 0" → selectors are wrong, need to inspect actual page

## Trade API Query Structure

### ✅ Working Query Structure
Based on official POE trade site URLs (discovered via web search):

```json
{
  "query": {
    "status": { "option": "online" },
    "type": "Inscribed Ultimatum",
    "stats": [
      {
        "type": "and",
        "filters": [],
        "disabled": false
      }
    ],
    "filters": {
      "ultimatum_filters": {
        "filters": {
          // Future: Add specific filters here
          // "ultimatum_input": { "option": "..." }
          // "ultimatum_reward": { "option": "..." }
        },
        "disabled": false
      }
    }
  },
  "sort": { "price": "asc" }
}
```

**Key Points**:
- Use `ultimatum_filters`, NOT `type_filters`
- Include `stats` array with `type: "and"` structure
- Can add specific input/reward filters later for more precise searches
- Returns 200 status and valid search ID

## Known Limitations & To-Do Items

### Current Limitations
1. **DOM selectors are GUESSES** - `trade-content.ts` uses `.resultset .row`, `.price`, `.time`, `.account`
   - These selectors are NOT verified against actual POE trade site HTML
   - **HIGH PRIORITY**: Test and fix selectors based on actual page structure
2. Divine→Chaos conversion hardcoded to 200c - should fetch from poe.ninja
3. Only supports Inscribed Ultimatums currently
4. Rate limiting not implemented (may be needed if POE has strict limits)
5. Tab opens in foreground (for debugging) - should change to background once working

### DOM Selectors That Need Verification
Located in `trade-content.ts:31-62`:
```typescript
// Line 43 - Main result container (UNVERIFIED)
const resultElements = document.querySelectorAll('.resultset .row');

// Line 44 - Price element (UNVERIFIED)
const priceElement = element.querySelector('.price');

// Line 56 - Time element (UNVERIFIED)
const timeElement = element.querySelector('.time');

// Line 60 - Account element (UNVERIFIED)
const accountElement = element.querySelector('.account');

// Line 98 - Search input (UNVERIFIED)
const searchInput = document.querySelector('input[placeholder*="Search"]');
```

**How to verify**:
1. Open trade search page
2. Right-click on a search result → Inspect
3. Find actual class names in HTML
4. Update selectors in code
5. Rebuild: `npm run build`

## Reference URLs

- Manual trade search example: https://www.pathofexile.com/trade/search/Keepers/5n4LJg0KCa
- Trade API endpoint: `https://www.pathofexile.com/api/trade/search/{league}`
- Trade fetch endpoint: `https://www.pathofexile.com/api/trade/fetch/{ids}?query={searchId}`

## Build Commands

```bash
# Development build with watch
npm run dev

# Production build
npm run build

# Type check
npm run type-check
```

## Testing Checklist

- [x] Extension loads without errors
- [x] "Check Trade Price" button appears on Inscribed Ultimatums
- [x] Clicking button triggers background worker
- [x] Ultimatum details extracted correctly (using `properties` array)
- [x] Trade search API call succeeds (returns 200)
- [x] Background tab opens with search results
- [x] Trade-content script injected successfully
- [ ] **TEST NOW** → Trade-content script logs appear in console
- [ ] **TEST NOW** → DOM selectors find result elements (check "Found elements: X")
- [ ] **TEST NOW** → Pricing data extracted from search page
- [ ] **TEST NOW** → `TRADE_DATA_EXTRACTED` message sent to background
- [ ] **TEST NOW** → Prices display in overlay UI
- [ ] **TEST NOW** → Tab closes automatically after extraction

**BUILD STATUS**: ✅ Extension is built (`npm run build` completed successfully)
**READY TO TEST**: Yes - just remove/re-add extension and test

## Debugging Tips

### Service Worker Console
- Go to `chrome://extensions/`
- Find "POE Stash Pricer"
- Click "service worker" link
- Look for `[POE Pricer]` and `[Trade Search]` logs

### Trade Page Console
- Trade search tab opens in foreground (temporary for debugging)
- Open DevTools (F12) immediately
- Look for `[POE Pricer Trade]` logs
- Check what DOM elements it finds

### Common Issues

**Script not loading:**
- Ensure extension was fully removed and re-added after changes
- Check manifest has `"scripting"` permission
- Verify trade-content.js exists in dist/ folder

**Timeout errors:**
- Check trade page console - script may be loaded but extraction failing
- Verify DOM selectors match actual page structure
- Increase timeout if page loads slowly

---

## Session Summary (2024-11-30)

### What Was Accomplished

**Primary Work: Variant Matching Fixes** ✅
1. Fixed gem variant matching bug (21/0% gems now price correctly)
2. Implemented unique item variant matching (corruption + link count)
3. Cleaned up debug logging and reduced bundle size
4. Updated all documentation
5. Committed and pushed to GitHub

**Secondary Work: Trade Feature Status** ⚠️
- Trade feature code is committed and pushed
- All files present: `trade-content.ts`, `trade-search-builder.ts`
- Extension builds successfully
- **NOT YET TESTED**: DOM selectors need verification on actual POE trade pages

### Files Changed This Session
- `src/shared/services/item-valuator.ts` - Variant matching logic
- `src/content/injected.ts` - TypeScript fix
- `CLAUDE.md` - Documentation update
- `TRADE_FEATURE_CONTEXT.md` - This file

### Next Session: Trade Feature Testing
When you return to work on the trade feature:
1. Reload extension in Chrome (`chrome://extensions/`)
2. Test on actual stash with Inscribed Ultimatums
3. Click "Check Trade Price" button
4. Open DevTools on trade tab to verify DOM selectors
5. Update selectors in `trade-content.ts` if needed
6. Test full end-to-end flow

### Repository State
- Branch: `main`
- Last commits:
  - `09a952f` - feat: Add trade search functionality
  - `0e4d282` - fix: Implement variant matching for gems and unique items
- Clean working directory (except this file)
- Extension build: **v1.0.0** (variant matching fixes included)

---

**Last Updated**: 2024-11-30 (End of variant matching session)
**Next Focus**: Test trade feature DOM selectors
