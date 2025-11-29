import puppeteer, { Browser, Page } from 'puppeteer';
import { StashTabResponse, PoeConfig } from '../models/types';

/**
 * Browser-based client for POE API that bypasses Cloudflare protection
 * Uses Puppeteer to make requests in a real browser context
 */
export class PoeBrowserApiClient {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: PoeConfig;

  constructor(config: PoeConfig) {
    this.config = config;
  }

  /**
   * Initialize the browser and set cookies
   */
  async initialize(): Promise<void> {
    console.log('Launching browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();

    // Set the POESESSID cookie
    await this.page.setCookie({
      name: 'POESESSID',
      value: this.config.poesessid,
      domain: '.pathofexile.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax'
    });

    console.log('Browser initialized with session cookie');
  }

  /**
   * Fetch a specific stash tab by index
   */
  async getStashTab(tabIndex: number): Promise<StashTabResponse> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    try {
      const params = new URLSearchParams({
        league: this.config.league,
        realm: this.config.realm,
        accountName: this.config.accountName,
        tabIndex: tabIndex.toString(),
        tabs: '1'
      });

      const url = `https://www.pathofexile.com/character-window/get-stash-items?${params}`;

      console.log(`Fetching stash tab ${tabIndex} via browser...`);

      // First, navigate to the main POE site to establish session
      if (tabIndex === 0) {
        await this.page.goto('https://www.pathofexile.com/', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        await this.sleep(1000);
      }

      // Use fetch API from within the browser context (this uses the browser's cookies automatically)
      const result = await this.page.evaluate(async (apiUrl) => {
        try {
          const response = await fetch(apiUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
            }
          });

          if (!response.ok) {
            return {
              error: true,
              status: response.status,
              statusText: response.statusText,
              body: await response.text()
            };
          }

          const text = await response.text();
          return {
            error: false,
            body: text
          };
        } catch (err: any) {
          return {
            error: true,
            message: err.message
          };
        }
      }, url);

      // Check for errors
      if (result.error) {
        if ('status' in result && result.status === 403) {
          throw new Error(
            'Access forbidden (403). Please check:\n' +
            '  - Your account privacy settings are set to Public\n' +
            '  - Your POESESSID cookie is valid\n' +
            '  - Your account name is correct'
          );
        }
        throw new Error(result.message || `HTTP ${'status' in result ? result.status : 'unknown'}: ${'statusText' in result ? result.statusText : 'unknown error'}`);
      }

      if (!result.body) {
        throw new Error('Empty response from API');
      }

      // Parse JSON response
      const data = JSON.parse(result.body) as StashTabResponse;

      // Check for API error
      if ('error' in data) {
        throw new Error(`API Error: ${(data as any).error.message || 'Unknown error'}`);
      }

      // Rate limiting
      await this.sleep(1000);

      return data;
    } catch (error: any) {
      if (error.message.includes('Access forbidden')) {
        throw error;
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
   * Clean up browser resources
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('Browser closed');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
