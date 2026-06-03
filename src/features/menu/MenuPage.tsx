import { useState, useEffect } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { useFamilyStore } from '../../stores/familyStore';
import { useAuthStore } from '../../stores/authStore';
import { generateDailyMenu } from '../../core/gemini';
import type { DailyMenuResponse, Meal } from '../../core/gemini';
import AddMealModal from './AddMealModal';
import RecipeGuideModal from './RecipeGuideModal';
import { getMergedIngredients } from '../../core/constants';
import { db } from '../../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Flame, ShoppingCart, Sparkles, CheckSquare, Square, ChefHat, Heart, Trash2, Plus, X, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import PullToRefresh from '../../components/PullToRefresh';
import type { FavoriteMenu } from '../../types';

// Dishes served as-is — no cooking guide needed
const SIMPLE_DISH_PREFIXES = [
  'com trang', 'chuoi', 'tao', 'cam', 'xoai', 'nho', 'oi', 'le', 'mit',
  'buoi', 'du du', 'dua', 'nhan', 'vai', 'man', 'quyt', 'chanh',
  'dua hau', 'thanh long', 'chom chom', 'mang cut', 'trai cay', 'hoa qua',
  'sua', 'nuoc loc', 'nuoc ep', 'sinh to',
];
function removeDiacritics(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}
const needsCookingGuide = (name: string): boolean => {
  const normalized = removeDiacritics(name.trim());
  return !SIMPLE_DISH_PREFIXES.some(p => normalized === p || normalized.startsWith(p + ' '));
};

const DAYS_OF_WEEK = [
  { id: 'monday', name: 'Thứ 2' },
  { id: 'tuesday', name: 'Thứ 3' },
  { id: 'wednesday', name: 'Thứ 4' },
  { id: 'thursday', name: 'Thứ 5' },
  { id: 'friday', name: 'Thứ 6' },
  { id: 'saturday', name: 'Thứ 7' },
  { id: 'sunday', name: 'Chủ Nhật' }
];

