# POE Stash Analyzer

A TypeScript-based tool that analyzes your Path of Exile stash tabs and identifies the top 10 most valuable items you can sell, complete with current market prices and trading recommendations.

## Features

- **Automatic Item Valuation**: Analyzes unique items, gems, currency, fragments, divination cards, and more
- **Real-time Market Data**: Uses poe.ninja API for up-to-date pricing
- **Smart Ranking**: Considers item quality, corruption, links, gem levels, and market trends
- **Detailed Insights**: Provides suggested listing prices, confidence levels, and liquidity estimates
- **User-Friendly Output**: Clean, formatted display with trading tips

## Prerequisites

- Node.js 18+ installed
- A Path of Exile account with stash tabs
- Your account must be set to public (for API access)

## Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd /Users/mymac/Documents/Projects/poe-trader
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up your configuration**:
   ```bash
   cp .env.example .env
   ```

4. **Edit the `.env` file** with your credentials:
   - `POE_ACCOUNT_NAME`: Your Path of Exile account name (case-sensitive)
   - `POE_POESESSID`: Your session cookie from pathofexile.com
   - `POE_LEAGUE`: The league you want to analyze (e.g., "Settlers", "Standard")
   - `POE_REALM`: Usually "pc" (or "sony", "xbox" for console)

## Getting Your POESESSID

The POESESSID is a session cookie that allows the tool to access your stash tabs.

