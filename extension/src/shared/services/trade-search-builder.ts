/**
 * Build trade search URLs for specific item types
 */

import { Item } from '../models/types';

export interface TradeSearchQuery {
  league: string;
  searchUrl: string;
  apiQuery?: any; // For programmatic searches
}

/**
 * Build a trade search for an Inscribed Ultimatum
 * @param includeOutput - If false, only filter by sacrifice (broader search)
 */
export function buildInscribedUltimatumSearch(item: Item, league: string, includeOutput: boolean = true): TradeSearchQuery {
  // Extract ultimatum details from the item
  const details = extractUltimatumDetails(item);

  if (!details) {
    console.error('[Trade Search] Could not extract Ultimatum details from item');
    throw new Error('Could not extract Ultimatum details from item');
  }

  // For now, we'll construct a manual search URL
  // In the future, we could use the trade API to create programmatic searches

  // Base trade search URL
  const baseUrl = `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}`;

  // For Inscribed Ultimatums, the main filters are:
  // - Item type: "Inscribed Ultimatum"
  // - Requires Sacrifice: Divine Orb/Exalted Orb/etc
  // - Area Level: 83 (for valuable ones)

  // Note: POE trade searches require creating a search via POST request first,
  // which returns a query ID. We can't easily construct a direct URL.

  // Build ultimatum filters object
  const ultimatumFilters: any = {};

  // Add sacrifice filter (input)
  if (details.sacrifice) {
    ultimatumFilters.ultimatum_input = {
      option: details.sacrifice
    };
  }

  // Add reward type filter (what KIND of reward)
  const rewardTypeResult = determineRewardType(details.sacrifice, details.reward);
  if (rewardTypeResult) {
    ultimatumFilters.ultimatum_reward = {
      option: rewardTypeResult.rewardType
    };

    // Add reward output filter (specific item name)
    // Only include for unique exchanges, not for doubling/tripling/mirror rewards
    if (includeOutput && rewardTypeResult.shouldIncludeOutput && details.reward) {
      ultimatumFilters.ultimatum_output = {
        option: details.reward
      };
    }
  }

  // Build the complete API query
  const apiQuery = {
    query: {
      status: {
        option: "available" // Show available listings (online + offline)
      },
      type: "Inscribed Ultimatum",
      stats: [
        {
          type: "and",
          filters: [],
          disabled: false
        }
      ],
      filters: {
        ultimatum_filters: {
          filters: ultimatumFilters,
          disabled: false
        }
      }
    },
    sort: {
      price: "asc" // Lowest price first
    }
  };

  return {
    league,
    searchUrl: baseUrl,
    apiQuery
  };
}

/**
 * Determine the reward type code for POE trade API
 * Returns { rewardType, shouldIncludeOutput }
 */
function determineRewardType(sacrifice: string, reward: string): { rewardType: string; shouldIncludeOutput: boolean } | null {
  if (!reward) return null;

  const rewardLower = reward.toLowerCase();
  const sacrificeLower = sacrifice.toLowerCase();

  // Check for doubling/tripling keywords in reward text
  // Examples: "Doubles sacrificed Currency", "Triples sacrificed Currency"
  if (rewardLower.includes('double') && rewardLower.includes('currency')) {
    return { rewardType: 'DoubleCurrency', shouldIncludeOutput: false };
  }

  if (rewardLower.includes('triple') && rewardLower.includes('currency')) {
    return { rewardType: 'TripleCurrency', shouldIncludeOutput: false };
  }

  if (rewardLower.includes('double') && (rewardLower.includes('divination') || rewardLower.includes('card'))) {
    return { rewardType: 'DoubleDivCards', shouldIncludeOutput: false };
  }

  if (rewardLower.includes('triple') && (rewardLower.includes('divination') || rewardLower.includes('card'))) {
    return { rewardType: 'TripleDivCards', shouldIncludeOutput: false };
  }

  if (rewardLower.includes('mirror')) {
    return { rewardType: 'MirrorRare', shouldIncludeOutput: false };
  }

  // If none of the above, it's likely a unique item exchange
  // (sacrifice one unique, get a different specific unique)
  return { rewardType: 'ExchangeUnique', shouldIncludeOutput: true };
}

/**
 * Extract details from an Inscribed Ultimatum item
 */
function extractUltimatumDetails(item: Item): {
  challenge: string;
  areaLevel: number;
  sacrifice: string;
  reward: string;
  multiplier: string;
} | null {
  try {
    // Inscribed Ultimatums have their details in the properties array
    const properties = item.properties || [];

    let challenge = '';
    let areaLevel = 0;
    let sacrifice = '';
    let reward = '';
    let multiplier = '';

    for (const prop of properties) {
      if (prop.name === 'Challenge') {
        challenge = prop.values?.[0]?.[0] || '';
      } else if (prop.name === 'Area Level') {
        const levelStr = prop.values?.[0]?.[0] || '0';
        areaLevel = parseInt(levelStr);
      } else if (prop.name.includes('Requires Sacrifice')) {
        sacrifice = prop.values?.[0]?.[0] || '';
      } else if (prop.name.includes('Reward')) {
        reward = prop.values?.[0]?.[0] || '';

        // Extract multiplier (e.g., "doubles", "triples")
        const lowerReward = reward.toLowerCase();
        if (lowerReward.includes('double')) multiplier = 'doubles';
        else if (lowerReward.includes('triple')) multiplier = 'triples';
      }
    }

    if (!challenge || !sacrifice) {
      console.warn('[Trade Search] Missing required fields - challenge or sacrifice not found');
      return null;
    }

    return {
      challenge,
      areaLevel,
      sacrifice,
      reward,
      multiplier
    };
  } catch (error) {
    console.error('[Trade Search] Error extracting ultimatum details:', error);
    return null;
  }
}

/**
 * Create a trade search via the official API
 * Returns { url, resultCount } or null on error
 */
export async function createTradeSearch(query: any, league: string): Promise<{ url: string; resultCount: number } | null> {
  try {
    const url = `https://www.pathofexile.com/api/trade/search/${encodeURIComponent(league)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Trade Search] API error:', errorText);
      throw new Error(`Trade API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error('[Trade Search] API returned error:', data.error);
      throw new Error(`Trade API error: ${JSON.stringify(data.error)}`);
    }

    if (data.id) {
      const totalResults = data.total || 0;
      const searchUrl = `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}/${data.id}`;

      // Log the successful search creation (user finds this helpful!)
      console.log('[POE Pricer] Trade search created successfully:', searchUrl);

      if (totalResults === 0) {
        console.warn('[Trade Search] Search returned 0 results - no listings found for this exact combination');
      }

      return {
        url: searchUrl,
        resultCount: totalResults
      };
    }

    console.warn('[Trade Search] No search ID returned from API');
    return null;
  } catch (error) {
    console.error('[Trade Search] Error creating search:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Check if an item type supports trade search pricing
 */
export function supportsTradeSearch(item: Item): boolean {
  // For now, only support Inscribed Ultimatums
  // We can expand this to other items later
  return item.typeLine.includes('Inscribed Ultimatum');
}
