import { useFamilyStore } from '../stores/familyStore';

interface SuggestionRequest {
  dailyCalorieTarget: number;
  availableIngredients: string[];
  recentMeals: string[];
  budgetLimit: number;
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

// Local mock database of common Vietnamese dishes for fallback generator
const MOCK_RECIPES = [
  { name: 'Phở bò ăn sáng', type: 'breakfast', calories: 450, cost: 45000, ingredients: ['thit_bo', 'gao', 'hanh_toi'] },
  { name: 'Bún sườn heo', type: 'breakfast', calories: 420, cost: 35000, ingredients: ['thit_heo', 'gao', 'hanh_toi'] },
  { name: 'Trứng ốp la bánh mì', type: 'breakfast', calories: 350, cost: 15000, ingredients: ['trung_ga', 'gao'] },
  { name: 'Cháo sườn heo', type: 'breakfast', calories: 300, cost: 20000, ingredients: ['thit_heo', 'gao', 'hanh_toi'] },
  
  { name: 'Thịt kho trứng tộ', type: 'main', calories: 450, cost: 50000, ingredients: ['thit_heo', 'trung_ga', 'hanh_toi'] },
  { name: 'Bò xào hành cần', type: 'main', calories: 380, cost: 70000, ingredients: ['thit_bo', 'hanh_toi'] },
  { name: 'Cá lóc kho tộ', type: 'main', calories: 320, cost: 45000, ingredients: ['ca_loc', 'hanh_toi'] },
  { name: 'Đậu hũ dồn thịt sốt cà', type: 'main', calories: 290, cost: 30000, ingredients: ['dau_hu', 'thit_heo', 'ca_chua', 'hanh_toi'] },
  { name: 'Cá điêu hồng chiên xù', type: 'main', calories: 360, cost: 55000, ingredients: ['ca_dieu_hong', 'hanh_toi'] },
  { name: 'Tôm rim tỏi', type: 'main', calories: 280, cost: 65000, ingredients: ['tom', 'hanh_toi'] },
  
  { name: 'Canh rau muống luộc', type: 'soup', calories: 80, cost: 10000, ingredients: ['rau_muong'] },
  { name: 'Canh rau ngót thịt băm', type: 'soup', calories: 150, cost: 20000, ingredients: ['rau_ngot', 'thit_heo', 'hanh_toi'] },
  { name: 'Canh bí đỏ thịt băm', type: 'soup', calories: 180, cost: 22000, ingredients: ['bi_do', 'thit_heo'] },
  { name: 'Canh cải ngọt thịt băm', type: 'soup', calories: 120, cost: 18000, ingredients: ['rau_cai_ngot', 'thit_heo'] },
  { name: 'Canh chua cá lóc', type: 'soup', calories: 220, cost: 45000, ingredients: ['ca_loc', 'ca_chua', 'hanh_toi'] },
  { name: 'Canh đậu hũ cà chua', type: 'soup', calories: 110, cost: 15000, ingredients: ['dau_hu', 'ca_chua', 'hanh_toi'] }
];

export async function generateDailyMenu(req: SuggestionRequest): Promise<DailyMenuResponse> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // Fallback to Smart Mock if API key is not configured or in trial mode
  if (!apiKey || apiKey === 'mock-gemini-key') {
    return generateMockMenu(req);
  }

  const customIngredients = useFamilyStore.getState().customIngredients || [];
  const mergedIngredients = customIngredients;

