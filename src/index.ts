#!/usr/bin/env node

import { StashAnalyzer } from './services/analyzer';
import { ResultFormatter } from './utils/formatter';
import { loadConfig } from './utils/config';

/**
 * Main entry point for the POE Stash Analyzer
 */
async function main() {
  try {
    // Load configuration
    const config = loadConfig();

    // Create analyzer
    const analyzer = new StashAnalyzer(config);

    // Analyze stash
    const topItems = await analyzer.analyzeStash(10);

    // Display results
    console.log(ResultFormatter.formatTopItems(topItems));
    console.log(ResultFormatter.formatSummary(topItems));

    // Trading tips
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                 TRADING TIPS                                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');
    console.log('  1. List items slightly below suggested price for faster sales');
    console.log('  2. Bulk items (currency, fragments) often sell faster');
    console.log('  3. Check pathofexile.com/trade for current live listings before posting');
    console.log('  4. Prices fluctuate - recheck values before listing expensive items');
    console.log('  5. Use trade site\'s "Exact" price search to find your item\'s real value');
    console.log('\n  Market data powered by poe.ninja');
    console.log('  Always verify prices before trading!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure you have a .env file with POE_ACCOUNT_NAME and POE_POESESSID');
    console.error('  2. Get your POESESSID from browser cookies while logged into pathofexile.com');
    console.error('  3. Ensure your account name is correct (case-sensitive)');
    console.error('  4. Check that the league name is correct (default: Settlers)');
    console.error('  5. Your account must be public to access stash tabs via API\n');

    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }

    process.exit(1);
  }
}

// Run the analyzer
main();
