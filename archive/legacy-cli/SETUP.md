# Quick Setup Guide

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Your Settings

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your details:
```env
POE_ACCOUNT_NAME=YourAccountName
POE_POESESSID=your_session_cookie_here
POE_LEAGUE=Settlers
POE_REALM=pc
MIN_VALUE_CHAOS=5
```

### 3. Get Your POESESSID Cookie

**Chrome/Edge:**
1. Visit https://www.pathofexile.com and log in
2. Press F12 (Developer Tools)
3. Click "Application" tab
4. Navigate to Cookies → https://www.pathofexile.com
5. Find "POESESSID" and copy its value

**Firefox:**
1. Visit https://www.pathofexile.com and log in
2. Press F12 (Developer Tools)
3. Click "Storage" tab
4. Navigate to Cookies → https://www.pathofexile.com
5. Find "POESESSID" and copy its value

### 4. Make Your Account Public

Your stash tabs must be public for the API to access them:
1. Log into pathofexile.com
2. Go to "My Account" → "Privacy Settings"
3. Make sure your profile is not set to private

### 5. Run the Analyzer

```bash
npm run analyze
```

Or build and run:
```bash
npm run build
npm start
```

## Common Issues

### Issue: "POE_ACCOUNT_NAME is required"
**Solution**: Make sure you created a `.env` file (not just `.env.example`)

### Issue: "Authentication failed"
**Solution**:
- Your POESESSID may be expired (they last ~1 week)
- Get a fresh cookie from your browser
- Make sure there are no extra spaces in the .env file

### Issue: "No valuable items found"
**Solution**:
- Lower MIN_VALUE_CHAOS to 1 to see all items with value
- Check you're using the correct league name
- Verify items actually exist in your stash

### Issue: Rate limited
**Solution**:
- Wait 5-10 minutes
- Reduce the number of tabs analyzed using STASH_TAB_INDICES

## Next Steps

After setup, you can:
- Run analysis whenever you want to check item values
- Adjust MIN_VALUE_CHAOS to filter items
- Use STASH_TAB_INDICES to analyze specific tabs only
- Check the README.md for more advanced usage

## Quick Test

To verify everything works, try analyzing just your first stash tab:

Edit `.env`:
```env
STASH_TAB_INDICES=0
MIN_VALUE_CHAOS=1
```

Then run:
```bash
npm run analyze
```

You should see a list of items from your first stash tab!