export default function MenuPage() {
  const { user } = useAuthStore();
  const { family, availableIngredients, favoriteMenus, saveFavoriteMenu, deleteFavoriteMenu, customIngredients } = useFamilyStore();
  const confirm = useConfirm();
  const showToast = useToast();
  
  const [selectedDay, setSelectedDay] = useState('monday');
  const [weeklyMenu, setWeeklyMenu] = useState<{ [day: string]: DailyMenuResponse }>({});
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'menu' | 'shopping' | 'favorites'>('menu');
  const [purchasedIngredients, setPurchasedIngredients] = useState<string[]>([]);

  const [recipeGuideFor, setRecipeGuideFor] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalMealType, setAddModalMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');
  const [addModalInitialMeal, setAddModalInitialMeal] = useState<Meal | null>(null);
  const [editingMeal, setEditingMeal] = useState<{ mealType: 'breakfast' | 'lunch' | 'dinner'; index: number } | null>(null);

  // Favorite Menu save state
  const [showSaveFav, setShowSaveFav] = useState(false);
  const [favName, setFavName] = useState('');

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const toggleCategory = (catKey: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(catKey) ? next.delete(catKey) : next.add(catKey);
      return next;
    });
  };

  // Load menu from Firestore doc `/families/{familyId}/menus/weekly_plan`
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'families', user.uid, 'menus', 'weekly_plan'), (docSnap) => {
      if (docSnap.exists()) {
        setWeeklyMenu(docSnap.data().days || {});
        setPurchasedIngredients(docSnap.data().purchased || []);
      }
    });
  }, [user]);

  const saveMenuToFirestore = async (newDays: typeof weeklyMenu, newPurchased: string[] = purchasedIngredients) => {
    if (!user) return;
    await setDoc(doc(db, 'families', user.uid, 'menus', 'weekly_plan'), {
      days: newDays,
      purchased: newPurchased,
      updatedAt: new Date()
    });
  };

  // Generate Menu for the selected day using Gemini API (or Mock)
  const familySize = Math.max(1, family?.members?.length || 3);
  const perPersonCalTarget = family ? Math.round(family.nutritionTargets.calories / familySize) : 2000;

  const handleGenerateDay = async () => {
    if (!user || !family) return;
    if (availableIngredients.length === 0) {
      showToast("Vui lòng kích hoạt nguyên liệu trong Tủ nguyên liệu trước!", "warning");
      return;
    }

    setLoading(true);
    try {
      const response = await generateDailyMenu({
        dailyCalorieTarget: perPersonCalTarget,
        availableIngredients,
        recentMeals: Object.values(weeklyMenu).flatMap(dayMenu =>
          Object.values(dayMenu.meals).flatMap(mealList => mealList.map(m => m.recipeName))
        ),
      });

      const updatedMenu = { ...weeklyMenu, [selectedDay]: response };
      setWeeklyMenu(updatedMenu);
      await saveMenuToFirestore(updatedMenu);
    } catch (err) {
      console.error(err);
      showToast("Không thể kết nối dịch vụ AI. Đang chạy chế độ offline.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Autogenerate menu for the whole week at once! (Premium feature)
  const handleGenerateWholeWeek = async () => {
    if (!user || !family) return;
    if (availableIngredients.length === 0) {
      showToast("Vui lòng kích hoạt nguyên liệu trong Tủ nguyên liệu trước!", "warning");
      return;
    }
    setLoading(true);
    try {
      const tempMenu: typeof weeklyMenu = {};
      for (const day of DAYS_OF_WEEK) {
        const response = await generateDailyMenu({
          dailyCalorieTarget: perPersonCalTarget,
          availableIngredients,
          recentMeals: Object.values(tempMenu).flatMap(dayMenu =>
            Object.values(dayMenu.meals).flatMap(mealList => mealList.map(m => m.recipeName))
          ),
        });
        tempMenu[day.id] = response;
      }
      setWeeklyMenu(tempMenu);
      await saveMenuToFirestore(tempMenu);
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi tạo thực đơn cả tuần.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Compile Shopping List based on current Weekly Menu
  const getAggregatedShoppingList = () => {
    const ingredientCounts: { [id: string]: number } = {};

    Object.values(weeklyMenu).forEach(dayMenu => {
      Object.values(dayMenu.meals).forEach(mealList => {
        mealList.forEach(dish => {
          if (dish.ingredientsUsed) {
            dish.ingredientsUsed.forEach(ingId => {
              ingredientCounts[ingId] = (ingredientCounts[ingId] || 0) + 1;
            });
          }
        });
      });
    });

    const mergedIngredients = getMergedIngredients(customIngredients);

    // Deduplicate by canonical name (case-insensitive) — merge AI-invented IDs that map to same ingredient
    const seen = new Map<string, { id: string; name: string; category: string; frequency: number }>();
    Object.keys(ingredientCounts).forEach(ingId => {
      const meta = mergedIngredients.find(i => i.id === ingId);
      const name = meta?.name || ingId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const category = meta?.category || 'dry_spice';
      const key = name.toLowerCase();
      if (seen.has(key)) {
        seen.get(key)!.frequency += ingredientCounts[ingId];
      } else {
        seen.set(key, { id: ingId, name, category, frequency: ingredientCounts[ingId] });
      }
    });

    return Array.from(seen.values());
  };

  const handleSaveMealFromModal = async (meal: Meal) => {
    let currentDayMenu = weeklyMenu[selectedDay];
    if (!currentDayMenu) {
      currentDayMenu = {
        meals: { breakfast: [], lunch: [], dinner: [] },
        totalDayCalories: 0,
        estimatedTotalCost: 0,
        nutritionSummary: {
          proteinGrams: Math.round((perPersonCalTarget * 0.20) / 4),
          carbsGrams: Math.round((perPersonCalTarget * 0.55) / 4),
          fatGrams: Math.round((perPersonCalTarget * 0.25) / 9),
        },
        healthNote: 'Thực đơn tự thiết lập',
      };
    }

    const updatedMeals = { ...currentDayMenu.meals };
    if (editingMeal) {
      updatedMeals[editingMeal.mealType] = [...updatedMeals[editingMeal.mealType]];
      updatedMeals[editingMeal.mealType][editingMeal.index] = {
        ...meal,
        ingredientsUsed: updatedMeals[editingMeal.mealType][editingMeal.index]?.ingredientsUsed || meal.ingredientsUsed,
      };
    } else {
      updatedMeals[addModalMealType] = [...updatedMeals[addModalMealType], meal];
    }

    const newDayMenu: DailyMenuResponse = {
      ...currentDayMenu,
      meals: updatedMeals,
      totalDayCalories: Object.values(updatedMeals).flatMap(l => l).reduce((s, m) => s + m.calories, 0),
      estimatedTotalCost: Object.values(updatedMeals).flatMap(l => l).reduce((s, m) => s + m.estimatedCost, 0),
    };

    const updatedMenu = { ...weeklyMenu, [selectedDay]: newDayMenu };
    setWeeklyMenu(updatedMenu);
    await saveMenuToFirestore(updatedMenu);
    setShowAddModal(false);
    setEditingMeal(null);
    setAddModalInitialMeal(null);
  };

  // Delete a single meal item
  const handleDeleteMeal = async (mealType: 'breakfast' | 'lunch' | 'dinner', mealIndex: number) => {
    const currentDayMenu = weeklyMenu[selectedDay];
    if (!currentDayMenu) return;

    const dishName = currentDayMenu.meals[mealType][mealIndex]?.recipeName || 'món này';
    const yes = await confirm({
      title: 'Xóa món',
      message: `Bạn có chắc muốn xóa "${dishName}"?`,
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (!yes) return;

    const updatedMeals = { ...currentDayMenu.meals };
    updatedMeals[mealType] = updatedMeals[mealType].filter((_, i) => i !== mealIndex);

    const newDayMenu: DailyMenuResponse = {
      ...currentDayMenu,
      meals: updatedMeals,
      totalDayCalories: Object.values(updatedMeals).flatMap(list => list).reduce((s, m) => s + m.calories, 0),
      estimatedTotalCost: Object.values(updatedMeals).flatMap(list => list).reduce((s, m) => s + m.estimatedCost, 0),
    };

    const updatedMenu = { ...weeklyMenu, [selectedDay]: newDayMenu };
    setWeeklyMenu(updatedMenu);
    await saveMenuToFirestore(updatedMenu);
  };

  // Delete the entire menu for the selected day
  const handleDeleteDayMenu = async () => {
    const dayName = DAYS_OF_WEEK.find(d => d.id === selectedDay)?.name || selectedDay;
    const yes = await confirm({
      title: 'Xóa thực đơn',
      message: `Bạn có chắc muốn xóa toàn bộ thực đơn ngày ${dayName}?`,
      confirmText: 'Xóa toàn bộ',
      variant: 'danger'
    });
    if (!yes) return;

    const updatedMenu = { ...weeklyMenu };
    delete updatedMenu[selectedDay];
    setWeeklyMenu(updatedMenu);
    await saveMenuToFirestore(updatedMenu);
  };

  const handleSaveFavorite = async () => {
    if (!selectedDayMenu) return;
    const finalName = favName.trim() || `Thực đơn ngày ${DAYS_OF_WEEK.find(d => d.id === selectedDay)?.name}`;
    const favMenu: FavoriteMenu = {
      favMenuId: 'fav_' + Date.now().toString(),
      name: finalName,
      meals: {
        breakfast: selectedDayMenu.meals.breakfast,
        lunch: selectedDayMenu.meals.lunch,
        dinner: selectedDayMenu.meals.dinner
      }
    };
    try {
      await saveFavoriteMenu(family!.familyId, favMenu);
      setShowSaveFav(false);
      setFavName('');
      showToast("Đã lưu thực đơn vào danh mục yêu thích!", "success");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi lưu thực đơn", "error");
    }
  };

  const handleApplyFavorite = async (fav: FavoriteMenu) => {
    if (!family) return;
    
    const updatedMenu = {
      ...weeklyMenu,
      [selectedDay]: {
        meals: fav.meals,
        totalDayCalories: Object.values(fav.meals).flatMap(list => list).reduce((s, m) => s + m.calories, 0),
        estimatedTotalCost: Object.values(fav.meals).flatMap(list => list).reduce((s, m) => s + m.estimatedCost, 0),
        nutritionSummary: {
          proteinGrams: Math.round((perPersonCalTarget * 0.20) / 4),
          carbsGrams: Math.round((perPersonCalTarget * 0.55) / 4),
          fatGrams: Math.round((perPersonCalTarget * 0.25) / 9)
        },
        healthNote: `Áp dụng từ thực đơn yêu thích: ${fav.name}`
      }
    };

    setWeeklyMenu(updatedMenu);
    await saveMenuToFirestore(updatedMenu);
    setActiveSubTab('menu');
    showToast(`Đã áp dụng "${fav.name}" vào ngày ${DAYS_OF_WEEK.find(d => d.id === selectedDay)?.name}`, 'success');
  };

  const handleDeleteFavorite = async (favMenuId: string) => {
    if (!family) return;
    const yes = await confirm({
      title: 'Xóa thực đơn yêu thích',
      message: 'Bạn có muốn xóa thực đơn yêu thích này?',
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (yes) {
      try {
        await deleteFavoriteMenu(family.familyId, favMenuId);
      } catch (err) {
        console.error(err);
        showToast("Lỗi khi xóa thực đơn yêu thích", "error");
      }
    }
  };

  const shoppingList = getAggregatedShoppingList();

  const handleTogglePurchased = async (ingId: string) => {
    let newPurchasedList: string[];
    if (purchasedIngredients.includes(ingId)) {
      newPurchasedList = purchasedIngredients.filter(id => id !== ingId);
    } else {
      newPurchasedList = [...purchasedIngredients, ingId];
    }
    setPurchasedIngredients(newPurchasedList);
    await saveMenuToFirestore(weeklyMenu, newPurchasedList);
  };

  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  // Group shopping list by Market Sạp
  const groupedShopping = shoppingList.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {} as { [cat: string]: typeof shoppingList });

  const CATEGORY_META: Record<string, { label: string; emoji: string; order: number }> = {
    meat_egg:   { label: 'Sạp thịt & trứng',        emoji: '🥩', order: 1 },
    seafood:    { label: 'Sạp thủy hải sản',         emoji: '🐟', order: 2 },
    vegetables: { label: 'Sạp rau củ quả',           emoji: '🥬', order: 3 },
    fruits:     { label: 'Hoa quả',                  emoji: '🍊', order: 4 },
    dry_spice:  { label: 'Tạp hóa / Gia vị',         emoji: '🛒', order: 5 },
  };

  const selectedDayMenu = weeklyMenu[selectedDay];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      {/* Sub Tabs switcher */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        marginBottom: '16px'
      }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('menu')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: 'none',
            fontSize: '13px',
            fontWeight: 700,
            color: activeSubTab === 'menu' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'menu' ? '2px solid var(--primary)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <ChefHat size={14} /> Thực đơn tuần
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('shopping')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: 'none',
            fontSize: '13px',
            fontWeight: 700,
            color: activeSubTab === 'shopping' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'shopping' ? '2px solid var(--primary)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <ShoppingCart size={14} /> Lịch đi chợ ({shoppingList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('favorites')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: 'none',
            fontSize: '13px',
            fontWeight: 700,
            color: activeSubTab === 'favorites' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'favorites' ? '2px solid var(--primary)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <Heart size={14} /> Yêu thích ({favoriteMenus.length})
        </button>
      </div>

      {activeSubTab === 'menu' ? (
        <>
          {/* Calendar Horizontal Tabs */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
            {DAYS_OF_WEEK.map(d => {
              const hasMenu = !!weeklyMenu[d.id];
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDay(d.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid',
                    borderColor: selectedDay === d.id ? 'var(--primary)' : 'var(--border)',
                    backgroundColor: selectedDay === d.id ? 'var(--primary)' : hasMenu ? 'var(--primary-bg)' : 'var(--bg-card)',
                    color: selectedDay === d.id ? 'white' : hasMenu ? 'var(--primary)' : 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flex: '0 0 78px',
                    textAlign: 'center'
                  }}
                >
                  {d.name}
                </button>
              );
            })}
          </div>

          {/* Quick Whole Week Generation Button */}
          {Object.keys(weeklyMenu).length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '24px', backgroundColor: 'var(--primary-bg)', borderColor: 'var(--primary-light)' }}>
              <Sparkles size={32} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Chưa có thực đơn cho tuần này</h3>
              <p style={{ fontSize: '12px', marginBottom: '16px' }}>Bấm nút dưới đây để AI tự động thiết kế thực đơn cân đối 3 bữa cho cả 7 ngày trong tuần.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerateWholeWeek}
                disabled={loading}
              >
                {loading ? 'Đang lên thực đơn...' : 'Tự động tạo thực đơn tuần'}
              </button>
            </div>
          )}

          {/* Calorie Goal Indicator */}
          {selectedDayMenu && family && (() => {
            const pct = Math.round((selectedDayMenu.totalDayCalories / perPersonCalTarget) * 100);
            const onTarget = Math.abs(selectedDayMenu.totalDayCalories - perPersonCalTarget) < 300;
            const barColor = onTarget ? 'var(--secondary)' : 'var(--accent)';
            const { proteinGrams, carbsGrams, fatGrams } = selectedDayMenu.nutritionSummary;
            return (
              <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Row 1 — title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <Flame size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  Dinh dưỡng {DAYS_OF_WEEK.find(d => d.id === selectedDay)?.name}
                </div>

                {/* Row 2 — calories + bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: barColor, lineHeight: 1 }}>
                      {selectedDayMenu.totalDayCalories.toLocaleString('vi-VN')}
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '3px' }}>Kcal</span>
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      mục tiêu {perPersonCalTarget.toLocaleString('vi-VN')} Kcal/người · <span style={{ fontWeight: 700, color: barColor }}>{pct}%</span>
                    </span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'var(--bg-grey)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: barColor,
                      borderRadius: '99px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>

                {/* Row 3 — macros chips */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { label: 'Đạm', value: proteinGrams, unit: 'g', color: '#E07A5F', bg: 'rgba(224,122,95,0.10)' },
                    { label: 'Carbs', value: carbsGrams, unit: 'g', color: 'var(--accent)', bg: 'rgba(244,162,97,0.12)' },
                    { label: 'Béo', value: fatGrams,    unit: 'g', color: 'var(--secondary)', bg: 'rgba(129,178,154,0.14)' },
                  ].map(m => (
                    <div key={m.label} style={{
                      flex: 1, textAlign: 'center', padding: '6px 4px',
                      borderRadius: '8px', backgroundColor: m.bg,
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: m.color }}>{m.value}g</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '1px' }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Row 4 — health note */}
                {selectedDayMenu.healthNote && (
                  <div style={{
                    fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic',
                    borderTop: '1px solid var(--border)', paddingTop: '8px',
                    lineHeight: 1.5,
                  }}>
                    💡 {selectedDayMenu.healthNote}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Meals list */}
          {selectedDayMenu ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {(['breakfast', 'lunch', 'dinner'] as const).map(mealType => {
                const MEAL_META = {
                  breakfast: { emoji: '🌅', label: 'Bữa Sáng', color: '#F4A261' },
                  lunch:     { emoji: '☀️',  label: 'Bữa Trưa', color: '#FF8C69' },
                  dinner:    { emoji: '🌙', label: 'Bữa Tối',  color: '#81B29A' },
                };
                const meta = MEAL_META[mealType];
                return (
                <div key={mealType} style={{ marginBottom: '12px' }}>
                  {/* Section header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    marginBottom: '8px', paddingLeft: '2px',
                  }}>
                    <div style={{
                      width: '3px', height: '16px', borderRadius: '2px',
                      backgroundColor: meta.color, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: meta.color, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      {meta.emoji} {meta.label}
                    </span>
                  </div>

                  {/* Dish cards */}
                  {(selectedDayMenu?.meals?.[mealType] ?? []).map((dish, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      padding: '10px 12px', marginBottom: '6px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      boxShadow: 'var(--shadow-sm)',
                    }}>
                      {/* Calorie pill */}
                      <div style={{
                        flexShrink: 0, minWidth: '48px', textAlign: 'center',
                        padding: '4px 6px', borderRadius: '8px',
                        backgroundColor: 'rgba(255,140,105,0.10)',
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{dish.calories}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '1px', fontWeight: 500 }}>Kcal</div>
                      </div>

                      {/* Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {dish.recipeName}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0px', flexShrink: 0 }}>
                        {needsCookingGuide(dish.recipeName) && (
                          <button
                            type="button"
                            onClick={() => setRecipeGuideFor(dish.recipeName)}
                            title="Xem cách nấu"
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                          >
                            <BookOpen size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMeal(mealType, idx)}
                          title="Xóa món"
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add button */}
                  <button
                    type="button"
                    onClick={() => { setAddModalMealType(mealType); setAddModalInitialMeal(null); setEditingMeal(null); setShowAddModal(true); }}
                    style={{
                      width: '100%', height: '34px',
                      borderRadius: '10px',
                      border: '1px dashed var(--border)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    }}
                  >
                    <Plus size={13} /> Thêm / Gợi ý món
                  </button>
                </div>
                );
              })}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleGenerateDay}
                  className="btn btn-secondary"
                  style={{ flex: 1, border: '1px dashed var(--primary)', color: 'var(--primary)' }}
                  disabled={loading}
                >
                  {loading ? 'Đang cập nhật...' : 'Gợi ý lại toàn bộ ngày này'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteDayMenu}
                  className="btn btn-secondary"
                  style={{
                    flex: '0 0 auto',
                    border: '1px dashed var(--accent)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0 16px',
                    fontSize: '13px'
                  }}
                  disabled={loading}
                >
                  <Trash2 size={14} /> Xóa
                </button>
              </div>

              {/* Save as template — only when all 3 meals have at least 1 dish */}
              {(selectedDayMenu?.meals?.breakfast?.length ?? 0) > 0 &&
               (selectedDayMenu?.meals?.lunch?.length ?? 0) > 0 &&
               (selectedDayMenu?.meals?.dinner?.length ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => { setFavName(`Thực đơn ngày ${DAYS_OF_WEEK.find(d => d.id === selectedDay)?.name}`); setShowSaveFav(true); }}
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    padding: '11px 16px',
                    borderRadius: '12px',
                    border: '1.5px dashed var(--primary-light)',
                    background: 'var(--primary-bg)',
                    color: 'var(--primary-dark)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                  }}
                >
                  <Heart size={15} fill="var(--primary)" style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  Lưu thực đơn hôm nay làm mẫu
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* AI quick-generate the whole day */}
              <div className="card" style={{
                padding: '14px 16px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: '12px',
                backgroundColor: 'var(--primary-bg)',
                border: '1px dashed var(--primary-light)',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '2px' }}>
                    AI tạo thực đơn cả ngày
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Tự động gợi ý 3 bữa cân đối
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGenerateDay}
                  disabled={loading}
                  style={{ flexShrink: 0, fontSize: '12px', padding: '0 16px', height: '36px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  {loading
                    ? <><Sparkles size={13} className="spin" /> Đang tạo...</>
                    : <><Sparkles size={13} /> Tạo ngay</>}
                </button>
              </div>

              {/* Per-meal add buttons — disabled while AI is generating */}
              {(['breakfast', 'lunch', 'dinner'] as const).map(mt => (
                <div
                  key={mt}
                  className="card"
                  style={{
                    padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    opacity: loading ? 0.45 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {mt === 'breakfast' ? '🌅 Bữa Sáng' : mt === 'lunch' ? '☀️ Bữa Trưa' : '🌙 Bữa Tối'}
                  </span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setAddModalMealType(mt);
                      setAddModalInitialMeal(null);
                      setEditingMeal(null);
                      setShowAddModal(true);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '6px 14px', borderRadius: 'var(--border-radius-sm)',
                      border: '1px solid var(--primary)',
                      backgroundColor: 'var(--primary-bg)',
                      color: 'var(--primary)',
                      fontSize: '12px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Plus size={13} /> Thêm / Gợi ý
                  </button>
                </div>
              ))}

            </div>
          )}
        </>
      ) : activeSubTab === 'shopping' ? (
        /* Shopping checklist */
        <div>
          {shoppingList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
              <ShoppingCart size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontSize: '14px', fontWeight: 600 }}>Chưa có danh sách đi chợ</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Hãy tạo thực đơn tuần trước để tự động tổng hợp nguyên liệu cần mua.</p>
            </div>
          ) : (
            <>
              {/* Progress summary bar */}
              {(() => {
                const total = shoppingList.length;
                const done = shoppingList.filter(i => purchasedIngredients.includes(i.id)).length;
                const pct = Math.round((done / total) * 100);
                return (
                  <div className="card" style={{ padding: '14px 16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        🛒 Đã mua <span style={{ color: 'var(--primary)' }}>{done}</span>/{total} mặt hàng
                      </div>
                      {done > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            setPurchasedIngredients([]);
                            await saveMenuToFirestore(weeklyMenu, []);
                          }}
                          style={{
                            fontSize: '11px', fontWeight: 600,
                            color: 'var(--text-secondary)',
                            background: 'none', border: '1px solid var(--border)',
                            borderRadius: '8px', padding: '3px 10px', cursor: 'pointer',
                          }}
                        >
                          Xóa đã mua
                        </button>
                      )}
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--bg-grey)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: done === total ? 'var(--secondary)' : 'var(--primary)',
                        borderRadius: '99px', transition: 'width 0.3s ease',
                      }} />
                    </div>
                    {done === total && total > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: 600, marginTop: '6px', textAlign: 'center' }}>
                        ✅ Đã mua đủ tất cả nguyên liệu!
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Category groups — sorted by order, unpurchased items first */}
              {Object.keys(groupedShopping)
                .sort((a, b) => (CATEGORY_META[a]?.order ?? 9) - (CATEGORY_META[b]?.order ?? 9))
                .map(catKey => {
                  const catMeta = CATEGORY_META[catKey] ?? { label: catKey, emoji: '📦', order: 9 };
                  const items = [...groupedShopping[catKey]].sort((a, b) => {
                    const aP = purchasedIngredients.includes(a.id) ? 1 : 0;
                    const bP = purchasedIngredients.includes(b.id) ? 1 : 0;
                    return aP - bP;
                  });
                  const catDone = items.filter(i => purchasedIngredients.includes(i.id)).length;

                  const isCollapsed = collapsedCategories.has(catKey);
                  return (
                    <div key={catKey} className="card" style={{ padding: '0', marginBottom: '10px', overflow: 'hidden' }}>
                      {/* Category header — tap to collapse/expand */}
                      <div
                        onClick={() => toggleCategory(catKey)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '11px 16px',
                          backgroundColor: 'var(--primary-bg)',
                          borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isCollapsed
                            ? <ChevronRight size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                            : <ChevronDown size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                          }
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)' }}>
                            {catMeta.emoji} {catMeta.label}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '11px', fontWeight: 600,
                          color: catDone === items.length ? 'var(--secondary)' : 'var(--text-secondary)',
                          background: 'var(--bg-grey)', borderRadius: '12px', padding: '2px 8px',
                        }}>
                          {catDone}/{items.length}
                        </span>
                      </div>

                      {/* Items — hidden when collapsed */}
                      {!isCollapsed && (
                        <div style={{ padding: '6px 0' }}>
                          {items.map((item, idx) => {
                            const isPurchased = purchasedIngredients.includes(item.id);
                            return (
                              <div
                                key={item.id}
                                onClick={() => handleTogglePurchased(item.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '12px',
                                  padding: '10px 16px',
                                  cursor: 'pointer',
                                  borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                                  backgroundColor: isPurchased ? 'rgba(129,178,154,0.06)' : 'transparent',
                                  transition: 'background 0.15s',
                                }}
                              >
                                {isPurchased
                                  ? <CheckSquare size={20} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                                  : <Square size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                                }
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{
                                    fontSize: '14px', fontWeight: 500,
                                    color: isPurchased ? 'var(--text-secondary)' : 'var(--text-primary)',
                                    textDecoration: isPurchased ? 'line-through' : 'none',
                                  }}>
                                    {item.name}
                                  </span>
                                </div>
                                <span style={{
                                  fontSize: '11px', fontWeight: 600,
                                  color: 'var(--text-secondary)',
                                  background: 'var(--bg-grey)',
                                  borderRadius: '10px', padding: '2px 8px',
                                  flexShrink: 0,
                                  opacity: isPurchased ? 0.5 : 1,
                                }}>
                                  {item.frequency} buổi
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              }
            </>
          )}
        </div>
      ) : (
        /* Favorites list */
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px' }}>Thực đơn yêu thích đã lưu</h3>
            <p style={{ fontSize: '12px' }}>Danh sách các thực đơn tiêu biểu bạn đã lưu. Có thể áp dụng nhanh vào ngày đang chọn.</p>
          </div>
          
          {favoriteMenus.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
              <Heart size={32} style={{ color: 'var(--text-secondary)', marginBottom: '12px' }} />
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Chưa có thực đơn yêu thích nào được lưu.</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Hãy nhấn biểu tượng trái tim khi xem thực đơn ngày để lưu.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {favoriteMenus.map(fav => (
                <div key={fav.favMenuId} className="card" style={{ margin: 0, padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary-dark)' }}>{fav.name}</h4>
                    <button
                      type="button"
                      onClick={() => handleDeleteFavorite(fav.favMenuId)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {/* Brief list of meals */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', paddingLeft: '4px', borderLeft: '2px solid var(--border)' }}>
                    <div>🌅 <strong>Sáng:</strong> {fav.meals.breakfast.map(m => m.recipeName).join(', ') || 'Không có món'}</div>
                    <div>☀️ <strong>Trưa:</strong> {fav.meals.lunch.map(m => m.recipeName).join(', ') || 'Không có món'}</div>
                    <div>🌙 <strong>Tối:</strong> {fav.meals.dinner.map(m => m.recipeName).join(', ') || 'Không có món'}</div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleApplyFavorite(fav)}
                    className="btn btn-primary"
                    style={{ width: '100%', height: '36px', fontSize: '13px', borderRadius: 'var(--border-radius-sm)' }}
                  >
                    Áp dụng vào ngày {DAYS_OF_WEEK.find(d => d.id === selectedDay)?.name}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {recipeGuideFor && (
        <RecipeGuideModal
          dishName={recipeGuideFor}
          onClose={() => setRecipeGuideFor(null)}
        />
      )}

      {showAddModal && (
        <AddMealModal
          mealType={addModalMealType}
          familySize={family?.members?.length || 3}
          availableIngredients={availableIngredients}
          recentMeals={Object.values(weeklyMenu).flatMap(d => Object.values(d.meals).flatMap(l => l.map(m => m.recipeName)))}
          onSave={handleSaveMealFromModal}
          onClose={() => { setShowAddModal(false); setEditingMeal(null); setAddModalInitialMeal(null); }}
          initialMeal={addModalInitialMeal || undefined}
        />
      )}

      {/* Save Favorite Menu modal */}
      {showSaveFav && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(61, 64, 91, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card" style={{ margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '16px' }}>Lưu thực đơn yêu thích</h3>
              <button
                type="button"
                onClick={() => setShowSaveFav(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Đặt tên thực đơn mẫu</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: Thực đơn cuối tuần, Cơm gia đình..."
                value={favName}
                onChange={(e) => setFavName(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleSaveFavorite}
                className="btn btn-primary"
                style={{ flex: 1, height: '40px' }}
              >
                Lưu yêu thích
              </button>
              <button
                type="button"
                onClick={() => setShowSaveFav(false)}
                className="btn btn-secondary"
                style={{ flex: 1, height: '40px' }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </PullToRefresh>
  );
}
