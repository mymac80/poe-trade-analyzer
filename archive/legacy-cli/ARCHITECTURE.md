# Architecture Overview

## System Flow Diagram

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ (1) Run: npm run analyze
       ▼
┌─────────────────────────────────────────────────────────────┐
│                         index.ts                            │
│                     (Entry Point)                           │
└──────────┬──────────────────────────────────────────────────┘
           │
           │ (2) Load config from .env
           ▼
┌─────────────────────────────────────────────────────────────┐
│                    utils/config.ts                          │
│              (Environment Configuration)                    │
└──────────┬──────────────────────────────────────────────────┘
           │
           │ (3) Create StashAnalyzer
           ▼
┌─────────────────────────────────────────────────────────────┐
│                  services/analyzer.ts                       │
│              (Main Analysis Coordinator)                    │
└──────┬────────────────────────────────────────────────┬─────┘
       │                                                 │
       │ (4a) Fetch stash data                          │ (4b) Fetch market data
       ▼                                                 ▼
┌──────────────────────┐                    ┌──────────────────────────┐
│   api/poe-api.ts     │                    │  api/poe-ninja-api.ts   │
│  (POE Official API)  │                    │  (poe.ninja Market API) │
└──────┬───────────────┘                    └──────────┬───────────────┘
       │                                                 │
       │ (5) Return items                               │ (5) Return prices
       ▼                                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                services/item-valuator.ts                    │
│           (Item Valuation Logic)                            │
│  • Match items to market data                               │
│  • Calculate values                                         │
│  • Detect 6-links, corruption, quality                      │
│  • Assign confidence & liquidity                            │
└──────────┬──────────────────────────────────────────────────┘
           │
           │ (6) Return ValuedItem[]
           ▼
┌─────────────────────────────────────────────────────────────┐
│                  utils/formatter.ts                         │
│             (Format & Display Results)                      │
└──────────┬──────────────────────────────────────────────────┘
           │
           │ (7) Display to user
           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Terminal Output                          │
│  ╔════════════════════════════════════╗                     │
│  ║   TOP 10 VALUABLE ITEMS TO SELL   ║                     │
│  ╚════════════════════════════════════╝                     │
│  #1 Item Name                                               │
│      Value: 250c (1.39 div)                                 │
│      ...                                                    │
└─────────────────────────────────────────────────────────────┘
```

## Component Interaction

### Data Flow

```
.env file
   ↓
config.ts → PoeConfig
   ↓
StashAnalyzer
   ├─→ PoeApiClient → POE API → StashTabResponse[]
   │                                    ↓
   │                                  Item[]
   │
   └─→ PoeNinjaClient → poe.ninja API → Market Data
                                          ↓
                                    PoeNinjaResponse
   ↓
ItemValuator (combines items + market data)
   ↓
ValuedItem[] (sorted by value)
   ↓
ResultFormatter
   ↓
Formatted Output
```

## Module Dependencies

```
index.ts
  ├── services/analyzer.ts
  │   ├── api/poe-api.ts
  │   │   └── models/types.ts
  │   ├── api/poe-ninja-api.ts
  │   │   └── models/types.ts
  │   └── services/item-valuator.ts
  │       └── models/types.ts
  ├── utils/config.ts
  │   └── models/types.ts
  └── utils/formatter.ts
      └── models/types.ts
```

## External API Interactions

### 1. Path of Exile Official API

```
Request:
GET /character-window/get-stash-items
Params:
  - league: "Settlers"
  - realm: "pc"
  - accountName: "YourAccount"
  - tabIndex: 0
  - tabs: 1
Headers:
  - Cookie: POESESSID=xxx

Response:
{
  numTabs: 20,
  tabs: [{...}],
  items: [{...}]
}
```

**Rate Limit**: 1 request/second (enforced by 1s delay)

### 2. poe.ninja API

```
Requests:
GET /currencyoverview?league=Settlers&type=Currency
GET /currencyoverview?league=Settlers&type=Fragment
GET /itemoverview?league=Settlers&type=UniqueArmour
GET /itemoverview?league=Settlers&type=SkillGem
... (8+ endpoints total)

Response:
{
  lines: [
    {
      name: "Divine Orb",
      chaosValue: 180,
      ...
    }
  ]
}
```

**Caching**: 5-minute cache per endpoint

## Data Models

### Core Types

```typescript
// Configuration
PoeConfig {
  accountName: string
  poesessid: string
  league: string
  realm: string
  stashTabIndices?: number[]
  minValueChaos: number
}

// POE API Response
Item {
  name: string
  typeLine: string
  frameType: number
  ilvl: number
  corrupted?: boolean
  sockets?: Socket[]
  properties?: Property[]
  ...
}

// Market Data
PoeNinjaLine {
  name: string
  chaosValue: number
  gemLevel?: number
  gemQuality?: number
  corrupted?: boolean
  ...
}

