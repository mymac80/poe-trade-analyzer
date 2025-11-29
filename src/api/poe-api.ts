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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.pathofexile.com/',
        'Origin': 'https://www.pathofexile.com',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
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
      console.log('Request params:', params);
      console.log('Request headers:', this.client.defaults.headers);

      const response = await this.client.get<StashTabResponse>(
        '/character-window/get-stash-items',
        { params }
      );

      // Rate limiting: Path of Exile API has strict rate limits
      await this.sleep(1000);

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.error('API Response:', error.response?.data);
        throw new Error(
          'Authentication failed (403). Possible causes:\n' +
          '  - POESESSID cookie is invalid or expired\n' +
          '  - Account privacy is set to Private (must be Public)\n' +
          '  - League name is incorrect (check case-sensitivity)\n' +
          `  - Attempted URL: /character-window/get-stash-items?league=${this.config.league}&realm=${this.config.realm}&accountName=${this.config.accountName}`
        );
      }
      if (error.response?.status === 429) {
        throw new Error('Rate limited by POE API. Please wait a few minutes and try again.');
      }
      console.error('Full error:', error.response?.data || error.message);
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
