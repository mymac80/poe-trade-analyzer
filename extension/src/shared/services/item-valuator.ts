import { Item, ValuedItem, PoeNinjaResponse, PoeNinjaCurrencyResponse, PoeNinjaLine, PoeNinjaCurrencyLine } from '../models/types';

/**
 * Service for valuing items based on market data
 */
export class ItemValuator {
  private uniqueItems: Map<string, PoeNinjaLine[]> = new Map(); // Changed to array for multiple variants
  private gems: Map<string, PoeNinjaLine[]> = new Map();
  private currency: Map<string, PoeNinjaCurrencyLine> = new Map(); // Store full line for sparkline data
  private fragments: Map<string, PoeNinjaCurrencyLine> = new Map();
  private divination: Map<string, PoeNinjaLine> = new Map();
  private oils: Map<string, PoeNinjaCurrencyLine> = new Map();
  private essences: Map<string, PoeNinjaCurrencyLine> = new Map();
  private divinePrice: number;

  constructor(
    uniqueData: PoeNinjaResponse,
    gemData: PoeNinjaResponse,
    currencyData: PoeNinjaCurrencyResponse,
    fragmentData: PoeNinjaCurrencyResponse,
    divinationData: PoeNinjaResponse,
    oilData: PoeNinjaCurrencyResponse,
    essenceData: PoeNinjaCurrencyResponse,
    divinePrice: number
  ) {
    this.divinePrice = divinePrice;
    this.loadMarketData(uniqueData, gemData, currencyData, fragmentData, divinationData, oilData, essenceData);
  }

  private loadMarketData(
    uniqueData: PoeNinjaResponse,
    gemData: PoeNinjaResponse,
    currencyData: PoeNinjaCurrencyResponse,
    fragmentData: PoeNinjaCurrencyResponse,
    divinationData: PoeNinjaResponse,
    oilData: PoeNinjaCurrencyResponse,
    essenceData: PoeNinjaCurrencyResponse
  ): void {
    // Load uniques (can have multiple variants for same unique)
    for (const line of uniqueData.lines) {
      const key = this.normalizeItemName(line.name, line.baseType);
      if (!this.uniqueItems.has(key)) {
        this.uniqueItems.set(key, []);
      }
      this.uniqueItems.get(key)!.push(line);
    }

    // Load gems (can have multiple variants for same gem)
    for (const line of gemData.lines) {
      const key = this.normalizeItemName(line.name);
      if (!this.gems.has(key)) {
        this.gems.set(key, []);
      }
      this.gems.get(key)!.push(line);
    }

    // Load currency (store full line for sparkline data)
    for (const line of currencyData.lines) {
      this.currency.set(this.normalizeItemName(line.currencyTypeName), line);
    }

    // Load fragments (store full line for sparkline data)
    for (const line of fragmentData.lines) {
      this.fragments.set(this.normalizeItemName(line.currencyTypeName), line);
    }

    // Load divination cards
    for (const line of divinationData.lines) {
      this.divination.set(this.normalizeItemName(line.name), line);
    }

    // Load oils (store full line for sparkline data)
    for (const line of oilData.lines) {
      this.oils.set(this.normalizeItemName(line.currencyTypeName), line);
    }

    // Load essences (store full line for sparkline data)
    for (const line of essenceData.lines) {
      this.essences.set(this.normalizeItemName(line.currencyTypeName), line);
    }
  }

