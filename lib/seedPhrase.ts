// BIP39 Seed Phrase Recovery for Key A
import * as bip39 from 'bip39';
import { HDKey } from '@scure/bip32';

export interface SeedPhraseResult {
  mnemonic: string;
  keyA: string;
}

// Generate 12-word BIP39 seed phrase and derive Key A
export async function generateSeedPhrase(): Promise<SeedPhraseResult> {
  const mnemonic = bip39.generateMnemonic(128); // 12 words
  const keyA = await deriveKeyA(mnemonic);
  return { mnemonic, keyA };
}

// Recover Key A from 12-word seed phrase
export async function recoverKeyA(mnemonic: string): Promise<string> {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid seed phrase');
  }
  return deriveKeyA(mnemonic);
}

// Derive Key A from mnemonic using BIP32 HD derivation
async function deriveKeyA(mnemonic: string): Promise<string> {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const hdkey = HDKey.fromMasterSeed(seed);
  const derived = hdkey.derive("m/44'/0'/0'/0/0");
  
  if (!derived.privateKey) {
    throw new Error('Failed to derive key');
  }
  
  return Buffer.from(derived.privateKey).toString('base64');
}

// Validate seed phrase format
export function validateSeedPhrase(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

// Split mnemonic into word array
export function parseSeedPhrase(input: string): string[] {
  return input.trim().toLowerCase().split(/\s+/);
}

// Join word array into mnemonic
export function formatSeedPhrase(words: string[]): string {
  return words.join(' ');
}
