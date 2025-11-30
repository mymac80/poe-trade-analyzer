// Core data models for Path of Exile items and API responses

export interface PoeConfig {
  accountName: string;
  poesessid: string;
  league: string;
  realm: string;
  stashTabIndices?: number[];
  minValueChaos: number;
}

export interface StashTab {
  n: string; // Tab name
  i: number; // Tab index
  id: string; // Tab ID
  type: string; // Tab type
  hidden?: boolean;
  selected?: boolean;
  colour?: { r: number; g: number; b: number };
  srcL?: string;
  srcC?: string;
  srcR?: string;
}

export interface Property {
  name: string;
  values: Array<[string, number]>;
  displayMode?: number;
  type?: number;
}

export interface Socket {
  group: number;
  attr?: string;
  sColour: string;
}

export interface ItemMod {
  name?: string;
  tier?: string;
  level?: number;
  magnitudes?: Array<{ hash: string; min: number; max: number }>;
}

export interface Item {
  verified: boolean;
  w: number; // Width
  h: number; // Height
  icon: string;
  league: string;
  id: string;
  name: string;
  typeLine: string;
  baseType: string;
  identified: boolean;
  ilvl: number;
  properties?: Property[];
  requirements?: Property[];
  implicitMods?: string[];
  explicitMods?: string[];
  craftedMods?: string[];
  enchantMods?: string[];
  fracturedMods?: string[];
  corrupted?: boolean;
  unmodifiable?: boolean;
  cisRaceReward?: boolean;
  seaRaceReward?: boolean;
  thRaceReward?: boolean;
  properties2?: Property[];
  nextLevelRequirements?: Property[];
  additionalProperties?: Property[];
  socketedItems?: Item[];
  sockets?: Socket[];
  frameType: number; // 0=normal, 1=magic, 2=rare, 3=unique, 4=gem, 5=currency, 6=divination, 8=prophecy, 9=relic
  x?: number;
  y?: number;
  inventoryId?: string;
  flavourText?: string[];
  descrText?: string;
  secDescrText?: string;
  category?: any;
  extended?: {
    category?: string;
    subcategories?: string[];
    prefixes?: number;
    suffixes?: number;
  };
}

export interface StashTabResponse {
  numTabs: number;
  tabs: StashTab[];
  items: Item[];
}

// poe.ninja API models
export interface PoeNinjaLine {
  id?: number;
  name: string;
  icon?: string;
  mapTier?: number;
  levelRequired?: number;
  baseType?: string | null;
  stackSize?: number;
  variant?: string | null;
  prophecyText?: string | null;
  artFilename?: string | null;
  links?: number;
  itemClass?: number;
  sparkline?: {
    data: number[];
    totalChange: number;
  };
  lowConfidenceSparkline?: {
    data: number[];
    totalChange: number;
  };
  implicitModifiers?: ItemMod[];
  explicitModifiers?: ItemMod[];
  flavourText?: string;
  corrupted?: boolean;
  gemLevel?: number;
  gemQuality?: number;
  itemType?: string;
  chaosValue: number;
  exaltedValue?: number;
  divineValue?: number;
  count?: number;
  detailsId?: string;
  tradeInfo?: any;
}

export interface PoeNinjaResponse {
  lines: PoeNinjaLine[];
  language?: {
    name: string;
    translations: Record<string, any>;
  };
}

export interface PoeNinjaCurrencyLine {
  currencyTypeName: string;
  pay?: {
    id: number;
    league_id: number;
    pay_currency_id: number;
    get_currency_id: number;
    sample_time_utc: string;
    count: number;
    value: number;
    data_point_count: number;
    includes_secondary: boolean;
  };
  receive?: {
    id: number;
    league_id: number;
    pay_currency_id: number;
    get_currency_id: number;
    sample_time_utc: string;
    count: number;
    value: number;
    data_point_count: number;
    includes_secondary: boolean;
  };
  chaosEquivalent: number;
  lowConfidencePaySparkLine?: {
    data: number[];
    totalChange: number;
  };
  lowConfidenceReceiveSparkLine?: {
    data: number[];
    totalChange: number;
  };
  detailsId?: string;
}

export interface PoeNinjaCurrencyResponse {
  lines: PoeNinjaCurrencyLine[];
  currencyDetails: Array<{
    id: number;
    icon: string;
    name: string;
    tradeId?: string;
  }>;
}

export interface ValuedItem {
  item: Item;
  estimatedValue: number; // In Chaos Orbs
  divineValue: number; // In Divine Orbs
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  suggestedPrice: {
    chaos: number;
    divine: number;
  };
  marketData?: {
    listingsFound: number;
    averagePrice?: number;
    lowestPrice?: number;
    trend?: 'rising' | 'falling' | 'stable';
  };
  liquidityEstimate: 'instant' | 'hours' | 'days' | 'slow';
  specialNotes?: string[];
}
