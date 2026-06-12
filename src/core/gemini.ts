import { useFamilyStore } from '../stores/familyStore';
import { api } from '../utils/apiClient';

interface SuggestionRequest {
  dailyCalorieTarget: number;
  availableIngredients: string[];
  recentMeals: string[];
}

export interface Meal {
  recipeName: string;
  calories: number;
  estimatedCost: number;
  ingredientsUsed: string[];
}

export interface DailyMenuResponse {
  meals: {
    breakfast: Meal[];
    lunch: Meal[];
    dinner: Meal[];
  };
  totalDayCalories: number;
  estimatedTotalCost: number;
  nutritionSummary: {
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
  healthNote: string;
}

export type FoodPreference = 'any' | 'com' | 'bun_pho_my' | 'chao_sup' | 'lau_nuong' | 'mon_cuon' | 'chay';

export interface MealSuggestionRequest {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  preference: FoodPreference;
  familySize: number;
  availableIngredients: string[];
  recentMeals: string[];
}

export interface MealOption extends Meal {
  description: string;
}

export interface CalorieEstimate {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  note: string;
}

type RecipeType = 'breakfast' | 'main' | 'soup' | 'hotpot';

const MOCK_RECIPES: {
  name: string;
  type: RecipeType;
  pref: FoodPreference;
  calories: number;
  cost: number;
  ingredients: string[];
}[] = [
  // Breakfast — bún/phở/mỳ
  { name: 'Phở bò', type: 'breakfast', pref: 'bun_pho_my', calories: 450, cost: 45000, ingredients: ['thit_bo', 'gao', 'hanh_toi'] },
  { name: 'Bún sườn heo', type: 'breakfast', pref: 'bun_pho_my', calories: 420, cost: 35000, ingredients: ['thit_heo', 'gao', 'hanh_toi'] },
  { name: 'Bún bò Huế', type: 'breakfast', pref: 'bun_pho_my', calories: 500, cost: 40000, ingredients: ['thit_bo', 'thit_heo', 'hanh_toi'] },
  // Breakfast — cháo/súp
  { name: 'Cháo sườn heo', type: 'breakfast', pref: 'chao_sup', calories: 300, cost: 20000, ingredients: ['thit_heo', 'gao', 'hanh_toi'] },
  { name: 'Cháo trứng gà', type: 'breakfast', pref: 'chao_sup', calories: 260, cost: 18000, ingredients: ['trung_ga', 'gao', 'hanh_toi'] },
  { name: 'Cháo cá lóc', type: 'breakfast', pref: 'chao_sup', calories: 280, cost: 30000, ingredients: ['ca_loc', 'gao', 'hanh_toi'] },
  // Breakfast — cơm (com tấm, etc.)
  { name: 'Trứng ốp la bánh mì', type: 'breakfast', pref: 'com', calories: 350, cost: 15000, ingredients: ['trung_ga', 'gia_vi'] },
  { name: 'Bánh mì pate trứng', type: 'breakfast', pref: 'com', calories: 320, cost: 22000, ingredients: ['trung_ga', 'gia_vi'] },
  { name: 'Cơm tấm sườn trứng', type: 'breakfast', pref: 'com', calories: 580, cost: 40000, ingredients: ['thit_heo', 'trung_ga', 'gao', 'gia_vi'] },

  // Main — cơm
  { name: 'Thịt kho trứng tộ', type: 'main', pref: 'com', calories: 450, cost: 50000, ingredients: ['thit_heo', 'trung_ga', 'hanh_toi'] },
  { name: 'Cá lóc kho tộ', type: 'main', pref: 'com', calories: 320, cost: 45000, ingredients: ['ca_loc', 'hanh_toi'] },
  { name: 'Sườn kho ngũ vị', type: 'main', pref: 'com', calories: 400, cost: 55000, ingredients: ['thit_heo', 'hanh_toi', 'gia_vi'] },
  { name: 'Bò xào hành cần', type: 'main', pref: 'com', calories: 380, cost: 70000, ingredients: ['thit_bo', 'hanh_toi'] },
  { name: 'Cá điêu hồng chiên xù', type: 'main', pref: 'com', calories: 360, cost: 55000, ingredients: ['ca_dieu_hong', 'hanh_toi'] },
  { name: 'Tôm rim tỏi', type: 'main', pref: 'com', calories: 280, cost: 65000, ingredients: ['tom', 'hanh_toi'] },
  { name: 'Gà chiên mắm', type: 'main', pref: 'com', calories: 420, cost: 60000, ingredients: ['thit_ga', 'hanh_toi', 'gia_vi'] },
  { name: 'Gà luộc muối tiêu chanh', type: 'main', pref: 'com', calories: 350, cost: 80000, ingredients: ['thit_ga', 'hanh_toi'] },
  { name: 'Cá điêu hồng hấp gừng hành', type: 'main', pref: 'com', calories: 280, cost: 60000, ingredients: ['ca_dieu_hong', 'hanh_toi', 'gia_vi'] },
  // Main — bún/phở/mỳ
  { name: 'Bún thịt nướng', type: 'main', pref: 'bun_pho_my', calories: 480, cost: 45000, ingredients: ['thit_heo', 'gao', 'hanh_toi', 'gia_vi'] },
  { name: 'Mỳ xào bò', type: 'main', pref: 'bun_pho_my', calories: 520, cost: 55000, ingredients: ['thit_bo', 'hanh_toi', 'gia_vi'] },
  // Main — cháo/súp
  { name: 'Canh rau muống luộc', type: 'soup', pref: 'chao_sup', calories: 80, cost: 10000, ingredients: ['rau_muong'] },
  { name: 'Canh rau ngót thịt băm', type: 'soup', pref: 'chao_sup', calories: 150, cost: 20000, ingredients: ['rau_ngot', 'thit_heo', 'hanh_toi'] },
  { name: 'Canh bí đỏ thịt băm', type: 'soup', pref: 'chao_sup', calories: 180, cost: 22000, ingredients: ['bi_do', 'thit_heo'] },
  { name: 'Canh chua cá lóc', type: 'soup', pref: 'chao_sup', calories: 220, cost: 45000, ingredients: ['ca_loc', 'ca_chua', 'hanh_toi'] },
  { name: 'Canh đậu hũ cà chua', type: 'soup', pref: 'chao_sup', calories: 110, cost: 15000, ingredients: ['dau_hu', 'ca_chua', 'hanh_toi'] },
  { name: 'Canh mướp hương tôm', type: 'soup', pref: 'chao_sup', calories: 140, cost: 35000, ingredients: ['muop_huong', 'tom', 'hanh_toi'] },
  // Lẩu/Nướng
  { name: 'Lẩu thái hải sản', type: 'hotpot', pref: 'lau_nuong', calories: 800, cost: 220000, ingredients: ['tom', 'ca_loc', 'ca_chua', 'hanh_toi', 'gia_vi'] },
  { name: 'Lẩu gà lá giang', type: 'hotpot', pref: 'lau_nuong', calories: 700, cost: 180000, ingredients: ['thit_ga', 'hanh_toi', 'gia_vi'] },
  { name: 'Lẩu bò nhúng dấm', type: 'hotpot', pref: 'lau_nuong', calories: 750, cost: 250000, ingredients: ['thit_bo', 'hanh_toi', 'gia_vi'] },
  { name: 'Thịt nướng sả ớt', type: 'hotpot', pref: 'lau_nuong', calories: 520, cost: 90000, ingredients: ['thit_heo', 'hanh_toi', 'gia_vi'] },
  // Món cuốn
  { name: 'Gỏi cuốn tôm thịt', type: 'main', pref: 'mon_cuon', calories: 280, cost: 50000, ingredients: ['tom', 'thit_heo', 'rau_muong', 'gia_vi'] },
  { name: 'Bánh tráng cuốn thịt heo', type: 'main', pref: 'mon_cuon', calories: 320, cost: 45000, ingredients: ['thit_heo', 'rau_muong', 'gia_vi'] },
  { name: 'Bò nướng cuốn bánh tráng', type: 'main', pref: 'mon_cuon', calories: 380, cost: 80000, ingredients: ['thit_bo', 'rau_muong', 'gia_vi'] },
  // Chay
  { name: 'Đậu hũ sốt me', type: 'main', pref: 'chay', calories: 240, cost: 25000, ingredients: ['dau_hu', 'ca_chua', 'gia_vi'] },
  { name: 'Canh khổ qua đậu hũ', type: 'soup', pref: 'chay', calories: 120, cost: 20000, ingredients: ['dau_hu', 'gia_vi'] },
  { name: 'Cơm chiên dương châu chay', type: 'main', pref: 'chay', calories: 480, cost: 30000, ingredients: ['trung_ga', 'gao', 'ca_chua', 'gia_vi'] },
  { name: 'Rau luộc chấm tương', type: 'soup', pref: 'chay', calories: 90, cost: 15000, ingredients: ['rau_muong', 'gia_vi'] },
];

// ─── Ingredient map helper ────────────────────────────────────────────────────

function buildIngredientMap(availableIngredients: string[]): Record<string, string> {
  const customIngredients = useFamilyStore.getState().customIngredients || [];
  return Object.fromEntries(
    availableIngredients.map(id => {
      const ing = customIngredients.find(i => i.id === id);
      return [id, ing?.name ?? id];
    }),
  );
}

// ─── Response shape guards ────────────────────────────────────────────────────

function isDailyMenuResponse(obj: unknown): obj is DailyMenuResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  const meals = o.meals;
  if (typeof meals !== 'object' || meals === null) return false;
  const m = meals as Record<string, unknown>;
  if (!Array.isArray(m.breakfast) || !Array.isArray(m.lunch) || !Array.isArray(m.dinner)) return false;
  if (typeof o.totalDayCalories !== 'number') return false;
  const ns = o.nutritionSummary;
  if (typeof ns !== 'object' || ns === null) return false;
  const n = ns as Record<string, unknown>;
  return typeof n.proteinGrams === 'number' && typeof n.carbsGrams === 'number' && typeof n.fatGrams === 'number';
}

