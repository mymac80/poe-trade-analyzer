# POE Stash Pricer

> Automatically price items in your Path of Exile stash tabs using real-time market data from poe.ninja

![POE Version](https://img.shields.io/badge/POE-Settlers%20League-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green)

## What is this?

A **Chrome/Edge browser extension** that helps Path of Exile players quickly identify valuable items in their stash tabs. Stop manually price-checking items - let the extension do it for you!

### Features

- 🔥 **Real-time pricing** from poe.ninja market data
- 💎 **Smart item detection** - uniques, gems, currency, divination cards, and more
- 🎯 **6-link detection** and special mod recognition
- ⚡ **Liquidity estimates** to help you sell faster
- 🎨 **Beautiful overlay** that appears on your stash page
- ⚙️ **Configurable** - set your league and minimum value threshold
- 🚀 **Fast** - market data cached for instant results

### Screenshot

```
┌─────────────────┬──────────────────────────┐
│  POE Stash      │  Your Stash Tab          │
│  Pricer         │                          │
│                 │                          │
│  Total: 450c    │  [Items displayed]       │
│                 │                          │
│  Top Items:     │                          │
│  ━━━━━━━━━━━    │                          │
│  Mageblood      │                          │
│  250c ⚡         │                          │
│                 │                          │
│  Headhunter     │                          │
│  120c ⏱         │                          │
│                 │                          │
│  21/20 Gem      │                          │
│  45c 📅         │                          │
└─────────────────┴──────────────────────────┘
```

## Quick Start

### Installation

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/yourusername/poe-trader.git
   cd poe-trader/extension
   ```

2. **Install dependencies and build**
   ```bash
   npm install
   npm run build
   ```

3. **Load extension in Chrome/Edge**
   - Navigate to `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `extension/dist` directory

4. **Configure settings**
   - Click the extension icon in your toolbar
   - Select your league (Settlers, Standard, etc.)
   - Set minimum value threshold (default: 5c)
   - Click "Save Settings"

### Usage

1. Log in to [pathofexile.com](https://www.pathofexile.com)
2. Navigate to your stash tabs
3. Click the **"Analyze"** button in the overlay
4. View your valuable items instantly!

## Why Browser Extension?

We tried several approaches before landing on the browser extension:

| Approach | Status | Problem |
|----------|--------|---------|
| Direct API | ❌ Failed | Cloudflare bot protection |
| OAuth 2.1 | ⚠️ Partial | Complex flow, still has issues |
| Playwright | ❌ Failed | Heavy, brittle, impractical |
| **Browser Extension** | ✅ **Works!** | **Uses your browser session** |

The browser extension works because:
- Runs in your logged-in browser (no auth issues)
- Direct access to stash data
- Better UX with inline overlay
- No external servers needed

See [`archive/`](./archive/README.md) for details on failed approaches.

## Project Structure

```
poe-trader/
├── extension/              # ✅ Browser extension (active)
│   ├── src/
│   │   ├── background/     # Service worker - pricing logic
│   │   ├── content/        # Content script - page UI
│   │   ├── popup/          # Settings popup
│   │   └── shared/         # Reusable code
│   ├── dist/               # Built extension
│   └── README.md           # Extension documentation
│
├── archive/                # ❌ Archived failed approaches
│   └── legacy-cli/         # Old CLI attempts
│
├── CLAUDE.md               # Complete project context for AI
├── README.md               # This file
└── LICENSE                 # MIT License
```

## Documentation

- **[Extension README](./extension/README.md)** - Detailed installation and usage
- **[CLAUDE.md](./CLAUDE.md)** - Complete technical documentation
- **[Archive](./archive/README.md)** - Why other approaches failed

## How It Works

```
1. Content Script intercepts POE's stash API call
        ↓
2. Extracts item data from response
        ↓
3. Sends to Background Worker
        ↓
4. Worker fetches poe.ninja prices (cached 5min)
        ↓
5. Values each item
        ↓
6. Returns results to Content Script
        ↓
7. Displays overlay with top valuable items
```

### Supported Item Types

- ✅ Unique items (all slots)
- ✅ Skill gems (level/quality detection)
- ✅ Currency & fragments
- ✅ Divination cards
- ✅ Oils & essences
- ✅ 6-linked items
- ✅ Influenced bases

### Pricing Confidence

- **High**: Exact match in poe.ninja data
- **Medium**: Approximate match or heuristic
- **Low**: Estimation for rare items

### Liquidity Indicators

- ⚡ **Instant**: High-demand items (Divine Orbs, meta uniques)
- ⏱ **Hours**: Popular items (good uniques, 21/20 gems)
- 📅 **Days**: Niche items
- 🐌 **Slow**: Rare or unpopular items

## Development

### Building

```bash
cd extension
npm install          # Install dependencies
npm run build        # Production build
npm run dev          # Watch mode
npm run type-check   # TypeScript validation
```

### Tech Stack

- **TypeScript** - Type-safe code
- **Vite** - Fast bundler
- **Axios** - HTTP client for poe.ninja
- **Chrome Extension API** - Manifest V3

### Making Changes

1. Edit files in `extension/src/`
2. Run `npm run dev` for auto-rebuild
3. Reload extension in Chrome (`chrome://extensions/` → click reload icon)
4. Test on POE stash page

## Troubleshooting

### Extension not showing?
- Check you're on `https://www.pathofexile.com/account/view-stash/*`
- Refresh page with Ctrl+Shift+R

### Items not priced?
- Check minimum value in settings
- Verify correct league selected
- Click "Refresh Market Data" in popup

### See errors?
- Open DevTools (F12)
- Check Console for `[POE Pricer]` messages
- Report issue with console logs

### Still having issues?
See [Extension Troubleshooting](./extension/README.md#troubleshooting) for detailed debugging steps.

## Contributing

This is a personal project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Guidelines

- Maintain TypeScript types
- Add `[POE Pricer]` prefix to console logs
- Test with multiple item types
- Update documentation for significant changes

## Roadmap

### v1.1 (Next Release)
- [ ] Proper extension icons
- [ ] Better error messages
- [ ] Export results to CSV

### v1.2 (Future)
- [ ] More item types (maps, fossils)
- [ ] Price history/trends
- [ ] Bulk listing suggestions

### v2.0 (Long-term)
- [ ] Firefox support
- [ ] Trade macro integration
- [ ] Auto-tab sorting

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Credits

- Market data from [poe.ninja](https://poe.ninja)
- Path of Exile by [Grinding Gear Games](https://www.pathofexile.com)

## Disclaimer

This extension is not affiliated with or endorsed by Grinding Gear Games or poe.ninja. Use at your own risk. Prices are estimates based on market data and may not reflect actual sale prices.

## Support

Found a bug? Have a suggestion?

1. Check [Troubleshooting](./extension/README.md#troubleshooting)
2. Review [CLAUDE.md](./CLAUDE.md) for technical details
3. Open an issue with:
   - Browser version
   - POE league
   - Console error logs
   - Steps to reproduce

---

**Happy trading, Exile!** 💰
