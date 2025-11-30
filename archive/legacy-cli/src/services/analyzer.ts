import { PoeNinjaClient } from '../api/poe-ninja-api';
import { ItemValuator } from './item-valuator';
import { Item, ValuedItem, PoeConfig } from '../models/types';

/**
 * Main analyzer service that coordinates fetching stash data and valuing items
 * NOTE: This is a placeholder - OAuth implementation will be added next
 */
export class StashAnalyzer {
  private ninjaClient: PoeNinjaClient;
  private config: PoeConfig;

  constructor(config: PoeConfig) {
    this.config = config;
    this.ninjaClient = new PoeNinjaClient(config.league);
  }

  /**
   * Analyze all stash tabs and return top valuable items
   * TODO: Implement with OAuth client
   */
  async analyzeStash(topN: number = 10): Promise<ValuedItem[]> {
    throw new Error(
      'Analyzer not yet implemented with OAuth.\n' +
      'Please run "npm run test-oauth" first to set up OAuth authentication.\n' +
      'See OAUTH_SETUP.md for instructions.'
    );
  }

  /**
   * Analyze specific tab types only (e.g., unique, currency, fragment)
   * TODO: Implement with OAuth client
   */
  async analyzeSpecificTabs(tabTypes: string[], topN: number = 10): Promise<ValuedItem[]> {
    throw new Error(
      'Analyzer not yet implemented with OAuth.\n' +
      'Please run "npm run test-oauth" first to set up OAuth authentication.\n' +
      'See OAUTH_SETUP.md for instructions.'
    );
  }
}
