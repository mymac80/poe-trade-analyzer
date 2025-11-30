# POE Stash Pricer - Browser Extension

A browser extension that automatically prices items in your Path of Exile stash tabs using real-time market data from poe.ninja.

## Features

- Real-time item pricing from poe.ninja
- Support for:
  - Unique items
  - Skill gems (with level/quality detection)
  - Currency and fragments
  - Divination cards
  - Oils and essences
- 6-link detection
- Special mod recognition
- Liquidity estimates for faster trading
- Configurable minimum value threshold
- Multi-league support

## Installation

### Chrome/Edge

1. **Build the extension** (if not already built):
   ```bash
   cd extension
   npm install
   npm run build
   ```

2. **Load the extension in Chrome/Edge**:
   - Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `extension/dist` directory

3. **Verify installation**:
   - You should see "POE Stash Pricer" in your extensions list
   - The extension icon should appear in your toolbar

## Usage

### First Time Setup

1. Click the extension icon in your toolbar
2. Configure your settings:
   - **League**: Select your current league (Settlers, Standard, etc.)
   - **Minimum Value**: Set the minimum chaos value to display (default: 5c)
3. Click "Save Settings"

### Pricing Your Stash

1. Log in to [pathofexile.com](https://www.pathofexile.com)
2. Navigate to your profile and open your stash
3. **Switch to any stash tab** you want to analyze (this automatically caches the items)
4. Click the "Analyze" button in the overlay panel
5. View your valuable items sorted by price instantly!

The extension will:
- **Automatically cache** items whenever you switch stash tabs
- Fetch current market prices from poe.ninja (cached for 5 minutes)
- Calculate estimated values
- Display items above your minimum value threshold
- Show total value and top 20 most valuable items
- Analysis is **instant** - no waiting!

### Understanding the Results

Each item shows:
- **Name**: Item name or type
- **Value**: Estimated value in Chaos Orbs
- **Confidence**: High/Medium/Low (based on market data accuracy)
- **Liquidity**: How quickly the item typically sells
  - ⚡ Instant (currency, high-value items)
  - ⏱ Hours (meta items)
  - 📅 Days (niche items)
  - 🐌 Slow (rare/unpopular items)
- **Special Notes**: 6-link, corruption, gem level, etc.

## Development

### Project Structure

```
extension/
├── src/
│   ├── background/         # Service worker (pricing logic)
│   │   └── background.ts
│   ├── content/            # Content script (page interaction & UI)
│   │   ├── content.ts      # Extension context - UI and caching
│   │   ├── injected.ts     # Page context - API interception
│   │   └── content.css
│   ├── popup/              # Extension popup (settings)
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   └── shared/             # Shared code (ported from CLI)
│       ├── api/            # poe.ninja API client
│       ├── services/       # Item valuation logic
│       └── models/         # TypeScript types
├── public/
│   └── icons/              # Extension icons
├── dist/                   # Built extension (created by npm run build)
├── manifest.json           # Extension manifest
├── vite.config.ts          # Vite bundler configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies

```

### Build Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Build in watch mode (auto-rebuild on changes)
npm run dev

# Type check (no emit)
npm run type-check
```

### Tech Stack

- **TypeScript**: Type-safe code
- **Vite**: Fast bundler for extension scripts
- **Axios**: HTTP client for poe.ninja API
- **Chrome Extension API**: Manifest V3

## How It Works

### Architecture

1. **Injected Script** (`injected.ts`) - **Page Context**:
   - Runs in the page's JavaScript context (not isolated)
   - Intercepts XHR/fetch requests made by POE's own scripts
   - Captures stash item data from API responses
   - Sends data to content script via `postMessage()`
   - Injected at `document_start` before POE's scripts load

2. **Content Script** (`content.ts`) - **Extension Context**:
   - Runs on pathofexile.com/account/view-profile/* pages
   - Injects the page-context script
   - Receives and caches stash data automatically
   - Displays overlay UI with pricing results
   - Sends items to background worker for valuation

3. **Background Service Worker** (`background.ts`):
   - Fetches market data from poe.ninja
   - Caches market data (5-minute TTL)
   - Performs item valuation using ItemValuator
   - Manages extension settings

4. **Popup UI** (`popup.html/ts`):
   - User settings configuration
   - Manual market data refresh
   - Usage instructions

**Key Technical Detail**: Chrome extension content scripts run in an "isolated world" and cannot intercept the page's network requests. We solve this by injecting a script into the page's context, which can intercept POE's API calls. The injected script communicates with the content script via `window.postMessage()`.

### Data Flow

```
User Opens Stash & Switches Tabs
       ↓
POE's JavaScript Makes API Call
       ↓
Injected Script Intercepts Call (page context)
       ↓
Sends Items via postMessage()
       ↓
Content Script Caches Items (automatic)
       ↓
User Clicks "Analyze"
       ↓
Content Script Uses Cached Items (instant!)
       ↓
Sends Items to Background Worker
       ↓
Background Fetches poe.ninja Data (cached 5min)
       ↓
Background Values Each Item
       ↓
Sends Results to Content Script
       ↓
Content Script Displays Overlay
```

## Troubleshooting

### Extension Not Working

1. **Check if you're on the correct page**:
   - URL must be `https://www.pathofexile.com/account/view-profile/*`
   - Must be logged in
   - Open your stash modal (not just the profile page)

2. **Refresh the page**:
   - Sometimes the content script doesn't inject properly
   - Hard refresh with Ctrl+Shift+R (or Cmd+Shift+R on Mac)

3. **Check the console**:
   - Open DevTools (F12)
   - Look for `[POE Pricer]` messages
   - Check for any error messages

4. **Verify market data is loaded**:
   - Click extension icon → "Refresh Market Data"
   - Wait 5-10 seconds for data to load

### Items Not Being Priced

1. **Check minimum value threshold**:
   - Items below your threshold won't show
   - Lower the threshold in settings

2. **Verify league setting**:
   - Make sure you selected the correct league
   - Market prices vary between leagues

3. **Some items may not have market data**:
   - Very rare or league-specific items may not be on poe.ninja

### Performance Issues

- The extension caches market data for 5 minutes
- First analysis may take 10-15 seconds (fetching market data from poe.ninja)
- Subsequent analyses are **instant** (using cached market data and stash items)
- **Tip**: Switch to a stash tab first, then click Analyze for instant results

## Known Limitations

1. **Stash Data Extraction**:
   - Relies on intercepting POE's API calls to `/character-window/get-stash-items`
   - May not work if POE changes their API endpoint
   - Requires switching stash tabs to trigger data caching

2. **Pricing Accuracy**:
   - Prices are estimates based on poe.ninja market data
   - Actual sale prices may vary
   - Rare/niche items may have inaccurate pricing

3. **League Support**:
   - Only leagues available on poe.ninja are supported
   - Very new or temporary leagues may not have data

## Future Enhancements

- [ ] Add proper extension icons
- [ ] Support for more item types (maps, fossils, etc.)
- [ ] Export results to CSV
- [ ] Price history graphs
- [ ] Bulk listing suggestions
- [ ] Trade macro integration
- [ ] Firefox support

## Credits

- Market data from [poe.ninja](https://poe.ninja)
- Built for Path of Exile by Grinding Gear Games

## License

MIT License - See LICENSE file for details

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Open DevTools console and look for error messages
3. Report issues with console logs included

---

**Note**: This extension is not affiliated with or endorsed by Grinding Gear Games or poe.ninja.
