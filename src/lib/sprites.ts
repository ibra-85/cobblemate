/**
 * PokeAPI sprites are CC-licensed and served from GitHub raw. We point
 * directly at the public mirror so no proxy is required. If the Pokémon has
 * a custom `imageUrl` field set in the data layer, prefer that.
 */

const BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export function getOfficialArtworkUrl(dexNumber: number): string {
  return `${BASE}/other/official-artwork/${dexNumber}.png`;
}

export function getSpriteUrl(dexNumber: number): string {
  return `${BASE}/${dexNumber}.png`;
}

export function getHomeSpriteUrl(dexNumber: number): string {
  return `${BASE}/other/home/${dexNumber}.png`;
}
