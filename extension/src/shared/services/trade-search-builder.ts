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
 */
export function buildInscribedUltimatumSearch(item: Item, league: string): TradeSearchQuery {
  console.log('[Trade Search] buildInscribedUltimatumSearch called');
  console.log('[Trade Search] Item:', item);
  console.log('[Trade Search] League:', league);

  // Extract ultimatum details from the item
  const details = extractUltimatumDetails(item);
  console.log('[Trade Search] Details extracted:', details);

  if (!details) {
    console.error('[Trade Search] Could not extract Ultimatum details from item');
    throw new Error('Could not extract Ultimatum details from item');
  }

  console.log('[Trade Search] Details validation passed ✓');

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

  // Alternative approach: Return a search query object that can be POSTed
  const apiQuery = {
    query: {
      status: {
        option: "online" // Only show online sellers
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
          filters: {
            // Future: Add specific input/reward filters here
            // "ultimatum_input": { "option": "..." }
            // "ultimatum_reward": { "option": "..." }
          },
          disabled: false
        }
      }
    },
    sort: {
      price: "asc" // Lowest price first
    }
  };

  // Add sacrifice filter if we know it
  if (details.sacrifice) {
    // Note: This would need to be added as a specific filter
    // POE trade uses complex filter IDs that we'd need to map
    console.log(`[Trade Search] Would filter by sacrifice: ${details.sacrifice}`);
  }

  return {
    league,
    searchUrl: baseUrl,
    apiQuery
  };
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
    console.log('[Trade Search] Extracting details from item:', item);

    // Inscribed Ultimatums have their details in the properties array
    const properties = item.properties || [];
    console.log('[Trade Search] Properties:', properties);

    let challenge = '';
    let areaLevel = 0;
    let sacrifice = '';
    let reward = '';
    let multiplier = '';

    for (const prop of properties) {
      if (prop.name === 'Challenge') {
        // Format: { name: "Challenge", values: [["Stand in the Stone Circles", 0]] }
        challenge = prop.values?.[0]?.[0] || '';
      } else if (prop.name === 'Area Level') {
        // Format: { name: "Area Level", values: [["83", 0]] }
        const levelStr = prop.values?.[0]?.[0] || '0';
        areaLevel = parseInt(levelStr);
      } else if (prop.name.includes('Requires Sacrifice')) {
        // Format: { name: "Requires Sacrifice: {0} {1}", values: [["Divine Orb", 18], ["x1", 0]] }
        sacrifice = prop.values?.[0]?.[0] || '';
      } else if (prop.name.includes('Reward')) {
        // Format: { name: "Reward: {0}", values: [["Doubles sacrificed Currency", 0]] }
        reward = prop.values?.[0]?.[0] || '';

        // Extract multiplier (e.g., "doubles", "triples")
        const lowerReward = reward.toLowerCase();
        if (lowerReward.includes('double')) multiplier = 'doubles';
        else if (lowerReward.includes('triple')) multiplier = 'triples';
      }
    }

    console.log('[Trade Search] Extracted:', { challenge, areaLevel, sacrifice, reward, multiplier });

    if (!challenge || !sacrifice) {
      console.warn('[Trade Search] Missing required fields - challenge:', challenge, 'sacrifice:', sacrifice);
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
 */
export async function createTradeSearch(query: any, league: string): Promise<string | null> {
  try {
    console.log('[Trade Search] Creating search with query:', JSON.stringify(query, null, 2));
    console.log('[Trade Search] League:', league);

    const url = `https://www.pathofexile.com/api/trade/search/${encodeURIComponent(league)}`;
    console.log('[Trade Search] URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    });

    console.log('[Trade Search] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Trade Search] API error response:', errorText);
      throw new Error(`Trade API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[Trade Search] Response data:', data);

    if (data.id) {
      // Return the full search URL
      const searchUrl = `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}/${data.id}`;
      console.log('[Trade Search] Search URL created:', searchUrl);
      return searchUrl;
    }

    console.warn('[Trade Search] No ID in response');
    return null;
  } catch (error) {
    console.error('[Trade Search] Error creating search:', error);
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