function isMealOptionArray(obj: unknown): obj is MealOption[] {
  if (!Array.isArray(obj) || obj.length === 0) return false;
  return (obj as unknown[]).every(item => {
    if (typeof item !== 'object' || item === null) return false;
    const i = item as Record<string, unknown>;
    return typeof i.recipeName === 'string' && typeof i.calories === 'number' && typeof i.description === 'string';
  });
}

function isCalorieEstimate(obj: unknown): obj is CalorieEstimate {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return typeof o.calories === 'number' && typeof o.proteinGrams === 'number' &&
    typeof o.carbsGrams === 'number' && typeof o.fatGrams === 'number';
}

// ─── API-backed implementations ──────────────────────────────────────────────

export async function generateDailyMenu(req: SuggestionRequest): Promise<DailyMenuResponse> {
  try {
    const result = await api.post<DailyMenuResponse>('/ai/daily-menu', {
      dailyCalorieTarget: req.dailyCalorieTarget,
      availableIngredients: req.availableIngredients,
      ingredientMap: buildIngredientMap(req.availableIngredients),
      recentMeals: req.recentMeals,
    });
    if (!isDailyMenuResponse(result)) throw new Error('Invalid response shape');
    return result;
  } catch (err) {
    console.error('generateDailyMenu failed, falling back to mock:', err);
    return generateMockMenu(req);
  }
}

