import { PoeBrowserApiClient } from '../api/poe-api-browser';
import { PoeNinjaClient } from '../api/poe-ninja-api';
import { ItemValuator } from './item-valuator';
import { Item, ValuedItem, PoeConfig } from '../models/types';

/**
 * Main analyzer service that coordinates fetching stash data and valuing items
 */
export class StashAnalyzer {
  private poeClient: PoeBrowserApiClient;
  private ninjaClient: PoeNinjaClient;
  private config: PoeConfig;

  constructor(config: PoeConfig) {
    this.config = config;
    this.poeClient = new PoeBrowserApiClient(config);
    this.ninjaClient = new PoeNinjaClient(config.league);
  }

  /**
   * Analyze all stash tabs and return top valuable items
   */
  async analyzeStash(topN: number = 10): Promise<ValuedItem[]> {
    console.log('\n=== POE Stash Analyzer ===\n');
    console.log(`Account: ${this.config.accountName}`);
    console.log(`League: ${this.config.league}`);
    console.log(`Realm: ${this.config.realm}\n`);

    // Initialize browser
    await this.poeClient.initialize();

    try {
      // Fetch market data
      const marketData = await this.ninjaClient.fetchAllMarketData();

      // Create valuator
      const valuator = new ItemValuator(
        marketData.uniques,
        marketData.gems,
        marketData.currency,
        marketData.fragments,
        marketData.divination,
        marketData.oils,
        marketData.essences,
        marketData.divinePrice
      );

      // Fetch stash tabs
      console.log('\nFetching stash tabs...\n');
      const stashTabs = await this.poeClient.getAllStashTabs();

      // Collect all items
      const allItems: Item[] = [];
      for (const tabData of stashTabs) {
        allItems.push(...tabData.items);
      }

      console.log(`\nTotal items found: ${allItems.length}`);
      console.log('Analyzing item values...\n');

      // Value all items
      const valuedItems: ValuedItem[] = [];
      for (const item of allItems) {
        const valued = valuator.valueItem(item);
        if (valued && valued.estimatedValue >= this.config.minValueChaos) {
          valuedItems.push(valued);
        }
      }

      // Sort by value
      valuedItems.sort((a, b) => b.estimatedValue - a.estimatedValue);

      console.log(`Found ${valuedItems.length} items worth ${this.config.minValueChaos}c or more\n`);

      // Return top N
      return valuedItems.slice(0, topN);
    } finally {
      // Always close browser
      await this.poeClient.close();
    }
  }

  /**
   * Analyze specific tab types only (e.g., unique, currency, fragment)
   */
  async analyzeSpecificTabs(tabTypes: string[], topN: number = 10): Promise<ValuedItem[]> {
    console.log('\n=== POE Stash Analyzer (Specific Tabs) ===\n');
    console.log(`Tab types: ${tabTypes.join(', ')}\n`);

    // Initialize browser
    await this.poeClient.initialize();

    try {
      // Fetch market data
      const marketData = await this.ninjaClient.fetchAllMarketData();

      // Create valuator
      const valuator = new ItemValuator(
        marketData.uniques,
        marketData.gems,
        marketData.currency,
        marketData.fragments,
        marketData.divination,
        marketData.oils,
        marketData.essences,
        marketData.divinePrice
      );

      // Fetch all stash tabs first
      const allStashTabs = await this.poeClient.getAllStashTabs();

      // Filter by type
      const stashTabs = allStashTabs.filter(tabData => {
        const tabIndex = tabData.tabs.findIndex(t => t.selected);
        if (tabIndex === -1) return false;
        const tab = tabData.tabs[tabIndex];
        return tabTypes.some(type => tab.type.toLowerCase().includes(type.toLowerCase()));
      });

      // Collect all items
      const allItems: Item[] = [];
      for (const tabData of stashTabs) {
        allItems.push(...tabData.items);
      }

      console.log(`\nTotal items found: ${allItems.length}`);
      console.log('Analyzing item values...\n');

      // Value all items
      const valuedItems: ValuedItem[] = [];
      for (const item of allItems) {
        const valued = valuator.valueItem(item);
        if (valued && valued.estimatedValue >= this.config.minValueChaos) {
          valuedItems.push(valued);
        }
      }

      // Sort by value
      valuedItems.sort((a, b) => b.estimatedValue - a.estimatedValue);

      console.log(`Found ${valuedItems.length} items worth ${this.config.minValueChaos}c or more\n`);

      // Return top N
      return valuedItems.slice(0, topN);
    } finally {
      // Always close browser
      await this.poeClient.close();
    }
  }
}