  /**
   * Value a single item
   */
  valueItem(item: Item): ValuedItem | null {
    const itemName = item.name || item.typeLine;

    // Skip worthless items
    if (this.isWorthlessItem(item)) {
      return null;
    }

    let value = 0;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let reasoning = '';
    let liquidityEstimate: 'instant' | 'hours' | 'days' | 'slow' = 'slow';
    const specialNotes: string[] = [];
    let priceHistory: { sparkline?: number[]; totalChange: number } | undefined;

    // Check for Inscribed Ultimatum (special case, not based on frameType)
    if (this.isInscribedUltimatum(item)) {
      const ultimatumValue = this.valueInscribedUltimatum(item);
      if (ultimatumValue) {
        value = ultimatumValue.value;
        confidence = ultimatumValue.confidence;
        reasoning = ultimatumValue.reasoning;
        liquidityEstimate = ultimatumValue.liquidity;
        specialNotes.push(...(ultimatumValue.notes || []));
        priceHistory = ultimatumValue.priceHistory;
      }
    }

    // Value based on frame type
    if (value === 0) {
      switch (item.frameType) {
      case 3: // Unique
        const uniqueValue = this.valueUniqueItem(item);
        if (uniqueValue) {
          value = uniqueValue.value;
          confidence = uniqueValue.confidence;
          reasoning = uniqueValue.reasoning;
          liquidityEstimate = uniqueValue.liquidity;
          specialNotes.push(...(uniqueValue.notes || []));
          priceHistory = uniqueValue.priceHistory;
        }
        break;

      case 4: // Gem
        const gemValue = this.valueGem(item);
        if (gemValue) {
          value = gemValue.value;
          confidence = gemValue.confidence;
          reasoning = gemValue.reasoning;
          liquidityEstimate = gemValue.liquidity;
          specialNotes.push(...(gemValue.notes || []));
          priceHistory = gemValue.priceHistory;
        }
        break;

      case 5: // Currency
        const currencyValue = this.valueCurrency(item);
        if (currencyValue) {
          value = currencyValue.value;
          confidence = 'high';
          reasoning = currencyValue.reasoning;
          liquidityEstimate = 'instant';
          priceHistory = currencyValue.priceHistory;
        }
        break;

      case 6: // Divination Card
        const divValue = this.valueDivinationCard(item);
        if (divValue) {
          value = divValue.value;
          confidence = divValue.confidence;
          reasoning = divValue.reasoning;
          liquidityEstimate = divValue.liquidity;
          priceHistory = divValue.priceHistory;
        }
        break;

      case 0: // Normal
      case 1: // Magic
      case 2: // Rare
        // First check if it's a currency-like item (fragments, scarabs, oils, essences)
        // These items have frameType 0 but should be valued like currency
        const currencyLikeValue = this.valueCurrency(item);
        if (currencyLikeValue) {
          value = currencyLikeValue.value;
          confidence = 'high';
          reasoning = currencyLikeValue.reasoning;
          liquidityEstimate = 'instant';
          priceHistory = currencyLikeValue.priceHistory;
          break;
        }

        // Otherwise check if it's a valuable base or crafting item
        const rareValue = this.valueRareItem(item);
        if (rareValue) {
          value = rareValue.value;
          confidence = rareValue.confidence;
          reasoning = rareValue.reasoning;
          liquidityEstimate = rareValue.liquidity;
          specialNotes.push(...(rareValue.notes || []));
          priceHistory = rareValue.priceHistory;
        }
        break;
      }
    }

    if (value === 0) {
      return null;
    }

    // Calculate Divine value
    const divineValue = value / this.divinePrice;

    // Suggest listing price (slightly below market for faster sales)
    const suggestedPrice = {
      chaos: Math.floor(value * 0.95),
      divine: divineValue >= 1 ? Math.floor(divineValue * 0.95 * 10) / 10 : 0
    };

    return {
      item,
      estimatedValue: value,
      divineValue,
      confidence,
      reasoning,
      suggestedPrice,
      liquidityEstimate,
      specialNotes: specialNotes.length > 0 ? specialNotes : undefined,
      priceHistory
    };
  }