export async function generateMealSuggestions(req: MealSuggestionRequest): Promise<MealOption[]> {
  try {
    const result = await api.post<MealOption[]>('/ai/meal-suggestions', {
      ...req,
      ingredientMap: buildIngredientMap(req.availableIngredients),
    });
    if (!isMealOptionArray(result)) throw new Error('Invalid response shape');
    return result;
  } catch (err) {
    console.error('generateMealSuggestions failed, falling back to mock:', err);
    return generateMockMealSuggestions(req);
  }
}

export async function estimateDishCalories(dishName: string): Promise<CalorieEstimate> {
  try {
    const result = await api.post<CalorieEstimate>('/ai/estimate-calories', { dishName });
    if (!isCalorieEstimate(result)) throw new Error('Invalid response shape');
    return result;
  } catch (err) {
    console.error('estimateDishCalories failed, falling back to mock:', err);
    return estimateCaloriesMock(dishName);
  }
}

export async function getCookingGuide(dishName: string): Promise<string> {
  try {
    const result = await api.post<{ guide: string }>('/ai/cooking-guide', { dishName });
    return result.guide;
  } catch (err) {
    console.error('getCookingGuide failed, falling back to mock:', err);
    return getCookingGuideMock(dishName);
  }
}

// ─── Mock implementations ─────────────────────────────────────────────────────