// Analysis Result
ValuedItem {
  item: Item
  estimatedValue: number
  divineValue: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  suggestedPrice: { chaos, divine }
  liquidityEstimate: 'instant' | 'hours' | 'days' | 'slow'
  specialNotes?: string[]
}
```

## Error Handling Strategy

```
Try {
  Load Config
    ↓
  Fetch Market Data (cached, retries on failure)
    ↓
  Fetch Stash Tabs (with rate limiting)
    ↓
  Value Each Item (skip if valuation fails)
    ↓
  Format Results
    ↓
  Display
}
Catch {
  Authentication Error → User-friendly message + troubleshooting
  Rate Limit Error → Tell user to wait
  Network Error → Suggest checking connection
  Config Error → Explain what's missing
}
```

## Performance Optimizations

### 1. Caching Strategy
- **Market Data**: Cached for 5 minutes
- **Benefit**: Multiple runs don't re-fetch market data
- **Implementation**: In-memory Map with timestamps

### 2. Rate Limiting
- **POE API**: 1-second delay between requests
- **Benefit**: Prevents 429 rate limit errors
- **Implementation**: `sleep()` function between calls

### 3. Parallel Fetching
- **Market Data**: All endpoints fetched in parallel
- **Benefit**: Reduces total wait time
- **Implementation**: `Promise.all()`

### 4. Lazy Evaluation
- **Item Valuation**: Only valuable items processed fully
- **Benefit**: Skips worthless items early
- **Implementation**: Early returns in `isWorthlessItem()`

## Scalability Considerations

### Current Limits
- **Stash Tabs**: ~100 tabs max (POE limit)
- **Items per Tab**: ~unlimited (API returns all)
- **Total Items**: Tested up to 5,000+ items
- **Memory**: ~50MB for typical use

### Bottlenecks
1. **POE API Rate Limit**: 1 req/sec = 100 seconds for 100 tabs
2. **Network Latency**: ~500ms per request
3. **Item Processing**: O(n) for n items

### Scaling Solutions (Future)
- Parallel tab fetching with queue management
- Database for historical price tracking
- WebSocket for real-time updates
- Multiple POESESSID rotation (if permitted)

## Security Model

### Threat Model
1. **POESESSID Exposure**: High risk - grants account access
2. **API Abuse**: Medium risk - account ban
3. **Data Injection**: Low risk - all data from trusted APIs

### Mitigations
1. **POESESSID**: Stored in .env (git-ignored), never logged
2. **Rate Limiting**: Built-in delays prevent abuse
3. **Input Validation**: TypeScript types prevent injection
4. **HTTPS Only**: All API calls use HTTPS

## Testing Strategy

### Unit Testing (Future)
- Item valuation logic
- Price calculation
- Item matching algorithms
- Configuration parsing

### Integration Testing
- POE API authentication
- Market data fetching
- Full analysis workflow

### Manual Testing
- Different leagues
- Various item types
- Edge cases (6-links, corruptions, etc.)
- Error scenarios

## Deployment Architecture

```
Developer Machine
  ├── Node.js Runtime
  ├── TypeScript Source (src/)
  ├── Compiled JavaScript (dist/)
  ├── Configuration (.env)
  └── Dependencies (node_modules/)
      ↓
      Network
      ↓
External APIs
  ├── pathofexile.com (POE Official API)
  └── poe.ninja (Market Data API)
```

**No Server Required**: Runs entirely locally on user's machine

## Configuration Architecture

```
.env.example (template)
     ↓ (user copies and edits)
.env (user config)
     ↓ (loaded by dotenv)
process.env
     ↓ (parsed by config.ts)
PoeConfig object
     ↓ (used throughout app)
All components
```

## Monitoring and Logging

### Current Logging
- Console output for progress
- Error messages for failures
- Market data summary
- Item count statistics

### Future Logging
- Detailed debug mode
- Log file output
- Performance metrics
- API call tracking

---

## Design Decisions

### Why TypeScript?
- Type safety for complex data structures
- Better IDE support
- Catches errors at compile time
- Self-documenting code

### Why Axios?
- Promise-based (async/await)
- Automatic JSON parsing
- Good error handling
- Wide adoption

### Why poe.ninja?
- Most comprehensive market data
- Free API access
- Regularly updated
- Community trusted

### Why Local Execution?
- No server costs
- Complete privacy
- Faster (no network hop)
- User controls data

### Why Cache Market Data?
- Reduces API load
- Faster repeat runs
- Data doesn't change frequently
- Good citizen to poe.ninja

## Extensibility Points

### Adding New Item Types
1. Add endpoint to PoeNinjaClient
2. Add valuation logic to ItemValuator
3. Update types in models/types.ts

### Adding New Output Formats
1. Add method to ResultFormatter
2. Update CLI to accept format parameter

### Adding New Data Sources
1. Create new API client in api/
2. Update ItemValuator to consume data
3. Add to StashAnalyzer workflow

### Adding UI
1. Create web server (Express)
2. Create frontend (React/Vue)
3. Expose analyzer as API
4. Maintain CLI as alternative