  private valueUniqueItem(item: Item): {
    value: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    liquidity: 'instant' | 'hours' | 'days' | 'slow';
    notes?: string[];
    priceHistory?: { sparkline?: number[]; totalChange: number };
  } | null {
    const itemName = item.name || item.typeLine;
    const baseType = item.baseType || item.typeLine;
    const key = this.normalizeItemName(itemName, baseType);

    const uniqueVariants = this.uniqueItems.get(key);

    if (!uniqueVariants || uniqueVariants.length === 0) {
      return {
        value: 1,
        confidence: 'low',
        reasoning: `Unique item "${itemName}" not found in market data`,
        liquidity: 'slow'
      };
    }

    const itemIs6Link = this.is6Link(item);

    // Find best matching variant
    let bestMatch: PoeNinjaLine | null = null;
    let bestScore = -1;
    let bestLinkDiff = Infinity; // Track link difference for tiebreaking

    for (const variant of uniqueVariants) {
      let score = 0;

      // Match corruption status
      if (variant.corrupted === item.corrupted) score += 10;

      // Match links
      const variantLinks = variant.links || 0;
      const itemLinks = itemIs6Link ? 6 : 0;
      if (variantLinks === itemLinks) score += 10;

      // Calculate link difference for tiebreaking
      const linkDiff = Math.abs(variantLinks - itemLinks);

      // Update best match if:
      // 1. This variant has a higher score, OR
      // 2. Same score but closer link match
      if (score > bestScore || (score === bestScore && linkDiff < bestLinkDiff)) {
        bestScore = score;
        bestLinkDiff = linkDiff;
        bestMatch = variant;
      }
    }

    if (!bestMatch) {
      return null;
    }

    let value = bestMatch.chaosValue;
    const notes: string[] = [];

    // Add notes about special attributes
    if (itemIs6Link) {
      notes.push('6-LINK');
      if (value < 10) {
        value = Math.max(value, 10); // Minimum value for 6-link
      }
    }

    if (item.corrupted) {
      notes.push('Corrupted');
      // Check for good corruption implicits
      if (item.implicitMods && item.implicitMods.length > 0) {
        const hasGoodCorruption = item.implicitMods.some(mod =>
          mod.includes('+') && (mod.includes('level') || mod.includes('maximum') || mod.includes('increased'))
        );
        if (hasGoodCorruption) {
          notes.push('Good corruption implicit');
        }
      }
    }

    // Determine liquidity based on value
    const liquidity: 'instant' | 'hours' | 'days' | 'slow' =
      value > 100 ? 'hours' :
      value > 20 ? 'days' :
      'slow';

    // Extract price history (sparkline)
    let priceHistory: { sparkline?: number[]; totalChange: number } | undefined;
    const sparklineData = bestMatch.sparkline || bestMatch.lowConfidenceSparkline;

    if (sparklineData) {
      priceHistory = {
        sparkline: sparklineData.data,
        totalChange: sparklineData.totalChange
      };
    }

    return {
      value,
      confidence: bestScore >= 20 ? 'high' : bestScore >= 10 ? 'medium' : 'low',
      reasoning: `Unique "${itemName}" (${bestMatch.links || 0}-link${item.corrupted ? ', corrupted' : ''})`,
      liquidity,
      notes: notes.length > 0 ? notes : undefined,
      priceHistory
    };
  }

  private valueGem(item: Item): {
    value: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    liquidity: 'instant' | 'hours' | 'days' | 'slow';
    notes?: string[];
    priceHistory?: { sparkline?: number[]; totalChange: number };
  } | null {
    const gemName = item.typeLine;
    const key = this.normalizeItemName(gemName);
    const gemVariants = this.gems.get(key);

    if (!gemVariants || gemVariants.length === 0) {
      return null;
    }

    // Extract gem level and quality
    const level = this.getGemLevel(item);
    const quality = this.getGemQuality(item);

    // Find best matching variant
    let bestMatch: PoeNinjaLine | null = null;
    let bestScore = -1;
    let bestQualityDiff = Infinity; // Track quality difference for tiebreaking

    for (const variant of gemVariants) {
      let score = 0;
      if (variant.gemLevel === level) score += 10;
      if (variant.gemQuality === quality) score += 10;
      if (variant.corrupted === item.corrupted) score += 5;

      // Calculate quality difference for tiebreaking
      const qualityDiff = Math.abs((variant.gemQuality || 0) - quality);

      // Update best match if:
      // 1. This variant has a higher score, OR
      // 2. Same score but closer quality match
      if (score > bestScore || (score === bestScore && qualityDiff < bestQualityDiff)) {
        bestScore = score;
        bestQualityDiff = qualityDiff;
        bestMatch = variant;
      }
    }

    if (!bestMatch) {
      return null;
    }

    const value = bestMatch.chaosValue;
    const notes: string[] = [];

    // Add gem details to notes
    if (level >= 20) notes.push(`Level ${level}`);
    if (quality >= 20) notes.push(`Quality ${quality}%`);
    if (item.corrupted) notes.push('Corrupted');

    // Check for exceptional gems
    if (level === 21 && quality >= 20) {
      notes.push('21/20 gem');
    }
    if (level === 21 && quality === 23) {
      notes.push('PERFECT 21/23');
    }

    const liquidity: 'instant' | 'hours' | 'days' | 'slow' =
      value > 50 ? 'hours' :
      value > 10 ? 'days' :
      'slow';

    // Extract price history (sparkline)
    let priceHistory: { sparkline?: number[]; totalChange: number } | undefined;
    const sparklineData = bestMatch.sparkline || bestMatch.lowConfidenceSparkline;

    if (sparklineData) {
      priceHistory = {
        sparkline: sparklineData.data,
        totalChange: sparklineData.totalChange
      };
    }

    return {
      value,
      confidence: bestScore >= 20 ? 'high' : 'medium',
      reasoning: `Gem ${gemName} (${level}/${quality}${item.corrupted ? ', corrupted' : ''})`,
      liquidity,
      notes: notes.length > 0 ? notes : undefined,
      priceHistory
    };
  }

