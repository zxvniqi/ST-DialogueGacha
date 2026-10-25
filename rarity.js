// Cosmetic rarity tiers for the gacha reveal.

export const RARITIES = Object.freeze([
    { id: 'N', stars: 1, weight: 55, color: '#9aa4b2' },
    { id: 'R', stars: 2, weight: 30, color: '#4f9dff' },
    { id: 'SR', stars: 3, weight: 12, color: '#b26bff' },
    { id: 'SSR', stars: 4, weight: 3, color: '#ffb020' },
]);

const TOTAL_WEIGHT = RARITIES.reduce((sum, rarity) => sum + rarity.weight, 0);

export function rollRarity() {
    let roll = Math.random() * TOTAL_WEIGHT;
    for (const rarity of RARITIES) {
        roll -= rarity.weight;
        if (roll < 0) {
            return rarity;
        }
    }
    return RARITIES[0];
}
