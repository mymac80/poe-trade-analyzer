# OAuth Setup Guide

This guide walks you through setting up OAuth authentication for the POE Stash Analyzer.

## Why OAuth?

OAuth is the official way to access Path of Exile's API. Unlike session cookies (POESESSID), OAuth:
- ✅ Bypasses Cloudflare protection
- ✅ Is the official, supported method
- ✅ Works reliably without browser automation
- ✅ More secure (tokens can be revoked)

## Step-by-Step Setup

### 1. Register an OAuth Application

1. Go to https://www.pathofexile.com/developer/apps
2. Click "New App" or "Create Application"
3. Fill in the details:
   - **App Name**: `POE Stash Analyzer` (or any name you prefer)
   - **Description**: `Analyzes stash tabs for valuable items`
   - **Redirect URI**: `http://localhost:3000/callback` ⚠️ **IMPORTANT: Must be exact!**
   - **Scopes**: Select:
     - `account:stashes` (to read stash tabs)
     - `account:characters` (to read character data)
4. Click "Create" or "Save"
5. You will see:
   - **Client ID**: A long string (e.g., `poe-trade-analyzer`)
   - **Client Secret**: A secret key (keep this private!)

### 2. Add Credentials to .env File

Open `.env` file and add your OAuth credentials:

```
POE_CLIENT_ID=your_client_id_here
POE_CLIENT_SECRET=your_client_secret_here
```

Replace `your_client_id_here` and `your_client_secret_here` with the values from step 1.

### 3. Test OAuth Authentication

Run the OAuth test script:

```bash
npm run test-oauth
```

This will:
1. Generate an authorization URL
2. Ask you to visit it in your browser
3. You'll authorize the app
4. Paste the redirect URL back into the terminal
5. Exchange the authorization code for an access token
6. Test that the token works

### 4. What Happens During Authorization

When you visit the authorization URL:
1. You'll see a POE login page (if not already logged in)
2. POE will ask "Do you want to authorize POE Stash Analyzer?"
3. Click "Authorize"
4. You'll be redirected to `http://localhost:3000/callback?code=...`
5. The page won't load (that's OK!), just copy the entire URL
6. Paste it into the terminal

### 5. After Successful Auth

Once authentication works, the main analyzer will use OAuth automatically instead of session cookies.

## Troubleshooting

**Error: "redirect_uri mismatch"**
- Make sure your OAuth app's redirect URI is exactly: `http://localhost:3000/callback`
- No trailing slash, must be lowercase

**Error: "invalid_client"**
- Double-check your Client ID and Client Secret
- Make sure there are no extra spaces in the .env file

**Error: "No authorization code found"**
- Make sure you're pasting the FULL URL including `http://localhost:3000/callback?code=...`

## Security Notes

- Keep your `POE_CLIENT_SECRET` private (don't commit it to git)
- Access tokens expire after a period of time
- You can revoke access at: https://www.pathofexile.com/developer/apps
