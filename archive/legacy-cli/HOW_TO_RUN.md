# How to Run the POE Stash Analyzer

## Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
cd /Users/mymac/Documents/Projects/poe-trader
npm install
```

### Step 2: Get Your POESESSID Cookie

1. Open your browser and go to https://www.pathofexile.com
2. Log in to your account
3. Open Developer Tools:
   - **Chrome/Edge**: Press F12, click "Application" tab
   - **Firefox**: Press F12, click "Storage" tab
   - **Safari**: Enable Developer menu, then Show Web Inspector
4. Navigate to Cookies → https://www.pathofexile.com
5. Find "POESESSID" and copy its value (long string of letters/numbers)

### Step 3: Create Your Configuration File

```bash
cp .env.example .env
```

Edit the `.env` file (use nano, vim, or any text editor):
```bash
nano .env
```

Add your information:
```env
POE_ACCOUNT_NAME=YourAccountNameHere
POE_POESESSID=paste_your_cookie_value_here
POE_LEAGUE=Settlers
POE_REALM=pc
MIN_VALUE_CHAOS=5
```

**Important**: Replace the example values with your actual data!

### Step 4: Run the Analyzer

```bash
npm run analyze
```

That's it! You should see a list of your top 10 most valuable items.

---

## Example Output

```
=== POE Stash Analyzer ===

Account: MyAccount
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
Fetching 19 additional tabs...
  Tab 0: "Currency" (150 items)
  Tab 1: "Uniques" (80 items)
  Tab 2: "Gems" (45 items)
  ...

Total items found: 275
Analyzing item values...

Found 45 items worth 5c or more

╔═══════════════════════════════════════════════════════════════════════════════╗
║                          TOP VALUABLE ITEMS TO SELL                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

#1   Mageblood (Heavy Belt)
     ═══════════════════════════════════════════════════════════════════════════
     Value: 3500.0c (19.44 div)
     List at: 18.5 divine
     Confidence: ●●● High  |  Est. Sale Time: Hours
     Unique "Mageblood" market price: 3500.0c

...
```

---

## Different Ways to Run

### Option 1: Development Mode (Recommended for Testing)
Runs directly from TypeScript without building:
```bash
npm run dev
```

### Option 2: Production Mode
Build once, run multiple times:
```bash
npm run build
npm start
```

### Option 3: Direct Analysis
The quickest way (what we recommend):
```bash
npm run analyze
```

---

## Common Customizations

### Analyze Specific Tabs Only

If you have many tabs and only want to check specific ones:

Edit `.env`:
```env
STASH_TAB_INDICES=0,1,2,5,10
```

This will only analyze tabs 0, 1, 2, 5, and 10.

### Change Minimum Value Filter

To see only high-value items:

Edit `.env`:
```env
MIN_VALUE_CHAOS=50
```

To see all items with any value:

Edit `.env`:
```env
MIN_VALUE_CHAOS=1
```

### Change League

For Standard league:
```env
POE_LEAGUE=Standard
```

For current challenge league (check the current league name):
```env
POE_LEAGUE=Settlers
```

For Hardcore:
```env
POE_LEAGUE=Hardcore
```

---

## Troubleshooting

### "Authentication failed"

Your POESESSID cookie expired or is incorrect.

**Solution**: Get a fresh cookie:
1. Go to pathofexile.com
2. Log in
3. Get new POESESSID from browser cookies
4. Update your `.env` file

### "No valuable items found"

**Solution**: Lower the minimum threshold:
```env
MIN_VALUE_CHAOS=1
```

Or check you're using the correct league name.

### "Rate limited"

You've made too many requests.

**Solution**: Wait 5-10 minutes, then try again.

To avoid this, analyze fewer tabs:
```env
STASH_TAB_INDICES=0,1,2
```

### "Module not found"

Dependencies not installed.

**Solution**:
```bash
npm install
```

---

## What to Do With the Results

### 1. Verify Prices
Always check current prices on pathofexile.com/trade before listing:
- Prices fluctuate constantly
- Some items have variants worth different amounts
- The tool gives estimates, not guarantees

### 2. List Items for Sale
Use the suggested prices from the tool:
- List at the "List at" price for competitive pricing
- Or list at full value if you're patient

### 3. Bulk Items Sell Faster
If you have multiple of the same currency/fragment:
- List them in bulk (e.g., "10x Chaos Orb")
- Bulk buyers often pay slightly more

### 4. Consider Liquidity
The tool tells you how fast items might sell:
- **Instant/Hours**: Popular items, list now
- **Days**: Moderate demand, price competitively
- **Slow**: Niche items, be patient or reduce price

---

## Advanced Usage

### Export Results to File
```bash
npm run analyze > results.txt
```

### Check Specific Item Types
The analyzer automatically categorizes items:
- Unique items (special named items)
- Skill gems (including quality and corrupted)
- Currency (chaos, divine, etc.)
- Fragments (scarabs, breachstones, etc.)
- Divination cards
- Valuable rare items (6-links, influenced bases)

### Run Periodically
You can run the analyzer anytime to check current values:
```bash
# Every day to see if anything became valuable
npm run analyze
```

**Note**: POESESSID expires after ~1 week of inactivity, so you may need to refresh it periodically.

---

## Files You'll Use

### Files You SHOULD Edit
- `.env` - Your configuration (account, league, filters)

### Files You SHOULDN'T Edit
- Everything else (unless you want to customize the code)

### Files to Know About
- `README.md` - Full documentation
- `SETUP.md` - Setup guide
- `TROUBLESHOOTING.md` - Common problems and solutions
- `ARCHITECTURE.md` - Technical details

---

## Getting Help

1. **Check TROUBLESHOOTING.md** for common issues
2. **Check README.md** for detailed documentation
3. **Verify your .env file** is configured correctly
4. **Make sure your POESESSID is fresh** (less than 1 week old)
5. **Verify your account is public** in POE privacy settings

---

## Security Reminder

**NEVER share your POESESSID with anyone!**

It's like a password that grants access to your Path of Exile account.

- Don't commit it to git
- Don't post it online
- Don't share it in Discord/forums
- Don't store it in unencrypted places

The `.env` file is automatically ignored by git, so it won't be committed.

---

## Tips for Best Results

### 1. Keep Your Account Public
Go to pathofexile.com → My Account → Privacy Settings
Make sure your profile is not private.

### 2. Use Fresh POESESSID
If you get authentication errors, get a new cookie from your browser.

### 3. Start with One Tab
Test with just one tab first:
```env
STASH_TAB_INDICES=0
```

### 4. Check Current League Name
League names change every 3-4 months. Make sure you're using the current league name.

### 5. Verify Before Selling
Always double-check prices on pathofexile.com/trade before listing expensive items.

---

## What's Next?

After you've successfully run the analyzer:

1. Review the top 10 items it found
2. Verify prices on pathofexile.com/trade
3. List items for sale on the trade site
4. Run the analyzer again when you get new items
5. Adjust MIN_VALUE_CHAOS as needed

Happy trading!
