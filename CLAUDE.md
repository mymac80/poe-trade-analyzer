# CLAUDE.md - POE Stash Pricer Project Context

This file provides comprehensive context for Claude Code when working on this project.

## Project Overview

**POE Stash Pricer** is a browser extension that automatically prices items in Path of Exile stash tabs using real-time market data from poe.ninja.

### The Problem

Path of Exile players accumulate hundreds of items and struggle to identify which ones are valuable enough to sell. Manually price-checking items on poe.ninja or the trade website is tedious and time-consuming.

### The Solution

A Chrome/Edge browser extension that:
- Runs on pathofexile.com profile/character pages
- Extracts item data directly from the page
- Fetches current market prices from poe.ninja
- Displays an overlay showing valuable items sorted by price
- Provides confidence levels, liquidity estimates, and special notes

### CRITICAL: POE Stash Modal Behavior

**IMPORTANT**: Path of Exile does NOT have a dedicated stash page URL. The stash appears as a **modal overlay** on the character/profile pages.

**How it works:**
1. Users navigate to their profile: `https://www.pathofexile.com/account/view-profile/USERNAME/`
2. On the left sidebar, they click a character name
3. Click the "STASH" button to open the stash modal
4. The stash appears as an overlay - the URL **does not change**
5. Users can switch between tabs within the modal