function generateMockMenu(req: SuggestionRequest): DailyMenuResponse {
  const avail = req.availableIngredients.length > 0
    ? req.availableIngredients
    : ['thit_heo', 'trung_ga', 'rau_muong', 'gao', 'gia_vi', 'hanh_toi'];

  const isAvailable = (rec: typeof MOCK_RECIPES[0]) =>
    rec.ingredients.every(ingId => avail.includes(ingId));

  const breakfastOptions = MOCK_RECIPES.filter(r => r.type === 'breakfast' && isAvailable(r));
  const mainOptions = MOCK_RECIPES.filter(r => r.type === 'main' && isAvailable(r));
  const soupOptions = MOCK_RECIPES.filter(r => r.type === 'soup' && isAvailable(r));

  const breakfast = breakfastOptions.length > 0
    ? breakfastOptions[Math.floor(Math.random() * breakfastOptions.length)]
    : MOCK_RECIPES.find(r => r.name === 'Trứng ốp la bánh mì')!;

  const lunchMain = mainOptions.length > 0
    ? mainOptions[Math.floor(Math.random() * mainOptions.length)]
    : MOCK_RECIPES.find(r => r.name === 'Thịt kho trứng tộ')!;
  const lunchSoup = soupOptions.length > 0
    ? soupOptions[Math.floor(Math.random() * soupOptions.length)]
    : MOCK_RECIPES.find(r => r.name === 'Canh rau muống luộc')!;

  let dinnerMain = mainOptions.filter(m => m.name !== lunchMain.name)[0] || lunchMain;
  const dinnerSoup = soupOptions.filter(s => s.name !== lunchSoup.name)[0] || lunchSoup;

  return {
    meals: {
      breakfast: [{ recipeName: breakfast.name, calories: breakfast.calories, estimatedCost: 0, ingredientsUsed: breakfast.ingredients }],
      lunch: [
        { recipeName: lunchMain.name, calories: lunchMain.calories, estimatedCost: 0, ingredientsUsed: lunchMain.ingredients },
        { recipeName: lunchSoup.name, calories: lunchSoup.calories, estimatedCost: 0, ingredientsUsed: lunchSoup.ingredients },
      ],
      dinner: [
        { recipeName: dinnerMain.name, calories: dinnerMain.calories, estimatedCost: 0, ingredientsUsed: dinnerMain.ingredients },
        { recipeName: dinnerSoup.name, calories: dinnerSoup.calories, estimatedCost: 0, ingredientsUsed: dinnerSoup.ingredients },
      ],
    },
    totalDayCalories: breakfast.calories + lunchMain.calories + lunchSoup.calories + dinnerMain.calories + dinnerSoup.calories,
    estimatedTotalCost: 0,
    nutritionSummary: {
      proteinGrams: Math.round((req.dailyCalorieTarget * 0.20) / 4),
      carbsGrams: Math.round((req.dailyCalorieTarget * 0.55) / 4),
      fatGrams: Math.round((req.dailyCalorieTarget * 0.25) / 9),
    },
    healthNote: 'Thực đơn dinh dưỡng cân bằng phù hợp với nguyên liệu sẵn có.',
  };
}

