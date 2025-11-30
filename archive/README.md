# Archive - Legacy CLI Approach

This directory contains the original CLI-based approach to POE stash analysis that was **deprecated** in favor of the browser extension.

## Why These Approaches Were Abandoned

### 1. Direct API Approach (Failed)
- **Problem**: Cloudflare protection blocking all API requests
- **Status**: Could not authenticate even with POESESSID cookie
- **Code**: `legacy-cli/src/api/poe-api.ts` (never completed)

### 2. OAuth 2.1 Approach (Partial)
- **Problem**: Complex user flow, still requires Cloudflare bypass
- **Status**: OAuth client implemented but not integrated
- **Code**: `legacy-cli/src/api/poe-oauth-client.ts`

### 3. Playwright Automation (Failed)
- **Problem**: Heavy resource usage, brittle automation
- **Status**: Attempted but not practical for production use
- **Code**: Screenshots in `.playwright-mcp/` (deleted)

## What Worked: Browser Extension

The final solution is a **browser extension** that:
- Runs in the browser with existing user session (no Cloudflare issues)
- Directly accesses stash data from the page
- Reuses 80% of the valuation logic from this CLI code
- Provides better UX with inline pricing

See `/extension/` directory for the working implementation.

## Contents of This Archive

### Documentation
- `ARCHITECTURE.md` - Original system architecture
- `HOW_TO_RUN.md` - CLI usage instructions
- `OAUTH_SETUP.md` - OAuth implementation guide
- `PROJECT_FILES.md` - Original file structure
- `PROJECT_SUMMARY.md` - Project overview
- `QUICKSTART.md` - Quick start guide
- `SETUP.md` - Setup instructions
- `TROUBLESHOOTING.md` - Troubleshooting guide

### Code
- `src/` - Original TypeScript source code
  - `api/` - POE and poe.ninja API clients
  - `services/` - Analyzer and valuator services
  - `models/` - TypeScript type definitions
  - `utils/` - Config and formatter utilities
- `package.json` - CLI dependencies
- `tsconfig.json` - TypeScript configuration

## What Was Reused

The following code was ported to the browser extension and **still works**:
- ✅ `src/api/poe-ninja-api.ts` → `extension/src/shared/api/poe-ninja-api.ts`
- ✅ `src/services/item-valuator.ts` → `extension/src/shared/services/item-valuator.ts`
- ✅ `src/models/types.ts` → `extension/src/shared/models/types.ts`

All the core valuation logic, poe.ninja integration, and type definitions work perfectly in the browser extension!

## Historical Context

This code represents ~2 days of development attempting various approaches to solve the POE stash pricing problem. While the API approaches failed, the data models and valuation logic were solid and formed the foundation for the successful browser extension.

---

**Note**: This code is kept for reference only. Use the `/extension/` directory for the active, working implementation.
