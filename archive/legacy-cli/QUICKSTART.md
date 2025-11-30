# Quick Start Guide

Get up and running in 5 minutes!

## Step 1: Install Dependencies (30 seconds)

```bash
npm install
```

## Step 2: Get Your POESESSID (2 minutes)

1. Go to https://www.pathofexile.com and log in
2. Press F12 (Developer Tools)
3. Navigate to:
   - Chrome/Edge: Application > Cookies > https://www.pathofexile.com
   - Firefox: Storage > Cookies > https://www.pathofexile.com
4. Find "POESESSID" and copy the value

## Step 3: Configure (1 minute)

```bash
cp .env.example .env
```

Edit `.env`:
```env
POE_ACCOUNT_NAME=YourAccountName
POE_POESESSID=your_poesessid_here
POE_LEAGUE=Settlers
POE_REALM=pc
MIN_VALUE_CHAOS=5
```

## Step 4: Run! (1 minute)

```bash
npm run analyze
```

## That's It!

You should now see your top 10 most valuable items.

## What Next?

- See full list: Lower `MIN_VALUE_CHAOS=1` in `.env`
- Analyze specific tabs: Set `STASH_TAB_INDICES=0,1,2` in `.env`
- Need help? Read `HOW_TO_RUN.md` or `TROUBLESHOOTING.md`

## Common Issues

### "Authentication failed"
Get fresh POESESSID from browser cookies (they expire weekly)

### "No valuable items found"
Set `MIN_VALUE_CHAOS=1` in `.env` to see all items

### "Rate limited"
Wait 5-10 minutes, or set `STASH_TAB_INDICES=0,1,2` to analyze fewer tabs

## Files to Read

- **HOW_TO_RUN.md** - Detailed instructions
- **README.md** - Complete documentation
- **TROUBLESHOOTING.md** - Problem solving