### Chrome/Edge:
1. Go to [pathofexile.com](https://www.pathofexile.com) and log in
2. Press F12 to open Developer Tools
3. Go to "Application" tab → "Cookies" → "https://www.pathofexile.com"
4. Find "POESESSID" and copy its value
5. Paste it into your `.env` file

### Firefox:
1. Go to [pathofexile.com](https://www.pathofexile.com) and log in
2. Press F12 to open Developer Tools
3. Go to "Storage" tab → "Cookies" → "https://www.pathofexile.com"
4. Find "POESESSID" and copy its value
5. Paste it into your `.env` file

### Safari:
1. Enable Developer menu: Safari → Preferences → Advanced → "Show Develop menu"
2. Go to [pathofexile.com](https://www.pathofexile.com) and log in
3. Develop → Show Web Inspector → Storage → Cookies
4. Find "POESESSID" and copy its value
5. Paste it into your `.env` file

**Important**: Keep your POESESSID secret! It grants access to your account. Don't share it or commit it to version control.

## Usage

### Quick Start

Run the analyzer with default settings:

```bash
npm run analyze
```

Or after building:

```bash
npm run build
npm start
```

### Development Mode

Run without building (using ts-node):

```bash
npm run dev
```

### Configuration Options

Edit your `.env` file to customize:

- **STASH_TAB_INDICES**: Analyze specific tabs only (comma-separated, e.g., "0,1,2,5")
  - Leave empty to analyze all tabs

- **MIN_VALUE_CHAOS**: Minimum item value in Chaos Orbs to include (default: 5)
  - Set higher to focus on more valuable items
  - Set to 1 to see everything with market value

### Example .env Configuration

```env
POE_ACCOUNT_NAME=YourAccountName
POE_POESESSID=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
POE_LEAGUE=Settlers
POE_REALM=pc
STASH_TAB_INDICES=
MIN_VALUE_CHAOS=5
```

## Output Example

```
=== POE Stash Analyzer ===

Account: YourAccountName
League: Settlers
Realm: pc

Fetching market data from poe.ninja...
Market data loaded: Divine = 180c
  Unique items: 1250
  Skill gems: 450
  Currency: 75
  Fragments: 120

Fetching stash tabs...

Found 20 total stash tabs
  Tab 0: "Currency" (150 items)
  Tab 1: "Uniques" (80 items)
  Tab 2: "Gems" (45 items)

Total items found: 275
Analyzing item values...

Found 45 items worth 5c or more

╔═══════════════════════════════════════════════════════════════════════════════╗
║                          TOP VALUABLE ITEMS TO SELL                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

#1   Headhunter (Leather Belt)
     ═══════════════════════════════════════════════════════════════════════════
     Value: 2500.0c (13.89 div)
     List at: 13.2 divine
     Confidence: ●●● High  |  Est. Sale Time: Hours
     Unique "Headhunter" market price: 2500.0c

#2   Awakened Multistrike Support
     ═══════════════════════════════════════════════════════════════════════════
     Value: 450.0c (2.50 div)
     List at: 2.4 divine
     Confidence: ●●● High  |  Est. Sale Time: Hours
     Gem Awakened Multistrike Support (21/20, corrupted)
     Notes: Level 21, Quality 20%, Corrupted, 21/20 gem

...
```

## Understanding the Output

### Value Indicators

- **Value**: Estimated market value in Chaos Orbs and Divine Orbs
- **List at**: Suggested competitive listing price (95% of market value)
- **Confidence**: How reliable the price estimate is
  - ●●● High: Exact match found in poe.ninja data
  - ●●○ Medium: Similar item found, price adjusted for differences
  - ●○○ Low: Limited market data, rough estimate

### Liquidity Estimates

- **Instant**: High-demand items that sell immediately
- **Hours**: Popular items that typically sell within hours
- **Days**: Moderate demand, may take a day or two
- **Slow**: Niche items that may take longer to find a buyer

### Special Notes

Items may include notes about special characteristics:
- **6-LINK**: Item has 6 linked sockets (valuable for any item)
- **21/20 gem**: Level 21, Quality 20% (very desirable for gems)
- **PERFECT 21/23**: Perfect corrupted gem (maximum value)
- **Good corruption implicit**: Corrupted with valuable implicit mod
- **iLvl 86+ influenced base**: High-level crafting base

## Troubleshooting

### "Authentication failed"
- Your POESESSID cookie may have expired (they expire after ~1 week of inactivity)
- Get a fresh POESESSID from your browser
- Make sure you're logged into pathofexile.com when getting the cookie

### "Rate limited by POE API"
- The Path of Exile API has strict rate limits
- Wait 5-10 minutes before trying again
- Consider analyzing fewer stash tabs using STASH_TAB_INDICES

### "No valuable items found"
- Try lowering MIN_VALUE_CHAOS in your .env
- Make sure you're analyzing the right league
- Check that your stash tabs actually contain items

### "Failed to fetch market data"
- poe.ninja might be temporarily unavailable
- Check your internet connection
- Try again in a few minutes

### Items showing as 1c when they should be worth more
- The item might not be tracked by poe.ninja (very rare items)
- Check manually on pathofexile.com/trade
- Some legacy or variant items may not match exactly

## API Rate Limits

- **POE API**: ~1 request per second (enforced by tool)
- **poe.ninja API**: Generally permissive, data is cached for 5 minutes

The tool respects these limits automatically with built-in delays.

## Project Structure

```
poe-trader/
├── src/
│   ├── api/                 # API clients
│   │   ├── poe-api.ts      # Path of Exile official API
│   │   └── poe-ninja-api.ts # poe.ninja market data API
│   ├── models/             # TypeScript interfaces and types
│   │   └── types.ts
│   ├── services/           # Business logic
│   │   ├── analyzer.ts     # Main analysis coordinator
│   │   └── item-valuator.ts # Item valuation logic
│   ├── utils/              # Utilities
│   │   ├── config.ts       # Configuration loader
│   │   └── formatter.ts    # Output formatting
│   └── index.ts            # Entry point
├── dist/                   # Compiled JavaScript (after build)
├── .env                    # Your configuration (git-ignored)
├── .env.example            # Example configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Build the project:
```bash
npm run build
```

### Clean build artifacts:
```bash
npm run clean
```

### Run in development mode:
```bash
npm run dev
```

## Contributing

Feel free to submit issues or pull requests to improve the analyzer!

## Disclaimer

- **No Guarantees**: Market prices fluctuate constantly. Always verify prices on pathofexile.com/trade before listing items.
- **Use at Your Own Risk**: This tool accesses the official POE API but is not affiliated with Grinding Gear Games.
- **Account Security**: Keep your POESESSID private. Never share it or commit it to public repositories.
- **Rate Limits**: Respect API rate limits. Excessive requests may result in temporary API blocks.

## Credits

- Market data powered by [poe.ninja](https://poe.ninja)
- Uses the official [Path of Exile API](https://www.pathofexile.com/developer/docs)

## License

MIT License - See LICENSE file for details
