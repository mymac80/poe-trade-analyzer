import axios, { AxiosInstance } from 'axios';
import { PoeNinjaResponse, PoeNinjaCurrencyResponse, PoeNinjaLine, PoeNinjaCurrencyLine } from '../models/types';

/**
 * Client for interacting with poe.ninja API for market pricing data
 */
export class PoeNinjaClient {
  private client: AxiosInstance;
  private league: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(league: string) {
    this.league = league;
    this.client = axios.create({
      baseURL: 'https://poe.ninja/api/data',
      timeout: 15000,
      headers: {
        'User-Agent': 'POE-Stash-Pricer-Extension/1.0'
      }
    });
  }

  /**
   * Fetch currency prices (chaos, divine, exalted, etc.)
   */
  async getCurrencyPrices(): Promise<PoeNinjaCurrencyResponse> {
    return this.getCachedData('currency', async () => {
      const response = await this.client.get<PoeNinjaCurrencyResponse>('/currencyoverview', {
        params: {
          league: this.league,
          type: 'Currency'
        }
      });
      return response.data;
    });
  }

  /**
   * Fetch fragment prices (breachstones, emblems, etc.)
   */
  async getFragmentPrices(): Promise<PoeNinjaCurrencyResponse> {
    return this.getCachedData('fragments', async () => {
      const response = await this.client.get<PoeNinjaCurrencyResponse>('/currencyoverview', {
        params: {
          league: this.league,
          type: 'Fragment'
        }
      });

      return response.data;
    });
  }

  /**
   * Fetch scarab prices (separate category in recent leagues)
   */
  async getScarabPrices(): Promise<PoeNinjaCurrencyResponse> {
    return this.getCachedData('scarabs', async () => {
      // First try: currencyoverview with Scarab type
      try {
        const response = await this.client.get<PoeNinjaCurrencyResponse>('/currencyoverview', {
          params: {
            league: this.league,
            type: 'Scarab'
          }
        });
        if (response.data?.lines?.length > 0) {
          return response.data;
        }
      } catch (error: any) {
        console.warn(`[POE Pricer] currencyoverview Scarab failed:`, error.message);
      }

      // Second try: itemoverview with Scarab type (current league uses this endpoint)
      try {
        const itemResponse = await this.client.get<PoeNinjaResponse>('/itemoverview', {
          params: {
            league: this.league,
            type: 'Scarab'
          }
        });

        if (itemResponse.data?.lines?.length > 0) {
          // Convert item overview format to currency format
          const converted: PoeNinjaCurrencyResponse = {
            lines: itemResponse.data.lines.map((item: any) => ({
              currencyTypeName: item.name,
              chaosEquivalent: item.chaosValue,
              // Note: pay/receive fields are not fully populated for scarabs
              // since they come from itemoverview, not currencyoverview
            } as PoeNinjaCurrencyLine)),
            currencyDetails: [] // Empty for scarabs from itemoverview
          };

          return converted;
        }
      } catch (itemError: any) {
        console.warn('[POE Pricer] itemoverview Scarab failed:', itemError.message);
      }

      // Third try: Check if it's in a different category (e.g., "Artifact" in some leagues)
      const alternativeTypes = ['Artifact', 'Memory', 'Misc'];
      for (const altType of alternativeTypes) {
        try {
          const response = await this.client.get<PoeNinjaCurrencyResponse>('/currencyoverview', {
            params: {
              league: this.league,
              type: altType
            }
          });

          if (response.data?.lines) {
            const scarabs = response.data.lines.filter(line =>
              line.currencyTypeName.toLowerCase().includes('scarab')
            );

            if (scarabs.length > 0) {
              return { lines: scarabs, currencyDetails: response.data.currencyDetails || [] };
            }
          }
        } catch (e) {
          // Ignore errors for alternative types
        }
      }

      return { lines: [], currencyDetails: [] };
    });
  }

  /**
   * Fetch unique item prices
   */
  async getUniqueItemPrices(): Promise<PoeNinjaResponse> {
    return this.getCachedData('uniques', async () => {
      const [armours, weapons, accessories, flasks, jewels, maps] = await Promise.all([
        this.fetchItemOverview('UniqueArmour'),
        this.fetchItemOverview('UniqueWeapon'),
        this.fetchItemOverview('UniqueAccessory'),
        this.fetchItemOverview('UniqueFlask'),
        this.fetchItemOverview('UniqueJewel'),
        this.fetchItemOverview('UniqueMap')
      ]);

      return {
        lines: [
          ...armours.lines,
          ...weapons.lines,
          ...accessories.lines,
          ...flasks.lines,
          ...jewels.lines,
          ...maps.lines
        ]
      };
    });
  }

