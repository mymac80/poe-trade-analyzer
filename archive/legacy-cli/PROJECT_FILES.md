# Project Files Overview

## Complete File Listing

### Configuration Files
- **package.json** - Node.js dependencies and scripts
- **tsconfig.json** - TypeScript compiler configuration
- **.env.example** - Environment variable template
- **.gitignore** - Git ignore patterns

### Source Code (src/)

#### Entry Point
- **src/index.ts** - Main application entry point

#### API Clients (src/api/)
- **src/api/poe-api.ts** - Path of Exile Official API client
- **src/api/poe-ninja-api.ts** - poe.ninja market data API client

#### Data Models (src/models/)
- **src/models/types.ts** - TypeScript type definitions and interfaces

#### Business Logic (src/services/)
- **src/services/analyzer.ts** - Main analysis coordinator
- **src/services/item-valuator.ts** - Item valuation logic

#### Utilities (src/utils/)
- **src/utils/config.ts** - Configuration loader
- **src/utils/formatter.ts** - Output formatting utilities

### Documentation
- **README.md** - Complete user guide and documentation
- **SETUP.md** - Quick setup instructions
- **HOW_TO_RUN.md** - Step-by-step running guide
- **TROUBLESHOOTING.md** - Common issues and solutions
- **ARCHITECTURE.md** - Technical architecture overview
- **PROJECT_SUMMARY.md** - Comprehensive project summary
- **PROJECT_FILES.md** - This file
- **LICENSE** - MIT License

### Build Output (dist/)
Generated when you run `npm run build`:
- Compiled JavaScript files
- Type declaration files (.d.ts)
- Source maps

---

## File Purposes

### User Configuration
- `.env` (you create this) - Your personal settings

### Package Management
- `node_modules/` - Installed dependencies (auto-generated)
- `package-lock.json` - Dependency lock file (auto-generated)

---

## What Each File Does

### src/index.ts
Main entry point that:
- Loads configuration from .env
- Creates the StashAnalyzer
- Runs the analysis
- Displays results
- Handles errors

### src/api/poe-api.ts
Connects to Path of Exile's official API to:
- Authenticate using POESESSID cookie
- Fetch stash tab data
- Handle rate limiting
- Return item information

### src/api/poe-ninja-api.ts
Connects to poe.ninja API to:
- Fetch current market prices
- Get currency exchange rates
- Retrieve unique item values
- Get gem prices
- Cache results for 5 minutes

### src/models/types.ts
Defines TypeScript types for:
- Configuration (PoeConfig)
- Items (Item, Property, Socket)
- Market data (PoeNinjaLine, PoeNinjaCurrencyLine)
- Results (ValuedItem)
- API responses (StashTabResponse, PoeNinjaResponse)

### src/services/analyzer.ts
Coordinates the analysis by:
- Fetching market data from poe.ninja
- Fetching stash tabs from POE API
- Creating item valuator
- Collecting all items
- Valuing each item
- Sorting by value
- Returning top N items

### src/services/item-valuator.ts
Values items by:
- Matching items to market data
- Detecting special features (6-link, corruption, quality)
- Calculating chaos/divine values
- Assigning confidence levels
- Estimating liquidity
- Generating explanations

### src/utils/config.ts
Handles configuration by:
- Loading .env file
- Parsing environment variables
- Validating required fields
- Providing defaults
- Returning PoeConfig object

### src/utils/formatter.ts
Formats output by:
- Creating formatted tables
- Displaying item details
- Showing summary statistics
- Formatting prices
- Adding visual indicators (●●●, ═══)
- Supporting JSON/CSV export

---

## Directory Structure