  private valueCurrency(item: Item): {
    value: number;
    reasoning: string;
    priceHistory?: { sparkline?: number[]; totalChange: number };
  } | null {
    const currencyName = item.typeLine;
    const key = this.normalizeItemName(currencyName);

    // Check currency map
    let currencyLine = this.currency.get(key);

    // Check fragments map
    if (!currencyLine) {
      currencyLine = this.fragments.get(key);
    }

    // Check oils map
    if (!currencyLine) {
      currencyLine = this.oils.get(key);
    }

    // Check essences map
    if (!currencyLine) {
      currencyLine = this.essences.get(key);
    }

    if (!currencyLine) {
      return null;
    }

    const chaosValue = currencyLine.chaosEquivalent;

    // Account for stack size
    const stackSize = this.getStackSize(item);
    const totalValue = chaosValue * stackSize;

    // Extract price history (sparkline)
    let priceHistory: { sparkline?: number[]; totalChange: number } | undefined;

    // Try pay sparkline first (most reliable for currencies)
    const sparklineData = currencyLine.lowConfidencePaySparkLine || currencyLine.lowConfidenceReceiveSparkLine;

    if (sparklineData) {
      priceHistory = {
        sparkline: sparklineData.data,
        totalChange: sparklineData.totalChange
      };
    }

    return {
      value: totalValue,
      reasoning: `${currencyName} x${stackSize} @ ${chaosValue.toFixed(2)}c each`,
      priceHistory
    };
  }

  private valueDivinationCard(item: Item): {
    value: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    liquidity: 'instant' | 'hours' | 'days' | 'slow';
    priceHistory?: { sparkline?: number[]; totalChange: number };
  } | null {
    const cardName = item.typeLine;
    const key = this.normalizeItemName(cardName);
    const marketData = this.divination.get(key);

    if (!marketData || marketData.chaosValue < 0.5) {
      return null;
    }

    const stackSize = this.getStackSize(item);
    const value = marketData.chaosValue * stackSize;

    const liquidity: 'instant' | 'hours' | 'days' | 'slow' =
      value > 50 ? 'hours' :
      value > 10 ? 'days' :
      'slow';

    // Extract price history (sparkline)
    let priceHistory: { sparkline?: number[]; totalChange: number } | undefined;
    const sparklineData = marketData.sparkline || marketData.lowConfidenceSparkline;

    if (sparklineData) {
      priceHistory = {
        sparkline: sparklineData.data,
        totalChange: sparklineData.totalChange
      };
    }

    return {
      value,
      confidence: 'high',
      reasoning: `${cardName} x${stackSize} @ ${marketData.chaosValue.toFixed(1)}c each`,
      liquidity,
      priceHistory
    };
  }

  private valueRareItem(item: Item): {
    value: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    liquidity: 'instant' | 'hours' | 'days' | 'slow';
    notes?: string[];
    priceHistory?: { sparkline?: number[]; totalChange: number };
  } | null {
    const notes: string[] = [];

    // Check for 6-link
    if (this.is6Link(item)) {
      notes.push('6-LINK rare');
      return {
        value: 15,
        confidence: 'medium',
        reasoning: 'Rare 6-link item (base value)',
        liquidity: 'hours',
        notes
      };
    }

    // Check for high ilvl bases with good influences
    if (item.ilvl >= 85) {
      const hasInfluence = item.implicitMods?.some(mod =>
        mod.includes('Shaper') || mod.includes('Elder') || mod.includes('Crusader') ||
        mod.includes('Hunter') || mod.includes('Redeemer') || mod.includes('Warlord')
      );

      if (hasInfluence) {
        notes.push(`iLvl ${item.ilvl} influenced base`);
        return {
          value: 5,
          confidence: 'low',
          reasoning: `High iLvl influenced rare (potential craft base)`,
          liquidity: 'slow',
          notes
        };
      }
    }

    return null;
  }

