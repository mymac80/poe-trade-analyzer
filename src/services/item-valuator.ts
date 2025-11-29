import { Item, ValuedItem, PoeNinjaResponse, PoeNinjaCurrencyResponse, PoeNinjaLine } from '../models/types';

/**
 * Service for valuing items based on market data
 */
export class ItemValuator {
  private uniqueItems: Map<string, PoeNinjaLine> = new Map();
  private gems: Map<string, PoeNinjaLine[]> = new Map();
  private currency: Map<string, number> = new Map();
  private fragments: Map<string, number> = new Map();
  private divination: Map<string, PoeNinjaLine> = new Map();
  private oils: Map<string, number> = new Map();
  private essences: Map<string, number> = new Map();
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
    // Load uniques
    for (const line of uniqueData.lines) {
      const key = this.normalizeItemName(line.name, line.baseType);
      this.uniqueItems.set(key, line);
    }

    // Load gems (can have multiple variants for same gem)
    for (const line of gemData.lines) {
      const key = this.normalizeItemName(line.name);
      if (!this.gems.has(key)) {
        this.gems.set(key, []);
      }
      this.gems.get(key)!.push(line);
    }

    // Load currency
    for (const line of currencyData.lines) {
      this.currency.set(this.normalizeItemName(line.currencyTypeName), line.chaosEquivalent);
    }

    // Load fragments
    for (const line of fragmentData.lines) {
      this.fragments.set(this.normalizeItemName(line.currencyTypeName), line.chaosEquivalent);
    }

    // Load divination cards
    for (const line of divinationData.lines) {
      this.divination.set(this.normalizeItemName(line.name), line);
    }

    // Load oils
    for (const line of oilData.lines) {
      this.oils.set(this.normalizeItemName(line.currencyTypeName), line.chaosEquivalent);
    }

    // Load essences
    for (const line of essenceData.lines) {
      this.essences.set(this.normalizeItemName(line.currencyTypeName), line.chaosEquivalent);
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

    // Value based on frame type
    switch (item.frameType) {
      case 3: // Unique
        const uniqueValue = this.valueUniqueItem(item);
        if (uniqueValue) {
          value = uniqueValue.value;
          confidence = uniqueValue.confidence;
          reasoning = uniqueValue.reasoning;
          liquidityEstimate = uniqueValue.liquidity;
          specialNotes.push(...(uniqueValue.notes || []));
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
        }
        break;

      case 5: // Currency
        const currencyValue = this.valueCurrency(item);
        if (currencyValue) {
          value = currencyValue.value;
          confidence = 'high';
          reasoning = currencyValue.reasoning;
          liquidityEstimate = 'instant';
        }
        break;

      case 6: // Divination Card
        const divValue = this.valueDivinationCard(item);
        if (divValue) {
          value = divValue.value;
          confidence = divValue.confidence;
          reasoning = divValue.reasoning;
          liquidityEstimate = divValue.liquidity;
        }
        break;

      case 0: // Normal
      case 1: // Magic
      case 2: // Rare
        // Check if it's a valuable base or crafting item
        const rareValue = this.valueRareItem(item);
        if (rareValue) {
          value = rareValue.value;
          confidence = rareValue.confidence;
          reasoning = rareValue.reasoning;
          liquidityEstimate = rareValue.liquidity;
          specialNotes.push(...(rareValue.notes || []));
        }
        break;
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
      specialNotes: specialNotes.length > 0 ? specialNotes : undefined
    };
  }

  private valueUniqueItem(item: Item): {
    value: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    liquidity: 'instant' | 'hours' | 'days' | 'slow';
    notes?: string[];
  } | null {
    const itemName = item.name || item.typeLine;
    const baseType = item.baseType || item.typeLine;
    const key = this.normalizeItemName(itemName, baseType);

    const marketData = this.uniqueItems.get(key);

    if (!marketData) {
      return {
        value: 1,
        confidence: 'low',
        reasoning: `Unique item "${itemName}" not found in market data`,
        liquidity: 'slow'
      };
    }

    let value = marketData.chaosValue;
    const notes: string[] = [];

    // Check for 6-link
    if (this.is6Link(item)) {
      notes.push('6-LINK');
      if (value < 10) {
        value = Math.max(value, 10); // Minimum value for 6-link
      }
    }

    // Check for corruption
    if (item.corrupted) {
      notes.push('Corrupted');
      // Corrupted items usually worth less unless they have good implicits
      if (item.implicitMods && item.implicitMods.length > 0) {
        const hasGoodCorruption = item.implicitMods.some(mod =>
          mod.includes('+') && (mod.includes('level') || mod.includes('maximum') || mod.includes('increased'))
        );
        if (hasGoodCorruption) {
          notes.push('Good corruption implicit');
          value *= 1.5;
        }
      }
    }

    // Check if item is meta-relevant
    const isHighValue = value > 50;
    const liquidity: 'instant' | 'hours' | 'days' | 'slow' =
      value > 100 ? 'hours' :
      value > 20 ? 'days' :
      'slow';

    return {
      value,
      confidence: 'high',
      reasoning: `Unique "${itemName}" market price: ${value.toFixed(1)}c`,
      liquidity,
      notes: notes.length > 0 ? notes : undefined
    };
  }

  private valueGem(item: Item): {
    value: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    liquidity: 'instant' | 'hours' | 'days' | 'slow';
    notes?: string[];
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

    for (const variant of gemVariants) {
      let score = 0;
      if (variant.gemLevel === level) score += 10;
      if (variant.gemQuality === quality) score += 10;
      if (variant.corrupted === item.corrupted) score += 5;

      if (score > bestScore) {
        bestScore = score;
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

    return {
      value,
      confidence: bestScore >= 20 ? 'high' : 'medium',
      reasoning: `Gem ${gemName} (${level}/${quality}${item.corrupted ? ', corrupted' : ''})`,
      liquidity,
      notes: notes.length > 0 ? notes : undefined
    };
  }

  private valueCurrency(item: Item): { value: number; reasoning: string } | null {
    const currencyName = item.typeLine;
    const key = this.normalizeItemName(currencyName);

    // Check currency map
    let chaosValue = this.currency.get(key);

    // Check fragments map
    if (!chaosValue) {
      chaosValue = this.fragments.get(key);
    }

    // Check oils map
    if (!chaosValue) {
      chaosValue = this.oils.get(key);
    }

    // Check essences map
    if (!chaosValue) {
      chaosValue = this.essences.get(key);
    }

    if (!chaosValue) {
      return null;
    }

    // Account for stack size
    const stackSize = this.getStackSize(item);
    const totalValue = chaosValue * stackSize;

    return {
      value: totalValue,
      reasoning: `${currencyName} x${stackSize} @ ${chaosValue.toFixed(2)}c each`
    };
  }

  private valueDivinationCard(item: Item): {
    value: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    liquidity: 'instant' | 'hours' | 'days' | 'slow';
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

    return {
      value,
      confidence: 'high',
      reasoning: `${cardName} x${stackSize} @ ${marketData.chaosValue.toFixed(1)}c each`,
      liquidity
    };
  }

  private valueRareItem(item: Item): {
    value: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    liquidity: 'instant' | 'hours' | 'days' | 'slow';
    notes?: string[];
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

  private isWorthlessItem(item: Item): boolean {
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
    const qualityProp = item.properties?.find(p => p.name === 'Quality');
    if (qualityProp && qualityProp.values.length > 0) {
      const qualityStr = qualityProp.values[0][0];
      return parseInt(qualityStr.replace(/[^0-9]/g, '')) || 0;
    }
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