**URL Patterns to Match:**
- `https://www.pathofexile.com/account/view-profile/*` (main pattern)
- `https://www.pathofexile.com/my-account/*` (alternative)
- NOT: `/account/view-stash/*` (this URL doesn't exist!)

**Implications for Extension:**
- Content script must inject on profile pages, not stash URLs
- Must detect when stash modal opens (DOM changes, not URL changes)
- Overlay should appear whenever stash modal is visible
- Can't rely on URL changes to trigger functionality

## Project History & Why We're Using Browser Extension

### Failed Approaches (Archived in `/archive/legacy-cli/`)

We tried **three different approaches** before landing on the browser extension:

#### 1. Direct API Approach with POESESSID Cookie ❌
- **Attempted**: Use POE's official API with session cookie authentication
- **Problem**: Cloudflare bot protection blocked all requests
- **Status**: Never completed - blocked immediately

#### 2. OAuth 2.1 Authentication ⚠️
- **Attempted**: Official OAuth flow to bypass Cloudflare
- **Problem**: Complex user flow, requires local callback server
- **Status**: OAuth client implemented (`legacy-cli/src/api/poe-oauth-client.ts`) but not practical
- **Issues**:
  - Still hits Cloudflare on some endpoints
  - Requires user to visit OAuth URL, copy code, paste back
  - Tokens expire and need refresh

#### 3. Playwright Browser Automation ❌
- **Attempted**: Use Playwright MCP to automate browser interaction
- **Problem**: Heavy resource usage, brittle, hard to maintain
- **Status**: Attempted with screenshots, abandoned
- **Issues**:
  - Requires full browser instance
  - Breaks when POE changes HTML structure
  - Not suitable for user-facing tool

#### 4. Browser Extension ✅ (Current Solution)
- **Why it works**:
  - Runs in user's logged-in browser session (no Cloudflare issues)
  - Direct access to page data and API responses
  - Better UX - inline overlay while viewing stash
  - Reuses 80% of existing valuation code
  - No external dependencies or servers needed

## Current Architecture

### Directory Structure

```
poe-trader/
├── extension/              # ✅ ACTIVE: Browser extension (working implementation)
│   ├── src/
│   │   ├── background/     # Service worker - pricing & market data
│   │   ├── content/        # Content script - page interaction & UI
│   │   ├── popup/          # Extension popup - settings UI
│   │   └── shared/         # Shared code (ported from legacy CLI)
│   │       ├── api/        # poe.ninja API client
│   │       ├── services/   # Item valuation logic
│   │       └── models/     # TypeScript types
│   ├── dist/               # Built extension (load this in Chrome)
│   ├── public/icons/       # Extension icons
│   └── README.md           # Extension-specific documentation
│
├── archive/                # ❌ ARCHIVED: Failed approaches
│   ├── legacy-cli/         # Old CLI-based attempts
│   │   ├── src/            # Original TypeScript code
│   │   └── [docs]          # Original documentation
│   └── README.md           # Why these approaches failed
│
├── .env                    # Environment variables (local only)
├── .env.example            # Environment template
├── LICENSE                 # MIT License
├── README.md               # Main project README
└── CLAUDE.md               # This file - context for Claude
```

### Extension Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Chrome/Edge Browser                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Injected Script (injected.ts) - PAGE CONTEXT               │
│  • Runs in the page's JavaScript context (not isolated)    │
│  • Intercepts XHR/fetch requests made by POE's scripts     │
│  • Captures stash item data from API responses             │
│  • Sends data to content script via postMessage()          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Content Script (content.ts) - EXTENSION CONTEXT            │
│  • Runs on pathofexile.com/account/view-profile/*          │
│  • Injects the page-context script at document_start       │
│  • Receives stash data via window.addEventListener         │
│  • Caches stash data automatically on tab switches         │
│  • Displays overlay UI with pricing results                │
│  • Draggable panel with top 20 valuable items              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Background Service Worker (background.ts)                  │
│  • Fetches market data from poe.ninja (cached 5min)        │
│  • Initializes ItemValuator with market data               │
│  • Receives items from content script                      │
│  • Values each item and returns results                    │
│  • Manages extension settings (chrome.storage)             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Popup UI (popup.html/ts)                                   │
│  • League selection (Settlers, Standard, etc.)              │
│  • Minimum value threshold (default: 5c)                   │
│  • Manual market data refresh button                       │
│  • Usage instructions                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

External APIs:
  └─> poe.ninja API (https://poe.ninja/api/data)
      • Currency prices (with 7-day sparkline data)
      • Unique item prices (with price history)
      • Skill gem prices (with trends)
      • Divination card prices (with trends)
      • Fragment prices (with sparkline)
      • Oil & essence prices (with trends)
```

### Data Flow

```
1. User opens stash on pathofexile.com and switches tabs
        ↓
2. POE's JavaScript makes XHR/fetch call to get stash items
        ↓
3. Injected script (running in page context) intercepts the call
        ↓
4. Injected script sends items to content script via postMessage()
        ↓
5. Content script caches the items automatically
        ↓
6. User clicks "Analyze" button
        ↓
7. Content script uses cached items (instant, no waiting!)
        ↓
8. Sends items to background worker via chrome.runtime.sendMessage()
        ↓
9. Background worker:
   a. Checks if market data is cached (5min TTL)
   b. If not cached, fetches from poe.ninja (all categories in parallel)
   c. Initializes ItemValuator with market data
   d. Values each item using ItemValuator.valueItem()
   e. Filters items below minimum value threshold
   f. Sorts by value (highest first)
        ↓
10. Returns valued items to content script
        ↓
11. Content script displays overlay:
    • Total value (chaos & divine)
    • Top 20 items with:
      - Name, value, confidence, liquidity
      - 7-day price trend (percentage change with color-coded icon)
      - Special notes (6-link, gem level, etc.)
```

## CRITICAL: Chrome Extension Isolated World Problem

### The Problem

**Content scripts run in an "isolated world"** - they can see the DOM but have a completely separate JavaScript execution context from the page's own scripts. This causes a fundamental problem when trying to intercept network requests:

- When you override `XMLHttpRequest` or `window.fetch` in a content script, you only override them in the **extension's context**
- The page's own JavaScript still uses the **page's context**
- POE's scripts make API calls using their `window.fetch`, not yours
- **Result**: Your interceptors never fire!

### The Solution: Injected Script

We use a **two-script approach**:

#### 1. Injected Script (`injected.ts`)
- Runs in the **page's context** (not the extension's isolated world)
- Intercepts XHR/fetch calls made by POE's own scripts
- Uses `window.postMessage()` to send data across the context boundary
- Must be injected at `document_start` before POE's scripts load

```typescript
// In content script - inject into page context
function injectPageScript(): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function() {
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Run IMMEDIATELY at document_start
injectPageScript();
```

#### 2. Content Script (`content.ts`)
- Runs in the **extension's context** (isolated world)
- Listens for `postMessage` events from the injected script
- Automatically caches stash data whenever tabs are switched
- Provides UI and communicates with background worker

```typescript
// Listen for data from injected script
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;

  if (event.data.type === 'POE_PRICER_STASH_DATA') {
    cachedStashItems = event.data.items || [];
  }
});
```

### Communication Flow

```
Page Context (POE's scripts)
  └─> Makes XHR/fetch to get stash items
       └─> Injected script intercepts
            └─> window.postMessage()
                 └─> [CROSSES ISOLATED WORLD BOUNDARY]
                      └─> Content script receives via addEventListener
                           └─> Caches data
                                └─> Available for instant analysis
```

### Key Learnings

1. **Manifest must use `run_at: "document_start"`** - Inject before POE's scripts load
2. **Injected script must be in `web_accessible_resources`** - Required for `chrome.runtime.getURL()`
3. **Use `postMessage()`, not custom events** - Custom events don't cross the isolated world boundary
4. **Cache the data** - Don't wait for the next API call, use the most recent data
5. **Validate message source** - Always check `event.source === window` for security

### Why This Approach Works

- ✅ Injected script runs before POE's scripts, so interceptors are installed first
- ✅ Interception happens in the same context as POE's API calls
- ✅ `postMessage()` successfully crosses the isolated world boundary
- ✅ Content script can access both page data and Chrome extension APIs
- ✅ Automatic caching means instant analysis (no waiting for next API call)

## Core Components

### 1. PoeNinjaClient (`shared/api/poe-ninja-api.ts`)

Fetches market data from poe.ninja API:
- **Methods**:
  - `getCurrencyPrices()` - Currency & fragments
  - `getScarabPrices()` - Scarabs (tries multiple endpoints/categories)
  - `getUniqueItemPrices()` - All unique item categories
  - `getSkillGemPrices()` - Skill gems with level/quality
  - `getDivinationCardPrices()` - Divination cards
  - `getOilPrices()` & `getEssencePrices()` - Oils & essences
  - `fetchAllMarketData()` - Fetch everything in parallel

- **Features**:
  - 5-minute in-memory cache
  - Automatic retries on failure
  - Combines multiple API calls (e.g., all unique categories)
  - Multi-endpoint fallback for scarabs (currencyoverview → itemoverview → alternative categories)

### 2. ItemValuator (`shared/services/item-valuator.ts`)

Values POE items based on market data:
- **Methods**:
  - `valueItem(item: Item): ValuedItem | null` - Main valuation function

- **Supports**:
  - Frame types: Unique, Gem, Currency, Divination Card, Rare/Magic/Normal
  - Special detection:
    - 6-link items (minimum 10c value)
    - Gem level & quality (21/20, 21/23 gems)
    - Corruption implicits
    - Influenced bases (Shaper, Elder, etc.)
    - Stack sizes for currency/cards
    - **Inscribed Ultimatums** (heuristic-based valuation)

- **Variant Matching** (Added 2024-11-30):
  - **Gems**: Stores multiple variants per gem (different level/quality/corruption combinations)
    - Matches based on: gem level (+10 points), quality (+10 points), corruption (+5 points)
    - **Tiebreaker**: When scores are equal, selects variant with closest quality match
    - Example: Level 21/0% corrupted gem correctly matches 21/0 variant, not 21/23
  - **Unique Items**: Stores multiple variants per unique (corrupted/non-corrupted, 6-link/non-6-link)
    - Matches based on: corruption status (+10 points), link count (+10 points)
    - **Tiebreaker**: When scores are equal, selects variant with closest link count
    - Example: 6-link corrupted unique correctly matches 6-link corrupted variant, not base variant

- **Inscribed Ultimatum Support** (Added 2024-11-30):
  - **Why needed**: poe.ninja does NOT track Inscribed Ultimatums in their API
  - **Detection**: Checks `typeLine` for "Inscribed Ultimatum"
  - **Valuation method**: Heuristic-based (not market data)
  - **How it works**:
    - Extracts sacrifice type (Divine Orb, Exalted Orb, Chaos Orb, etc.)
    - Extracts reward multiplier (doubles, triples, etc.)
    - Calculates potential reward value (sacrifice × multiplier × current price)
    - Applies discount factor (65-70%) to account for ~20% failure risk
    - Adds 10% bonus for high-tier ultimatums (Area Level 83+)
  - **Examples**:
    - Divine Orb x1 → 2 Divine (doubles): ~130c (65% of 2 Divine @ 200c each)
    - Exalted Orb x3 → 9 Exalted (triples): ~175c (65% of 9 Ex @ 30c each)
    - Chaos Orb x50 → 150 Chaos (triples): ~105c (70% of 150c)
  - **Confidence**: Always "Medium" (heuristic estimate, not poe.ninja data)
  - **Special notes**: Includes sacrifice/reward details, failure risk warning, "Check trade site for exact pricing"
  - **Limitation**: Less accurate than poe.ninja-based prices, but better than missing valuable items entirely

- **Inscribed Ultimatum Trade Search** (Added 2024-12-01):
  - **Feature**: "Check Trade Price" button on Inscribed Ultimatums opens POE trade site with filters
  - **Why needed**: Heuristic pricing is estimates only; users need to check actual market prices
  - **Implementation**: Uses POE's official trade API (`/api/trade/search/{league}`)
  - **Three-Filter System**:
    1. `ultimatum_input` - Sacrifice item (e.g., "The Harvest", "Orb of Annulment")
    2. `ultimatum_reward` - Reward TYPE (e.g., "ExchangeUnique", "DoubleCurrency")
    3. `ultimatum_output` - Output item (e.g., "Winterweave") - only for unique exchanges
  - **Reward Type Detection** (automatic):
    - "Doubles sacrificed Currency" → `DoubleCurrency` (no output filter)
    - "Triples sacrificed Currency" → `TripleCurrency` (no output filter)
    - "Doubles Divination Cards" → `DoubleDivCards` (no output filter)
    - "Triples Divination Cards" → `TripleDivCards` (no output filter)
    - "Mirror" in text → `MirrorRare` (no output filter)
    - Unique item name → `ExchangeUnique` (includes output filter)
  - **Smart Output Filtering**:
    - Currency/card doubling: Output filter omitted (reward text isn't an item name)
    - Unique exchange: Output filter included (specific item like "Winterweave")
  - **0 Results Handling**:
    - Opens trade tab for 5 seconds so user can see "0 results"
    - Auto-closes tab to avoid clutter
    - Button shows "No results" (orange) vs "Error" (red) for actual failures
  - **Status Filter**: Uses `"available"` (not `"online"`) to match POE trade site behavior
  - **User Flow**:
    1. User clicks "Check Trade Price" on an Inscribed Ultimatum
    2. Extension creates trade search with all applicable filters
    3. If results > 0: Opens tab and scrapes pricing data (shows in overlay)
    4. If results = 0: Opens tab for 5s, auto-closes, shows "No results" button
    5. If error: Shows "Error" button (red) with console logs
  - **Files**:
    - `shared/services/trade-search-builder.ts` - Build query and detect reward types
    - `background/background.ts` - Create search via API, handle 0 results
    - `content/content.ts` - Button UI and state management

- **Scarab Support** (Fixed 2024-11-30):
  - **Challenge**: Scarabs have `frameType: 0` (Normal), not `frameType: 5` (Currency)
  - **Solution 1 - API Fetching**: `getScarabPrices()` tries multiple endpoints:
    1. `/currencyoverview?type=Scarab` (older leagues)
    2. `/itemoverview?type=Scarab` (current league - Keepers uses this)
    3. Alternative categories: Artifact, Memory, Misc (fallback for edge cases)
  - **Solution 2 - Valuation Logic**:
    - Added scarabs to `isWorthlessItem()` exclusion list (they were being filtered out!)
    - frameType 0/1/2 items now check `valueCurrency()` BEFORE checking `valueRareItem()`
    - This allows scarabs, fragments, oils, and essences to be valued correctly
  - **Result**: All scarabs now price correctly, including high-value ones like:
    - Horned Scarab of Pandemonium: ~150c
    - Ultimatum Scarab of Catalysing: ~195c
    - Breach Scarab of Lordship: ~869c (86923c was a poe.ninja display bug)

- **Price Trend Support** (Added 2024-12-01):
  - **Feature**: Display 7-day price trend for items with market data
  - **Data Source**: poe.ninja API provides sparkline data (historical price points) and totalChange (percentage)
  - **Implementation**:
    - Changed storage from simple `number` to full `PoeNinjaCurrencyLine` objects to preserve sparkline data
    - All valuation methods extract and return `priceHistory` with sparkline data
    - Currency items use `lowConfidencePaySparkLine` or `lowConfidenceReceiveSparkLine`
    - Unique items and gems use `sparkline` or `lowConfidenceSparkline`
    - Divination cards also include sparkline data
  - **UI Display**:
    - Shows color-coded trend indicator: 📈 (green, rising), 📉 (red, falling), ➡️ (gray, stable)
    - Format: `📈 +22.0% (7 days)` or `📉 -5.3% (7 days)`
    - Appears below confidence/liquidity row in item overlay
  - **Coverage**:
    - ✅ Currency (Divine, Exalted, etc.)
    - ✅ Fragments & Scarabs
    - ✅ Unique items
    - ✅ Skill gems
    - ✅ Divination cards
    - ✅ Oils & essences
    - ❌ Inscribed Ultimatums (no market data - heuristic valuation only)
    - ❌ Rare/Magic items (no individual market tracking)
  - **Example**:
    ```
    Divine Orb                               200c
    high confidence   instant
    📈 +2.0% (7 days)
    ```

- **Returns**:
  - `estimatedValue` - Price in chaos orbs
  - `divineValue` - Price in divine orbs
  - `confidence` - High/Medium/Low
  - `reasoning` - Explanation of price
  - `liquidityEstimate` - instant/hours/days/slow
  - `specialNotes` - Array of special attributes
  - `priceHistory` - Optional 7-day price trend data (sparkline array + totalChange percentage)

### 3. Content Script (`content/content.ts`)

Runs on POE stash pages:
- **Item Extraction**:
  - Method 1: Intercept `fetch()` requests to POE API
  - Method 2: Search `window` object for React component data
  - Fallback: Wait for API call and capture via event listener

- **UI Components**:
  - Draggable overlay panel
  - "Analyze" button to trigger pricing
  - Results display with color-coded confidence
  - Liquidity indicators (⚡🕐📅🐌)

### 4. Background Worker (`background/background.ts`)

Service worker that:
- Initializes on extension install
- Loads settings from `chrome.storage.local`
- Maintains `ItemValuator` instance
- Handles messages from content script
- Caches market data with 5-minute TTL

## Important Implementation Details

### Item Extraction Strategy

The extension uses **automatic caching** to capture stash items:

1. **Injected Script XHR/Fetch Interception** (Primary):
   - Injected script runs in page context and intercepts POE's API calls
   - Captures stash data from `/character-window/get-stash-items` endpoint
   - Sends data to content script via `postMessage()`
   - Happens automatically whenever user switches stash tabs

   ```typescript
   // In injected.ts (page context)
   XMLHttpRequest.prototype.send = function(...args) {
     const url = (this as any)._url || '';

     if (url.includes('/character-window/get-stash-items')) {
       this.addEventListener('load', function() {
         const data = JSON.parse(this.responseText);
         if (data.items) {
           window.postMessage({
             type: 'POE_PRICER_STASH_DATA',
             items: data.items
           }, '*');
         }
       });
     }

     return originalSend.apply(this, args);
   };
   ```

2. **Automatic Caching** (Content Script):
   - Content script maintains a cache of the most recent stash data
   - Updates automatically whenever user switches tabs
   - When "Analyze" is clicked, uses cached data instantly (no waiting!)

   ```typescript
   // In content.ts (extension context)
   window.addEventListener('message', (event: MessageEvent) => {
     if (event.source !== window) return;

     if (event.data.type === 'POE_PRICER_STASH_DATA') {
       cachedStashItems = event.data.items || [];
     }
   });
   ```

3. **React Data Extraction** (Fallback):
   - If no cached data and user clicks "Analyze", tries to extract from React components
   - Searches `window` object for React data structures
   - Rarely used since automatic caching works reliably

**Why this approach?**
- ✅ User doesn't have to wait - data is already cached
- ✅ Switching tabs automatically updates the cache
- ✅ Analysis is instant (uses cached data)
- ✅ Injected script in page context can intercept POE's requests
- ✅ Automatic and transparent to the user

### Market Data Caching

```typescript
private cache: Map<string, { data: any; timestamp: number }>;
private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check cache before fetching
if (cached && now - cached.timestamp < this.CACHE_TTL) {
  return cached.data;
}
```

**Why 5 minutes?**
- POE.ninja updates every ~5 minutes
- Reduces API load
- Balance between freshness and performance

### Valuation Confidence Levels

- **High**: Exact match in poe.ninja data
  - Unique items with matching name & base
  - Currency with exact match
  - Gems with matching level/quality

- **Medium**: Partial match or heuristic
  - Gems with approximate level/quality
  - Uniques not in database (1c estimate)
  - **Inscribed Ultimatums** (heuristic-based valuation, not poe.ninja data)

- **Low**: Estimation or rare item
  - Influenced bases (5c estimate)
  - Very niche items

## User Configuration

Settings stored in `chrome.storage.local`:

```typescript
interface Settings {
  league: string;          // Default: "Settlers"
  minValueChaos: number;   // Default: 5
}
```

Available leagues (must match poe.ninja):
- Settlers
- Standard
- Hardcore
- Hardcore Settlers
- (New leagues added each POE season)

## Development Workflow

### Building the Extension

```bash
cd extension
npm install          # Install dependencies
npm run build        # Production build
npm run dev          # Watch mode (auto-rebuild)
npm run type-check   # TypeScript validation
```

### Loading in Browser

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extension/dist/` directory

### Testing

1. Build extension
2. Load in Chrome
3. Visit https://www.pathofexile.com
4. Log in to your account
5. Navigate to stash (`/account/view-stash/...`)
6. Click "Analyze" button in overlay
7. Check browser console for `[POE Pricer]` logs

### Debugging

Open DevTools (F12):
- **Console**: Look for `[POE Pricer]` prefixed messages
- **Network**: Check poe.ninja API calls
- **Application → Storage**: Check `chrome.storage.local` for settings

Common issues:
- Items not extracted → Check if URL matches content script pattern
- No prices → Check if market data loaded (click "Refresh Market Data")
- Wrong league → Verify league setting matches your account

## Code Style & Patterns

### TypeScript Patterns

```typescript
// Prefer explicit return types
async function valueItems(items: Item[]): Promise<ValuedItem[]> { }

// Use proper error handling
try {
  const result = await fetchData();
} catch (error) {
  console.error('[POE Pricer] Error:', error);
  // Return fallback or rethrow
}

// Null checks for optional data
if (!marketData) {
  return null;
}
```

### Chrome Extension Patterns

```typescript
// Message passing (content → background)
chrome.runtime.sendMessage(
  { type: 'VALUE_ITEMS', items },
  (response) => {
    if (response.success) {
      // Handle result
    }
  }
);

// Message handling (background)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'VALUE_ITEMS') {
    valueItems(request.items)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error }));
    return true; // Keep channel open for async response
  }
});

// Storage
await chrome.storage.local.set({ key: value });
chrome.storage.local.get(['key'], (result) => {
  console.log(result.key);
});
```

### Console Logging

All logs prefixed with `[POE Pricer]` for easy filtering:
```typescript
console.log('[POE Pricer] Initializing...');
console.error('[POE Pricer] Error:', error);
```

## Future Enhancement Ideas

### High Priority
- [ ] Proper extension icons (currently using placeholders)
- [ ] Better error messages when extraction fails
- [ ] Export results to clipboard/CSV

### Medium Priority
- [x] Support for Inscribed Ultimatums (added heuristic valuation + trade search integration)
- [x] Scarab support (fixed pricing and detection)
- [ ] Support for more item types (maps, fossils, etc.)
- [ ] Price history / trending indicators
- [ ] Bulk listing price suggestions
- [ ] Settings for highlighting thresholds

### Low Priority
- [ ] Firefox support (requires Manifest V2 compatibility)
- [ ] Trade macro integration
- [ ] Sound notifications for high-value drops
- [ ] Automatic tab sorting by value

## Known Limitations

### Technical
1. **Stash data extraction may break**:
   - If POE changes API endpoints
   - If React component structure changes
   - Mitigation: Multiple extraction methods

2. **Pricing accuracy**:
   - Relies on poe.ninja data quality
   - Rare/niche items may have inaccurate prices
   - Prices are estimates, not guarantees
   - **Inscribed Ultimatums use heuristic pricing** (not tracked by poe.ninja)
     - Based on sacrifice value × multiplier × discount factor
     - Less accurate than market-based prices
     - Users should verify on trade site for exact prices

3. **League support**:
   - Only leagues on poe.ninja are supported
   - Brand new leagues may not have data yet

### User Experience
1. **First analysis is slow** (10-15 seconds):
   - Must fetch all market data from poe.ninja
   - Subsequent analyses are instant (cache)

2. **Must be logged in**:
   - Extension needs user session to access stash
   - Won't work on public profile pages

3. **Chrome/Edge only**:
   - Manifest V3 (Firefox has limited support)

## Dependencies

### Extension Dependencies
```json
{
  "dependencies": {
    "axios": "^1.6.2"  // HTTP client for poe.ninja API
  },
  "devDependencies": {
    "@types/chrome": "^0.0.256",  // Chrome extension types
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",              // Bundler
    "vite-plugin-static-copy": "^1.0.0"  // Copy manifest & assets
  }
}
```

### External APIs
- **poe.ninja API**: `https://poe.ninja/api/data`
  - No authentication required
  - Rate limits: ~1 req/second (we cache to stay well below)
  - Free for personal use

## Environment Variables

`.env` file (not committed to git):
```bash
# Legacy CLI settings (archived, not used by extension)
LEGACY_POE_ACCOUNT_NAME=your-account
LEGACY_LEAGUE=Settlers
```

Extension settings stored in `chrome.storage.local`, not environment variables.

## Git Workflow

### Branching Strategy
- `main` - Stable releases
- `dev` - Active development
- `feature/*` - New features
- `fix/*` - Bug fixes

### Commit Messages
Follow atomic commit principles:
```
feat: Add currency stack detection
fix: Handle missing gem quality property
refactor: Extract item formatting to utility
docs: Update installation instructions
```

## Testing Strategy

### Manual Testing Checklist
- [ ] Extension loads without errors
- [ ] Settings save and persist
- [ ] Market data fetches successfully
- [ ] Items extract from stash page
- [ ] Valuation runs without errors
- [ ] UI displays correctly
- [ ] Overlay is draggable
- [ ] Different item types are recognized
- [ ] Edge cases (empty stash, all low-value items)

### Test Cases
1. **Empty stash tab** → "No items found"
2. **All low-value items** → "No valuable items found"
3. **High-value items** → Show sorted list with correct prices
4. **Mixed item types** → All types detected correctly
5. **6-link item** → "6-LINK" note appears
6. **21/23 gem** → "PERFECT 21/23" note appears
7. **Wrong league** → Prices should be wrong (verify with known item)

## Support & Troubleshooting

### Common User Questions

**Q: Extension not showing on stash page?**
A: Check URL matches `/account/view-stash/*`. Try refreshing page.

**Q: Items not being priced?**
A: Check minimum value threshold in settings. Verify correct league selected.

**Q: Prices seem wrong?**
A: Verify league setting. Click "Refresh Market Data". Check poe.ninja for current prices.

**Q: Extension slowing down browser?**
A: Market data fetches once per 5 minutes. Disable extension when not trading.

### Debug Steps
1. Open DevTools console
2. Look for `[POE Pricer]` messages
3. Check for JavaScript errors
4. Verify `chrome.storage.local` has correct settings
5. Try "Refresh Market Data" in popup

## Contact & Contributions

This is a personal project. If extending:
1. Test thoroughly on multiple stash tabs
2. Maintain TypeScript types
3. Add console logging with `[POE Pricer]` prefix
4. Update this CLAUDE.md with significant changes

## Important Notes for Claude

When working on this project:

1. **Always use the extension code** (`/extension/`), not archived CLI code
2. **Maintain the dual extraction methods** - POE website may change
3. **Keep cache TTL at 5 minutes** - balance freshness vs. API load
4. **Prefix all logs with** `[POE Pricer]` for debugging
5. **Test in Chrome** before considering done
6. **Update manifest version** when making breaking changes
7. **Reuse existing valuation logic** - it's well-tested and accurate
8. **Variant matching is critical** - Gems and Uniques have multiple poe.ninja variants; always use scoring + tiebreaker logic
9. **Trade search uses 3 filters** - For Inscribed Ultimatums: input (sacrifice), reward (type), output (item name, conditional)
10. **Reward type detection is keyword-based** - Looks for "double", "triple", "mirror" in reward text to determine filter codes

### When POE Changes Break the Extension

If POE updates break extraction:
1. Check browser console for errors
2. Inspect POE's Network tab for API endpoint changes
3. Check window object for new React data structure
4. Update extraction methods in `content.ts`
5. Test with multiple stash tabs

### When poe.ninja Changes

If poe.ninja API changes:
1. Check `poe-ninja-api.ts` fetch calls
2. Verify response structure matches types
3. Update types in `models/types.ts` if needed
4. Test all item categories

### When POE Trade API Changes

If POE's trade API changes (affects Inscribed Ultimatum searches):
1. Check `trade-search-builder.ts` for filter structure
2. Monitor browser console for API errors (400/404 responses)
3. Inspect working trade searches on pathofexile.com/trade for correct filter codes
4. Test reward type detection with all ultimatum categories:
   - Currency doubling/tripling
   - Divination card doubling/tripling
   - Unique item exchanges
   - Mirror rare items
5. Verify `ultimatum_input`, `ultimatum_reward`, and `ultimatum_output` filter names
6. Update reward type codes if POE changes them (e.g., "DoubleCurrency" → "Currency")

---

**Last Updated**: 2024-12-01
**Extension Version**: 1.0.0
**POE Version**: Tested on Settlers League