function generateMockMealSuggestions(req: MealSuggestionRequest): MealOption[] {
  const avail = req.availableIngredients.length > 0
    ? req.availableIngredients
    : ['thit_heo', 'trung_ga', 'rau_muong', 'gao', 'gia_vi', 'hanh_toi'];

  const typeFilter: RecipeType[] = req.mealType === 'breakfast'
    ? ['breakfast']
    : ['main', 'soup', 'hotpot'];

  let candidates = MOCK_RECIPES.filter(r => typeFilter.includes(r.type));

  if (req.preference !== 'any') {
    const prefFiltered = candidates.filter(r => r.pref === req.preference);
    if (prefFiltered.length >= 2) candidates = prefFiltered;
  }

  const ingFiltered = candidates.filter(r => r.ingredients.some(ing => avail.includes(ing)));
  if (ingFiltered.length >= 2) candidates = ingFiltered;

  const notRecent = candidates.filter(r => !req.recentMeals.includes(r.name));
  if (notRecent.length >= 2) candidates = notRecent;

  // Shuffle using a simple stable sort with seeded-ish variation
  const shuffled = [...candidates].sort(() => (Math.random() > 0.5 ? 1 : -1)).slice(0, 3);

  const prefLabels: Record<FoodPreference, string> = {
    any: 'ngon', com: 'cơm', bun_pho_my: 'bún/phở/mỳ',
    chao_sup: 'cháo/súp', lau_nuong: 'lẩu/nướng', mon_cuon: 'cuốn', chay: 'chay',
  };

  return shuffled.map(r => ({
    recipeName: r.name,
    calories: r.calories,
    estimatedCost: 0,
    ingredientsUsed: r.ingredients,
    description: `Món ${prefLabels[r.pref]} truyền thống, dễ nấu tại nhà`,
  }));
}

function getCookingGuideMock(dishName: string): string {
  return `**Nguyên liệu:** ${dishName.includes('cá') ? 'cá tươi, hành tỏi, gia vị (nước mắm, đường, tiêu)' : dishName.includes('canh') ? 'rau củ, thịt băm, hành lá, gia vị' : 'nguyên liệu chính, hành tỏi, nước mắm, đường, tiêu'}
**Cách làm:** Sơ chế nguyên liệu, rửa sạch. Phi thơm hành tỏi với dầu ăn. Cho nguyên liệu chính vào, đảo đều. Nêm gia vị vừa miệng, nấu đến khi chín mềm.
**Mẹo:** Ướp nguyên liệu 15 phút trước khi nấu để thấm gia vị, món sẽ đậm đà hơn.`;
}

function estimateCaloriesMock(dishName: string): CalorieEstimate {
  const n = dishName.toLowerCase();
  let cal = 300;

  if (n.includes('lẩu')) cal = 650;
  else if (n.includes('cơm tấm') || n.includes('cơm chiên') || n.includes('cơm rang')) cal = 600;
  else if (n.includes('phở') || n.includes('bún bò') || n.includes('bún riêu')) cal = 500;
  else if (n.includes('bún') || n.includes('hủ tiếu') || n.includes('mì')) cal = 450;
  else if (n.includes('cháo')) cal = 260;
  else if (n.includes('bánh mì')) cal = 380;
  else if (n.includes('canh') || n.includes('súp')) cal = 130;
  else if (n.includes('kho') || n.includes('rim')) cal = 390;
  else if (n.includes('chiên') || n.includes('rán')) cal = 420;
  else if (n.includes('xào')) cal = 360;
  else if (n.includes('hấp') || n.includes('luộc')) cal = 270;
  else if (n.includes('gỏi') || n.includes('salad')) cal = 180;
  else if (n.includes('trứng')) cal = 280;

  return {
    calories: cal,
    proteinGrams: Math.round(cal * 0.20 / 4),
    carbsGrams: Math.round(cal * 0.50 / 4),
    fatGrams: Math.round(cal * 0.30 / 9),
    note: `Ước tính ~${cal} Kcal/người (1 khẩu phần)`,
  };
}
