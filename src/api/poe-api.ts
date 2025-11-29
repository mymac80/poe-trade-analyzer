import axios, { AxiosInstance } from 'axios';
import { StashTabResponse, PoeConfig } from '../models/types';

/**
 * Client for interacting with the official Path of Exile API
 */
export class PoeApiClient {
  private client: AxiosInstance;
  private config: PoeConfig;

  constructor(config: PoeConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://www.pathofexile.com',
      headers: {
        'Cookie': `POESESSID=${config.poesessid}`,
        'User-Agent': 'POE-Trader-Analyzer/1.0'
      },
      timeout: 30000
    });
  }

  /**
   * Fetch a specific stash tab by index
   */
  async getStashTab(tabIndex: number): Promise<StashTabResponse> {
    try {
      const params = {
        league: this.config.league,
        realm: this.config.realm,
        accountName: this.config.accountName,
        tabIndex: tabIndex,
        tabs: 1
      };

      console.log(`Fetching stash tab ${tabIndex}...`);

      const response = await this.client.get<StashTabResponse>(
        '/character-window/get-stash-items',
        { params }
      );

      // Rate limiting: Path of Exile API has strict rate limits
      await this.sleep(1000);

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error(
          'Authentication failed. Please check your POESESSID cookie. ' +
          'Make sure it\'s valid and you\'re logged into pathofexile.com'
        );
      }
      if (error.response?.status === 429) {
        throw new Error('Rate limited by POE API. Please wait a few minutes and try again.');
      }
      throw new Error(`Failed to fetch stash tab ${tabIndex}: ${error.message}`);
    }
  }

  /**
   * Fetch all stash tabs for the account
   */
  async getAllStashTabs(): Promise<StashTabResponse[]> {
    const tabs: StashTabResponse[] = [];

    // First, get tab 0 to know how many tabs exist
    const firstTab = await this.getStashTab(0);
    tabs.push(firstTab);

    const totalTabs = firstTab.numTabs;
    console.log(`Found ${totalTabs} total stash tabs`);

    // Determine which tabs to fetch
    const tabIndicesToFetch = this.config.stashTabIndices && this.config.stashTabIndices.length > 0
      ? this.config.stashTabIndices.filter(i => i > 0 && i < totalTabs)
      : Array.from({ length: totalTabs - 1 }, (_, i) => i + 1);

    console.log(`Fetching ${tabIndicesToFetch.length} additional tabs...`);

    // Fetch remaining tabs
    for (const tabIndex of tabIndicesToFetch) {
      try {
        const tab = await this.getStashTab(tabIndex);
        tabs.push(tab);
        console.log(`  Tab ${tabIndex}: "${tab.tabs[tabIndex].n}" (${tab.items.length} items)`);
      } catch (error: any) {
        console.error(`Warning: Failed to fetch tab ${tabIndex}: ${error.message}`);
      }
    }

    return tabs;
  }

  /**
   * Fetch only specific tab types (e.g., unique, currency, fragment)
   */
  async getStashTabsByType(types: string[]): Promise<StashTabResponse[]> {
    const allTabs = await this.getAllStashTabs();
    return allTabs.filter(tabData => {
      const tabIndex = tabData.tabs.findIndex(t => t.selected);
      if (tabIndex === -1) return false;
      const tab = tabData.tabs[tabIndex];
      return types.some(type => tab.type.toLowerCase().includes(type.toLowerCase()));
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
