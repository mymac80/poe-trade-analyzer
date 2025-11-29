import { ValuedItem } from '../models/types';

/**
 * Format valued items for display
 */
export class ResultFormatter {
  /**
   * Format top items as a nice table
   */
  static formatTopItems(items: ValuedItem[]): string {
    if (items.length === 0) {
      return 'No valuable items found above the minimum threshold.';
    }

    let output = '\n╔═══════════════════════════════════════════════════════════════════════════════╗\n';
    output += '║                          TOP VALUABLE ITEMS TO SELL                           ║\n';
    output += '╚═══════════════════════════════════════════════════════════════════════════════╝\n\n';

    items.forEach((valued, index) => {
      const item = valued.item;
      const rank = `#${index + 1}`;
      const itemName = this.getItemDisplayName(item);
      const value = valued.estimatedValue;
      const divineValue = valued.divineValue;

      output += `${rank.padEnd(4)} ${itemName}\n`;
      output += `     ${'═'.repeat(75)}\n`;

      // Price line
      const chaosStr = `${value.toFixed(1)}c`;
      const divineStr = divineValue >= 1 ? ` (${divineValue.toFixed(2)} div)` : '';
      output += `     Value: ${chaosStr}${divineStr}\n`;

      // Suggested listing price
      const suggestedChaos = valued.suggestedPrice.chaos;
      const suggestedDivine = valued.suggestedPrice.divine;
      const priceStr = suggestedDivine >= 1
        ? `${suggestedDivine.toFixed(1)} divine`
        : `${suggestedChaos} chaos`;
      output += `     List at: ${priceStr}\n`;

      // Confidence and liquidity
      const confidence = this.getConfidenceIcon(valued.confidence);
      const liquidity = this.getLiquidityString(valued.liquidityEstimate);
      output += `     Confidence: ${confidence}  |  Est. Sale Time: ${liquidity}\n`;

      // Reasoning
      output += `     ${valued.reasoning}\n`;

      // Special notes
      if (valued.specialNotes && valued.specialNotes.length > 0) {
        output += `     Notes: ${valued.specialNotes.join(', ')}\n`;
      }

      // Market data if available
      if (valued.marketData) {
        const md = valued.marketData;
        if (md.listingsFound > 0) {
          output += `     Market: ${md.listingsFound} listings`;
          if (md.lowestPrice) {
            output += `, lowest: ${md.lowestPrice.toFixed(1)}c`;
          }
          if (md.trend) {
            output += `, trend: ${this.getTrendIcon(md.trend)}`;
          }
          output += '\n';
        }
      }

      output += '\n';
    });

    return output;
  }

  /**
   * Format summary statistics
   */
  static formatSummary(items: ValuedItem[]): string {
    if (items.length === 0) {
      return '';
    }

    const totalValue = items.reduce((sum, item) => sum + item.estimatedValue, 0);
    const totalDivine = items.reduce((sum, item) => sum + item.divineValue, 0);
    const avgValue = totalValue / items.length;

    let output = '\n╔═══════════════════════════════════════════════════════════════════════════════╗\n';
    output += '║                                    SUMMARY                                    ║\n';
    output += '╚═══════════════════════════════════════════════════════════════════════════════╝\n\n';
    output += `  Total items shown: ${items.length}\n`;
    output += `  Combined value: ${totalValue.toFixed(1)}c (${totalDivine.toFixed(2)} divine)\n`;
    output += `  Average value: ${avgValue.toFixed(1)}c per item\n`;

    // Breakdown by liquidity
    const liquidityCounts = {
      instant: items.filter(i => i.liquidityEstimate === 'instant').length,
      hours: items.filter(i => i.liquidityEstimate === 'hours').length,
      days: items.filter(i => i.liquidityEstimate === 'days').length,
      slow: items.filter(i => i.liquidityEstimate === 'slow').length
    };

    output += '\n  Liquidity breakdown:\n';
    if (liquidityCounts.instant > 0) output += `    Quick sell (instant-hours): ${liquidityCounts.instant + liquidityCounts.hours}\n`;
    if (liquidityCounts.days > 0) output += `    Medium (days): ${liquidityCounts.days}\n`;
    if (liquidityCounts.slow > 0) output += `    Slow (may take time): ${liquidityCounts.slow}\n`;

    output += '\n';

    return output;
  }

  /**
   * Get display name for an item
   */
  private static getItemDisplayName(item: any): string {
    const name = item.name || item.typeLine;
    const basetype = item.baseType && item.baseType !== item.typeLine ? ` (${item.baseType})` : '';
    return `${name}${basetype}`;
  }

  /**
   * Get confidence icon
   */
  private static getConfidenceIcon(confidence: string): string {
    switch (confidence) {
      case 'high': return '●●● High';
      case 'medium': return '●●○ Medium';
      case 'low': return '●○○ Low';
      default: return confidence;
    }
  }

  /**
   * Get liquidity string
   */
  private static getLiquidityString(liquidity: string): string {
    switch (liquidity) {
      case 'instant': return 'Instant';
      case 'hours': return 'Hours';
      case 'days': return 'Days';
      case 'slow': return 'Slow (may take time)';
      default: return liquidity;
    }
  }

  /**
   * Get trend icon
   */
  private static getTrendIcon(trend: string): string {
    switch (trend) {
      case 'rising': return '↑ Rising';
      case 'falling': return '↓ Falling';
      case 'stable': return '→ Stable';
      default: return trend;
    }
  }

  /**
   * Export items to JSON
   */
  static toJSON(items: ValuedItem[]): string {
    return JSON.stringify(items, null, 2);
  }

  /**
   * Export items to CSV
   */
  static toCSV(items: ValuedItem[]): string {
    if (items.length === 0) {
      return 'No items to export';
    }

    const headers = [
      'Rank',
      'Item Name',
      'Value (Chaos)',
      'Value (Divine)',
      'Suggested Price (Chaos)',
      'Suggested Price (Divine)',
      'Confidence',
      'Liquidity',
      'Reasoning'
    ];

    const rows = items.map((valued, index) => {
      const item = valued.item;
      return [
        index + 1,
        this.getItemDisplayName(item),
        valued.estimatedValue.toFixed(1),
        valued.divineValue.toFixed(2),
        valued.suggestedPrice.chaos,
        valued.suggestedPrice.divine.toFixed(2),
        valued.confidence,
        valued.liquidityEstimate,
        valued.reasoning.replace(/,/g, ';') // Escape commas
      ];
    });

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }
}