  private isInscribedUltimatum(item: Item): boolean {
    return item.typeLine?.toLowerCase().includes('inscribed ultimatum') || false;
  }

  private valueInscribedUltimatum(item: Item): {
    value: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    liquidity: 'instant' | 'hours' | 'days' | 'slow';
    notes?: string[];
    priceHistory?: { sparkline?: number[]; totalChange: number };
  } | null {
    const notes: string[] = [];

    // Extract sacrifice and reward from properties
    const sacrificeProperty = item.properties?.find(p =>
      p.name?.toLowerCase().includes('sacrifice') ||
      p.name?.toLowerCase().includes('requires sacrifice')
    );

    const rewardProperty = item.properties?.find(p =>
      p.name?.toLowerCase().includes('reward')
    );

    if (!sacrificeProperty || !rewardProperty) {
      // Basic Inscribed Ultimatum with no clear sacrifice/reward
      return {
        value: 20,
        confidence: 'low',
        reasoning: 'Inscribed Ultimatum (base estimate)',
        liquidity: 'hours',
        notes: ['Check trade site for exact pricing']
      };
    }

    // Extract sacrifice details
    const sacrificeText = sacrificeProperty.values?.[0]?.[0] || '';
    const rewardText = rewardProperty.values?.[0]?.[0] || '';

    notes.push(`Sacrifice: ${sacrificeText}`);
    notes.push(`Reward: ${rewardText}`);

    let value = 20; // Base value in chaos
    let reasoning = 'Inscribed Ultimatum';

    // Check for Divine Orb sacrifice (high value)
    if (sacrificeText.toLowerCase().includes('divine orb')) {
      const divineMatch = sacrificeText.match(/(\d+)/);
      const divineCount = divineMatch ? parseInt(divineMatch[1]) : 1;

      // Extract multiplier from reward text
      let multiplier = 2; // Default: doubles
      if (rewardText.toLowerCase().includes('triple')) multiplier = 3;
      else if (rewardText.toLowerCase().includes('quadruple')) multiplier = 4;
      else if (rewardText.toLowerCase().includes('quintuple')) multiplier = 5;

      // Calculate potential reward value
      const potentialReward = divineCount * multiplier * this.divinePrice;

      // Apply discount factor (60-70% of face value due to ~20% failure risk)
      const discountFactor = 0.65;
      value = potentialReward * discountFactor;

      reasoning = `Inscribed Ultimatum: ${divineCount} Divine → ${multiplier * divineCount} Divine (${(discountFactor * 100).toFixed(0)}% value)`;
      notes.push('Divine Orb sacrifice - HIGH VALUE');
      notes.push('~20% failure risk factored in');
    }
    // Check for Exalted Orb sacrifice
    else if (sacrificeText.toLowerCase().includes('exalted orb')) {
      const exaltedMatch = sacrificeText.match(/(\d+)/);
      const exaltedCount = exaltedMatch ? parseInt(exaltedMatch[1]) : 1;

      // Get exalted price from currency map
      const exaltedLine = this.currency.get('exalted orb');
      const exaltedPrice = exaltedLine?.chaosEquivalent || 30;

      let multiplier = 2;
      if (rewardText.toLowerCase().includes('triple')) multiplier = 3;
      else if (rewardText.toLowerCase().includes('quadruple')) multiplier = 4;

      const potentialReward = exaltedCount * multiplier * exaltedPrice;
      const discountFactor = 0.65;
      value = potentialReward * discountFactor;

      reasoning = `Inscribed Ultimatum: ${exaltedCount} Exalted → ${multiplier * exaltedCount} Exalted`;
      notes.push('Exalted Orb sacrifice');
    }
    // Check for Chaos Orb sacrifice
    else if (sacrificeText.toLowerCase().includes('chaos orb')) {
      const chaosMatch = sacrificeText.match(/(\d+)/);
      const chaosCount = chaosMatch ? parseInt(chaosMatch[1]) : 1;

      let multiplier = 2;
      if (rewardText.toLowerCase().includes('triple')) multiplier = 3;

      const potentialReward = chaosCount * multiplier;
      const discountFactor = 0.7; // Higher discount for chaos (less risky investment)
      value = potentialReward * discountFactor;

      reasoning = `Inscribed Ultimatum: ${chaosCount}c → ${multiplier * chaosCount}c`;
      notes.push('Chaos Orb sacrifice');
    }
    // Other sacrifice types (fragments, scarabs, etc.)
    else {
      value = 30; // Estimated base value for other types
      reasoning = `Inscribed Ultimatum: ${sacrificeText}`;
      notes.push('Check trade site for exact pricing');
    }

    // Area level affects tier (higher = harder = more valuable)
    const areaLevel = item.ilvl || 0;
    if (areaLevel >= 83) {
      notes.push(`Area Level ${areaLevel} (high tier)`);
      value *= 1.1; // 10% bonus for high tier
    }

    notes.push('Heuristic estimate (not tracked by poe.ninja)');

    const liquidity: 'instant' | 'hours' | 'days' | 'slow' =
      value > 100 ? 'hours' :
      value > 50 ? 'days' :
      'slow';

    return {
      value,
      confidence: 'medium',
      reasoning,
      liquidity,
      notes: notes.length > 0 ? notes : undefined
    };
  }