```
poe-trader/
├── .claude/                    # Claude configuration
├── dist/                       # Compiled output (after build)
│   ├── api/
│   ├── models/
│   ├── services/
│   ├── utils/
│   └── index.js
├── node_modules/              # Dependencies (after npm install)
├── src/                       # Source code
│   ├── api/
│   │   ├── poe-api.ts
│   │   └── poe-ninja-api.ts
│   ├── models/
│   │   └── types.ts
│   ├── services/
│   │   ├── analyzer.ts
│   │   └── item-valuator.ts
│   ├── utils/
│   │   ├── config.ts
│   │   └── formatter.ts
│   └── index.ts
├── .env                       # Your config (create this!)
├── .env.example              # Config template
├── .gitignore                # Git ignore rules
├── ARCHITECTURE.md           # Technical architecture
├── HOW_TO_RUN.md            # Running instructions
├── LICENSE                   # MIT License
├── package.json              # Node.js config
├── package-lock.json         # Dependency lock
├── PROJECT_FILES.md          # This file
├── PROJECT_SUMMARY.md        # Project overview
├── README.md                 # Main documentation
├── SETUP.md                  # Setup guide
├── TROUBLESHOOTING.md        # Problem solving
└── tsconfig.json             # TypeScript config
```

---

## Files by Purpose

### Setup & Configuration
1. `.env.example` - Copy this to `.env`
2. `.env` - Your settings (create from .env.example)
3. `package.json` - Dependencies and scripts
4. `tsconfig.json` - TypeScript settings

### Core Application
1. `src/index.ts` - Entry point
2. `src/services/analyzer.ts` - Main logic
3. `src/services/item-valuator.ts` - Valuation
4. `src/api/poe-api.ts` - POE API
5. `src/api/poe-ninja-api.ts` - Market data

### Support Code
1. `src/utils/config.ts` - Config loading
2. `src/utils/formatter.ts` - Output formatting
3. `src/models/types.ts` - Type definitions

### Documentation
1. `HOW_TO_RUN.md` - Start here!
2. `README.md` - Complete guide
3. `SETUP.md` - Quick setup
4. `TROUBLESHOOTING.md` - Common issues
5. `ARCHITECTURE.md` - Technical details
6. `PROJECT_SUMMARY.md` - Overview
7. `LICENSE` - Legal terms

---

## Which Files to Edit

### You SHOULD Edit:
- `.env` - Your configuration

### You CAN Edit (for customization):
- `src/index.ts` - Change output, add features
- `src/services/item-valuator.ts` - Adjust valuation logic
- `src/utils/formatter.ts` - Change output format

### You SHOULDN'T Edit (unless you know what you're doing):
- `package.json` - Breaks dependencies
- `tsconfig.json` - Breaks compilation
- `src/models/types.ts` - Breaks type system
- Any files in `dist/` - Auto-generated
- Any files in `node_modules/` - External code

---

## Build Artifacts (Auto-Generated)

These are created automatically and shouldn't be edited:

- `dist/` - Compiled JavaScript
- `node_modules/` - Installed packages
- `package-lock.json` - Dependency lock
- `*.js.map` - Source maps
- `*.d.ts` - Type declarations

---

## File Sizes (Approximate)

### Documentation
- README.md: ~9 KB
- TROUBLESHOOTING.md: ~10 KB
- ARCHITECTURE.md: ~12 KB
- PROJECT_SUMMARY.md: ~15 KB
- HOW_TO_RUN.md: ~8 KB
- SETUP.md: ~3 KB

### Source Code
- src/api/poe-api.ts: ~3 KB
- src/api/poe-ninja-api.ts: ~5 KB
- src/models/types.ts: ~5 KB
- src/services/analyzer.ts: ~3 KB
- src/services/item-valuator.ts: ~12 KB
- src/utils/config.ts: ~1 KB
- src/utils/formatter.ts: ~6 KB
- src/index.ts: ~2 KB

Total Source: ~37 KB
Total Documentation: ~57 KB

---

## Quick Reference

### To Run the Project:
1. Copy `.env.example` to `.env`
2. Edit `.env` with your credentials
3. Run `npm install`
4. Run `npm run analyze`

### To Modify the Project:
1. Edit files in `src/`
2. Run `npm run build` to compile
3. Run `npm start` to test

### To Get Help:
1. Read `HOW_TO_RUN.md` first
2. Check `TROUBLESHOOTING.md` for issues
3. Read `README.md` for details
4. Check `ARCHITECTURE.md` for technical info