  /**
   * Fetch skill gem prices
   */
  async getSkillGemPrices(): Promise<PoeNinjaResponse> {
    return this.getCachedData('gems', async () => {
      const response = await this.client.get<PoeNinjaResponse>('/itemoverview', {
        params: {
          league: this.league,
          type: 'SkillGem'
        }
      });
      return response.data;
    });
  }

  /**
   * Fetch divination card prices
   */
  async getDivinationCardPrices(): Promise<PoeNinjaResponse> {
    return this.getCachedData('divination', async () => {
      const response = await this.client.get<PoeNinjaResponse>('/itemoverview', {
        params: {
          league: this.league,
          type: 'DivinationCard'
        }
      });
      return response.data;
    });
  }

  /**
   * Fetch base type prices (influenced bases, etc.)
   */
  async getBaseTypePrices(): Promise<PoeNinjaResponse> {
    return this.getCachedData('bases', async () => {
      const response = await this.client.get<PoeNinjaResponse>('/itemoverview', {
        params: {
          league: this.league,
          type: 'BaseType'
        }
      });
      return response.data;
    });
  }

  /**
   * Fetch oil prices
   */
  async getOilPrices(): Promise<PoeNinjaCurrencyResponse> {
    return this.getCachedData('oils', async () => {
      const response = await this.client.get<PoeNinjaCurrencyResponse>('/currencyoverview', {
        params: {
          league: this.league,
          type: 'Oil'
        }
      });
      return response.data;
    });
  }

  /**
   * Fetch essence prices
   */
  async getEssencePrices(): Promise<PoeNinjaCurrencyResponse> {
    return this.getCachedData('essences', async () => {
      const response = await this.client.get<PoeNinjaCurrencyResponse>('/currencyoverview', {
        params: {
          league: this.league,
          type: 'Essence'
        }
      });
      return response.data;
    });
  }

  /**
   * Get Divine Orb price in Chaos Orbs
   */
  async getDivinePrice(): Promise<number> {
    const currencyData = await this.getCurrencyPrices();
    const divine = currencyData.lines.find(
      line => line.currencyTypeName === 'Divine Orb'
    );
    return divine?.chaosEquivalent || 200; // Fallback to 200c if not found
  }

  /**
   * Fetch all relevant market data at once
   */
  async fetchAllMarketData(): Promise<{
    currency: PoeNinjaCurrencyResponse;
    fragments: PoeNinjaCurrencyResponse;
    scarabs: PoeNinjaCurrencyResponse;
    uniques: PoeNinjaResponse;
    gems: PoeNinjaResponse;
    divination: PoeNinjaResponse;
    oils: PoeNinjaCurrencyResponse;
    essences: PoeNinjaCurrencyResponse;
    divinePrice: number;
  }> {
    console.log('[POE Pricer] Fetching market data from poe.ninja...');

    const [currency, fragments, scarabs, uniques, gems, divination, oils, essences] = await Promise.all([
      this.getCurrencyPrices(),
      this.getFragmentPrices(),
      this.getScarabPrices(),
      this.getUniqueItemPrices(),
      this.getSkillGemPrices(),
      this.getDivinationCardPrices(),
      this.getOilPrices(),
      this.getEssencePrices()
    ]);

    const divinePrice = await this.getDivinePrice();

    console.log(`[POE Pricer] Market data loaded: Divine = ${divinePrice}c`);
    console.log(`[POE Pricer]   Unique items: ${uniques.lines.length}`);
    console.log(`[POE Pricer]   Skill gems: ${gems.lines.length}`);
    console.log(`[POE Pricer]   Currency: ${currency.lines.length}`);
    console.log(`[POE Pricer]   Fragments: ${fragments.lines.length}`);
    console.log(`[POE Pricer]   Scarabs: ${scarabs.lines.length}`);
    console.log(`[POE Pricer]   Divination cards: ${divination.lines.length}`);

    return { currency, fragments, scarabs, uniques, gems, divination, oils, essences, divinePrice };
  }

  private async fetchItemOverview(type: string): Promise<PoeNinjaResponse> {
    try {
      const response = await this.client.get<PoeNinjaResponse>('/itemoverview', {
        params: {
          league: this.league,
          type
        }
      });
      return response.data;
    } catch (error) {
      console.warn(`[POE Pricer] Failed to fetch ${type} from poe.ninja:`, error);
      return { lines: [] };
    }
  }

  private async getCachedData<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }
}
