import * as dotenv from 'dotenv';
import * as path from 'path';
import { PoeConfig } from '../models/types';

/**
 * Load configuration from environment variables
 */
export function loadConfig(): PoeConfig {
  // Load .env file
  dotenv.config();

  const accountName = process.env.POE_ACCOUNT_NAME;
  const poesessid = process.env.POE_POESESSID;
  const league = process.env.POE_LEAGUE || 'Settlers';
  const realm = process.env.POE_REALM || 'pc';
  const minValueChaos = parseInt(process.env.MIN_VALUE_CHAOS || '5');

  if (!accountName) {
    throw new Error('POE_ACCOUNT_NAME is required in .env file');
  }

  if (!poesessid) {
    throw new Error('POE_POESESSID is required in .env file');
  }

  // Parse stash tab indices if provided
  let stashTabIndices: number[] | undefined;
  const indicesStr = process.env.STASH_TAB_INDICES;
  if (indicesStr && indicesStr.trim()) {
    stashTabIndices = indicesStr
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));
  }

  return {
    accountName,
    poesessid,
    league,
    realm,
    stashTabIndices,
    minValueChaos
  };
}