  private isWorthlessItem(item: Item): boolean {
    const itemName = (item.typeLine || '').toLowerCase();

    // Don't skip currency-like items (fragments, scarabs, oils, essences)
    // These have frameType 0 but are valuable
    if (itemName.includes('scarab') ||
        itemName.includes('fragment') ||
        itemName.includes(' oil') ||
        itemName.includes('essence') ||
        itemName.includes('breachstone') ||
        itemName.includes('emblem')) {
      return false;
    }

    // Skip identified rares with bad mods
    if (item.frameType === 2 && item.identified && !this.is6Link(item) && item.ilvl < 84) {
      return true;
    }

    // Skip normal/magic items unless they're special
    if ((item.frameType === 0 || item.frameType === 1) && !this.is6Link(item) && item.ilvl < 86) {
      return true;
    }

    return false;
  }

  private is6Link(item: Item): boolean {
    if (!item.sockets || item.sockets.length < 6) return false;

    const groups = new Set(item.sockets.map(s => s.group));
    return groups.size === 1;
  }

  private getGemLevel(item: Item): number {
    const levelProp = item.properties?.find(p => p.name === 'Level');
    if (levelProp && levelProp.values.length > 0) {
      return parseInt(levelProp.values[0][0]) || 1;
    }
    return 1;
  }

  private getGemQuality(item: Item): number {
    // Check main properties first
    const qualityProp = item.properties?.find(p => p.name === 'Quality');
    if (qualityProp && qualityProp.values.length > 0) {
      const qualityStr = qualityProp.values[0][0];
      return parseInt(qualityStr.replace(/[^0-9]/g, '')) || 0;
    }

    // Check additional properties (some gems store quality here)
    const additionalQualityProp = item.additionalProperties?.find(p => p.name === 'Quality');
    if (additionalQualityProp && additionalQualityProp.values.length > 0) {
      const qualityStr = additionalQualityProp.values[0][0];
      return parseInt(qualityStr.replace(/[^0-9]/g, '')) || 0;
    }

    // No quality found (0% quality gems don't have Quality property)
    return 0;
  }

  private getStackSize(item: Item): number {
    const stackProp = item.properties?.find(p => p.name === 'Stack Size');
    if (stackProp && stackProp.values.length > 0) {
      const stackStr = stackProp.values[0][0];
      const parts = stackStr.split('/');
      return parseInt(parts[0]) || 1;
    }
    return 1;
  }

  private normalizeItemName(...parts: (string | null | undefined)[]): string {
    return parts
      .filter(p => p)
      .join(' ')
      .toLowerCase()
      .trim();
  }
}