  const prompt = `
Bạn là một chuyên gia dinh dưỡng Việt Nam. Thiết kế thực đơn ăn uống cho một gia đình đáp ứng các điều kiện:
1. Tổng nhu cầu Calo đề xuất: ${req.dailyCalorieTarget} Kcal.
2. Ngân sách tối đa tiền thức ăn: ${req.budgetLimit} đ.
3. CHỈ được phép dùng các nguyên liệu khả dụng sau: [${req.availableIngredients.map(id => mergedIngredients.find(i => i.id === id)?.name || id).join(', ')}].
4. Tránh lặp các món ăn gần đây: [${req.recentMeals.join(', ')}].

Trả về kết quả ở định dạng JSON duy nhất khớp với cấu trúc sau, không kèm theo giải thích markdown hay ký tự thừa:
{
  "meals": {
    "breakfast": [{"recipeName": "Tên món ăn", "calories": 400, "estimatedCost": 30000, "ingredientsUsed": ["trung_ga"]}],
    "lunch": [{"recipeName": "Món mặn", "calories": 450, "estimatedCost": 50000, "ingredientsUsed": ["thit_heo"]}, {"recipeName": "Món canh", "calories": 150, "estimatedCost": 15000, "ingredientsUsed": ["rau_muong"]}],
    "dinner": [{"recipeName": "Món cá", "calories": 400, "estimatedCost": 45000, "ingredientsUsed": ["ca_loc", "ca_chua"]}]
  },
  "totalDayCalories": 1400,
  "estimatedTotalCost": 140000,
  "nutritionSummary": {"proteinGrams": 80, "carbsGrams": 180, "fatGrams": 40},
  "healthNote": "Lời khuyên dinh dưỡng ngắn cho mẹ"
}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const json = await response.json();
    const textResult = json.candidates[0].content.parts[0].text;
    return JSON.parse(textResult) as DailyMenuResponse;
  } catch (err) {
    console.error("Gemini API call failed, falling back to mock: ", err);
    return generateMockMenu(req);
  }
}

// Smart Mock Generator logic to ensure app works off-grid or without keys
function generateMockMenu(req: SuggestionRequest): DailyMenuResponse {
  const avail = req.availableIngredients.length > 0 ? req.availableIngredients : ['thit_heo', 'trung_ga', 'rau_muong', 'gao', 'gia_vi', 'hanh_toi'];
  
  // Filter mock recipes by matching at least one available ingredient (or basic ones)
  const isAvailable = (rec: typeof MOCK_RECIPES[0]) => {
    return rec.ingredients.every(ingId => avail.includes(ingId));
  };

  const breakfastOptions = MOCK_RECIPES.filter(r => r.type === 'breakfast' && isAvailable(r));
  const mainOptions = MOCK_RECIPES.filter(r => r.type === 'main' && isAvailable(r));
  const soupOptions = MOCK_RECIPES.filter(r => r.type === 'soup' && isAvailable(r));

  // Defaults fallback if pantry filter is too strict
  const breakfast = breakfastOptions.length > 0 
    ? breakfastOptions[Math.floor(Math.random() * breakfastOptions.length)] 
    : MOCK_RECIPES[2]; // Trứng ốp la

  const lunchMain = mainOptions.length > 0 
    ? mainOptions[Math.floor(Math.random() * mainOptions.length)] 
    : MOCK_RECIPES[4]; // Thịt kho trứng
  const lunchSoup = soupOptions.length > 0 
    ? soupOptions[Math.floor(Math.random() * soupOptions.length)] 
    : MOCK_RECIPES[10]; // Canh rau muống

  // Ensure dinner is not exact duplicate
  let dinnerMain = mainOptions.length > 1
    ? mainOptions.filter(m => m.name !== lunchMain.name)[0]
    : mainOptions[0] || MOCK_RECIPES[6]; // Cá lóc kho tộ
  if (!dinnerMain) dinnerMain = MOCK_RECIPES[6];

  const dinnerSoup = soupOptions.length > 1
    ? soupOptions.filter(s => s.name !== lunchSoup.name)[0]
    : soupOptions[0] || MOCK_RECIPES[11]; // Canh rau ngót
  
  const response: DailyMenuResponse = {
    meals: {
      breakfast: [{
        recipeName: breakfast.name,
        calories: breakfast.calories,
        estimatedCost: breakfast.cost,
        ingredientsUsed: breakfast.ingredients
      }],
      lunch: [
        {
          recipeName: lunchMain.name,
          calories: lunchMain.calories,
          estimatedCost: lunchMain.cost,
          ingredientsUsed: lunchMain.ingredients
        },
        {
          recipeName: lunchSoup.name,
          calories: lunchSoup.calories,
          estimatedCost: lunchSoup.cost,
          ingredientsUsed: lunchSoup.ingredients
        }
      ],
      dinner: [
        {
          recipeName: dinnerMain.name,
          calories: dinnerMain.calories,
          estimatedCost: dinnerMain.cost,
          ingredientsUsed: dinnerMain.ingredients
        },
        {
          recipeName: dinnerSoup.name,
          calories: dinnerSoup.calories,
          estimatedCost: dinnerSoup.cost,
          ingredientsUsed: dinnerSoup.ingredients
        }
      ]
    },
    totalDayCalories: breakfast.calories + lunchMain.calories + lunchSoup.calories + dinnerMain.calories + dinnerSoup.calories,
    estimatedTotalCost: breakfast.cost + lunchMain.cost + lunchSoup.cost + dinnerMain.cost + dinnerSoup.cost,
    nutritionSummary: {
      proteinGrams: Math.round((req.dailyCalorieTarget * 0.20) / 4),
      carbsGrams: Math.round((req.dailyCalorieTarget * 0.55) / 4),
      fatGrams: Math.round((req.dailyCalorieTarget * 0.25) / 9)
    },
    healthNote: "Thực đơn dinh dưỡng phong cách đồng quê phù hợp với nguyên liệu sẵn có gần nhà."
  };

  return response;
}
