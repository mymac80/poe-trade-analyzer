# Troubleshooting Guide

## Table of Contents
1. [Configuration Issues](#configuration-issues)
2. [Authentication Problems](#authentication-problems)
3. [API and Rate Limiting](#api-and-rate-limiting)
4. [Data and Pricing Issues](#data-and-pricing-issues)
5. [Network and Connection](#network-and-connection)
6. [Build and Runtime Errors](#build-and-runtime-errors)

---

## Configuration Issues

### Error: "POE_ACCOUNT_NAME is required in .env file"

**Cause**: No `.env` file exists or the POE_ACCOUNT_NAME variable is missing.

**Solution**:
```bash
# Copy the example file
cp .env.example .env

# Edit the file and add your account name
nano .env  # or use your preferred editor
```

Make sure your `.env` file looks like this:
```env
POE_ACCOUNT_NAME=YourActualAccountName
POE_POESESSID=your_actual_session_id
POE_LEAGUE=Settlers
POE_REALM=pc
```

### Error: "POE_POESESSID is required in .env file"

**Cause**: The POESESSID cookie is missing from your `.env` file.

**Solution**: See [Getting POESESSID](#getting-a-fresh-poesessid) section below.

### Wrong League Selected

**Symptom**: No items found or prices seem wrong.

**Solution**: Make sure POE_LEAGUE matches your current league exactly:
- Standard league: `POE_LEAGUE=Standard`
- Current challenge league: `POE_LEAGUE=Settlers` (check current league name)
- Hardcore: `POE_LEAGUE=Hardcore`
- SSF: `POE_LEAGUE=SSF Settlers`

League names are case-sensitive!

---

## Authentication Problems

### Error: "Authentication failed. Please check your POESESSID cookie"

**Causes**:
1. POESESSID expired (they expire after ~1 week of inactivity)
2. POESESSID copied incorrectly
3. Extra spaces or characters in the .env file
4. Not logged into pathofexile.com

**Solution**: Get a fresh POESESSID cookie.

#### Getting a Fresh POESESSID

**Chrome/Edge:**
1. Go to https://www.pathofexile.com
2. Make sure you're logged in
3. Press `F12` to open Developer Tools
4. Click the "Application" tab (might be hidden under >> if window is narrow)
5. In the left sidebar: Storage → Cookies → https://www.pathofexile.com
6. Find "POESESSID" in the list
7. Double-click the value to select it
8. Copy it (Ctrl+C / Cmd+C)
9. Paste into your .env file

**Firefox:**
1. Go to https://www.pathofexile.com
2. Make sure you're logged in
3. Press `F12` to open Developer Tools
4. Click the "Storage" tab
5. Expand Cookies → https://www.pathofexile.com
6. Find "POESESSID"
7. Copy the value
8. Paste into your .env file

**Common Mistakes:**
- Copying extra spaces before or after the POESESSID
- Not being logged in when copying
- Using an old/expired cookie
- Adding quotes around the value (don't do this)

**Correct format in .env:**
```env
POE_POESESSID=1234567890abcdefghijklmnopqrstuvwxyz1234567890
```

**Wrong formats:**
```env
POE_POESESSID="1234..." # Don't use quotes
POE_POESESSID= 1234...  # Don't add spaces
POE_POESESSID=          # Don't leave empty
```

### Account Privacy Settings

**Error**: Getting authentication errors even with valid POESESSID.

**Solution**: Make sure your account is not set to private:
1. Log into pathofexile.com
2. Go to "My Account" → "Privacy Settings"
3. Under "Profile Privacy", make sure it's not set to private
4. You can hide your characters but keep profile public

---

## API and Rate Limiting

### Error: "Rate limited by POE API. Please wait a few minutes"

**Cause**: You've made too many requests to the Path of Exile API.

**Solution**:
1. Wait 5-10 minutes before trying again
2. The tool already has built-in delays, but analyzing many tabs can trigger limits
3. Use `STASH_TAB_INDICES` to analyze fewer tabs:

```env
# Only analyze tabs 0, 1, and 2
STASH_TAB_INDICES=0,1,2
```

**Prevention**:
- Don't run the analyzer multiple times in quick succession
- Analyze specific tabs instead of all tabs
- The tool automatically waits 1 second between tab requests

### Slow Performance

**Symptom**: The analyzer takes a very long time.

**Causes**:
1. Many stash tabs to analyze
2. Network latency
3. API delays

**Solution**:
```env
# Analyze only valuable tabs (adjust indices for your tabs)
STASH_TAB_INDICES=0,1,2,3,4  # Your most valuable tabs

# Increase minimum value to reduce processing
MIN_VALUE_CHAOS=10
```

---

## Data and Pricing Issues

### "No valuable items found above the minimum threshold"

**Causes**:
1. MIN_VALUE_CHAOS is set too high
2. Wrong league selected
3. Items are actually not valuable in current market

**Solution**:
```env
# Lower the threshold to see more items
MIN_VALUE_CHAOS=1

# Verify correct league
POE_LEAGUE=Settlers  # or your actual league
```

### Items Showing Wrong Prices

**Symptom**: You know an item is worth more/less than shown.

**Causes**:
1. Market prices fluctuate constantly
2. Item variants (different rolls, corruptions) have different values
3. poe.ninja data updates periodically

**Solution**:
1. Always verify on pathofexile.com/trade before listing
2. Check for exact item matches (level, quality, links, corruption)
3. Use the tool as a guide, not absolute truth

**For unique items**: Check if:
- Rolls are perfect/near-perfect (adds value)
- Item is 6-linked (adds significant value)
- Item has good corruption (can add or remove value)

**For gems**: Check:
- Exact level and quality
- Corruption status
- Alternative quality type

### Item Not Found in Market Data

**Symptom**: Item shows as 1c or not valued.

**Causes**:
1. Very rare item not tracked by poe.ninja
2. Legacy item from old league
3. Item variant not in database

**Solution**:
1. Manually check pathofexile.com/trade
2. Search for similar items
3. Consider it may actually be low value if no one is listing it

---

## Network and Connection

### Error: "Failed to fetch market data from poe.ninja"

**Causes**:
1. poe.ninja is temporarily down
2. Internet connection issues
3. Firewall blocking requests

**Solution**:
1. Check https://poe.ninja in your browser
2. Check your internet connection
3. Try again in a few minutes
4. Check if a VPN or firewall is blocking requests

### Timeout Errors

**Error**: Requests timing out.

**Solution**:
1. Check internet connection
2. Try again during off-peak hours
3. Increase timeout in the code (for advanced users)

---

## Build and Runtime Errors

### TypeScript Compilation Errors

**Error**: `npm run build` fails.

**Solution**:
```bash
# Clean and reinstall
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Module Not Found Errors

**Error**: "Cannot find module 'axios'" or similar.

**Solution**:
```bash
# Reinstall dependencies
npm install

# If that doesn't work:
rm -rf node_modules
npm install
```

### Permission Errors (macOS/Linux)

**Error**: Permission denied when running.

**Solution**:
```bash
# Make sure you own the project directory
sudo chown -R $USER:$USER /Users/mymac/Documents/Projects/poe-trader

# Or run with proper permissions
chmod +x dist/index.js
```

### Node Version Issues

**Error**: Syntax errors or "unexpected token".

**Cause**: Node.js version too old.

**Solution**:
```bash
# Check your Node version
node --version

# You need Node.js 18 or higher
# Update Node.js if needed
```

---

## Getting Help

### Enable Debug Output

For more detailed error information, you can check the full error stack trace that appears when errors occur.

### What to Check Before Asking for Help

1. Is your .env file configured correctly?
2. Is your POESESSID fresh (less than a week old)?
3. Are you logged into pathofexile.com?
4. Is your account public?
5. Is the league name correct and spelled exactly right?
6. Have you tried waiting 5-10 minutes (for rate limits)?
7. Does poe.ninja work in your browser?

### Diagnostic Test

Run this quick test to verify basic functionality:

```bash
# Test with just your first tab and low threshold
```

Edit `.env`:
```env
STASH_TAB_INDICES=0
MIN_VALUE_CHAOS=1
```

Run:
```bash
npm run analyze
```

If this works, your setup is fine. Gradually increase the scope.

---

## Common Questions

**Q: How often does pricing data update?**
A: poe.ninja updates hourly. The tool caches data for 5 minutes.

**Q: Can I analyze someone else's stash?**
A: No, you can only analyze your own account's stash tabs.

**Q: Does this work for Standard league?**
A: Yes! Just set `POE_LEAGUE=Standard` in your .env file.

**Q: Can I export the results?**
A: The tool outputs to console. You can redirect output:
```bash
npm run analyze > results.txt
```

**Q: Is my POESESSID safe?**
A: Keep it secret! It grants access to your account. Never share it or commit it to git.

**Q: Why are prices different from what I see on trade site?**
A: Prices fluctuate constantly. Always verify before listing. The tool shows poe.ninja aggregate data.

**Q: Can I analyze multiple accounts?**
A: Change POE_ACCOUNT_NAME and POE_POESESSID in .env between runs.

---

## Still Having Issues?

1. Check the README.md for detailed usage
2. Check the SETUP.md for step-by-step setup
3. Make sure all dependencies are installed
4. Try with a fresh POESESSID
5. Verify you're using the correct league name
