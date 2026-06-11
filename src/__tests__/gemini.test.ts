import { describe, it, expect, vi } from 'vitest';

// Mock familyStore to prevent Firebase initialization in jsdom
vi.mock('../stores/familyStore', () => ({
  useFamilyStore: {
    getState: () => ({ customIngredients: [] }),
  },
}));

import { estimateDishCalories, getCookingGuide } from '../core/gemini';

// VITE_GEMINI_API_KEY is undefined in test env → mock path taken (no network calls)

describe('Gemini mock fallback', () => {
  it('estimateDishCalories returns valid numeric fields for a known dish', async () => {
    const result = await estimateDishCalories('phở bò');
    expect(result.calories).toBeGreaterThan(0);
    expect(result.proteinGrams).toBeGreaterThan(0);
    expect(result.carbsGrams).toBeGreaterThan(0);
    expect(result.fatGrams).toBeGreaterThan(0);
    expect(typeof result.note).toBe('string');
  });

  it('estimateDishCalories returns higher calories for lẩu (650) than cháo (260)', async () => {
    const hotpot = await estimateDishCalories('lẩu thái hải sản');
    const porridge = await estimateDishCalories('cháo hành');
    expect(hotpot.calories).toBe(650);
    expect(porridge.calories).toBe(260);
  });

  it('getCookingGuide returns a non-empty string with expected sections', async () => {
    const result = await getCookingGuide('cá lóc kho tộ');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(50);
    expect(result).toContain('**Nguyên liệu:**');
    expect(result).toContain('**Cách làm:**');
    expect(result).toContain('**Mẹo:**');
  });
});
