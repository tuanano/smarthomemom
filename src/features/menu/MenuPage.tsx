import { useState, useEffect } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';
import { useFamilyStore } from '../../stores/familyStore';
import { useAuthStore } from '../../stores/authStore';
import { generateDailyMenu } from '../../core/gemini';
import type { DailyMenuResponse } from '../../core/gemini';
import { getMergedIngredients } from '../../core/constants';
import { db } from '../../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Calendar, Flame, RefreshCw, ShoppingCart, Sparkles, CheckSquare, Square, ChefHat, Heart, Trash2, Plus, X, Pencil } from 'lucide-react';
import PullToRefresh from '../../components/PullToRefresh';
import type { FavoriteMenu } from '../../types';

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
  
  const [selectedDay, setSelectedDay] = useState('monday');
  const [weeklyMenu, setWeeklyMenu] = useState<{ [day: string]: DailyMenuResponse }>({});
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'menu' | 'shopping' | 'favorites'>('menu');
  const [purchasedIngredients, setPurchasedIngredients] = useState<string[]>([]);

  // Manual Meal addition state
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualMealType, setManualMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');
  const [manualRecipeName, setManualRecipeName] = useState('');
  const [manualCalories, setManualCalories] = useState(300);
  const [manualCost, setManualCost] = useState(25000);

  // Edit meal item state
  const [editingMeal, setEditingMeal] = useState<{ mealType: 'breakfast' | 'lunch' | 'dinner'; index: number } | null>(null);

  // Favorite Menu save state
  const [showSaveFav, setShowSaveFav] = useState(false);
  const [favName, setFavName] = useState('');

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
  const handleGenerateDay = async () => {
    if (!user || !family) return;
    if (availableIngredients.length === 0) {
      alert("Vui lòng kích hoạt nguyên liệu khả dụng trong Tủ nguyên liệu trước!");
      return;
    }

    setLoading(true);
    try {
      const response = await generateDailyMenu({
        dailyCalorieTarget: family.nutritionTargets.calories,
        availableIngredients,
        recentMeals: Object.values(weeklyMenu).flatMap(dayMenu => 
          Object.values(dayMenu.meals).flatMap(mealList => mealList.map(m => m.recipeName))
        ),
        budgetLimit: 160000 // Average budget limit 160k VND
      });

      const updatedMenu = { ...weeklyMenu, [selectedDay]: response };
      setWeeklyMenu(updatedMenu);
      await saveMenuToFirestore(updatedMenu);
    } catch (err) {
      console.error(err);
      alert("Không thể kết nối dịch vụ AI. Đang chạy chế độ offline.");
    } finally {
      setLoading(false);
    }
  };

  // Shuffle a single meal item using Gemini AI (mock/actual)
  const handleShuffleMeal = async (mealType: 'breakfast' | 'lunch' | 'dinner', mealIndex: number) => {
    if (!user || !family) return;
    const currentDayMenu = weeklyMenu[selectedDay];
    if (!currentDayMenu) return;

    setLoading(true);
    try {
      // Prompt Gemini to suggest a substitution or fallback to mock
      const targetCal = currentDayMenu.meals[mealType][mealIndex].calories;
      const response = await generateDailyMenu({
        dailyCalorieTarget: targetCal * 3.5, // Scale target
        availableIngredients,
        recentMeals: [currentDayMenu.meals[mealType][mealIndex].recipeName],
        budgetLimit: 60000
      });

      // Swap the item with the new suggest item
      const newMealItem = response.meals[mealType][0] || response.meals.lunch[0];
      const updatedMeals = { ...currentDayMenu.meals };
      updatedMeals[mealType] = [...updatedMeals[mealType]];
      updatedMeals[mealType][mealIndex] = newMealItem;

      // Re-calculate totals
      const newDayMenu: DailyMenuResponse = {
        ...currentDayMenu,
        meals: updatedMeals,
        totalDayCalories: Object.values(updatedMeals).flatMap(list => list).reduce((s, m) => s + m.calories, 0),
        estimatedTotalCost: Object.values(updatedMeals).flatMap(list => list).reduce((s, m) => s + m.estimatedCost, 0),
      };

      const updatedMenu = { ...weeklyMenu, [selectedDay]: newDayMenu };
      setWeeklyMenu(updatedMenu);
      await saveMenuToFirestore(updatedMenu);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Autogenerate menu for the whole week at once! (Premium feature)
  const handleGenerateWholeWeek = async () => {
    if (!user || !family) return;
    if (availableIngredients.length === 0) {
      alert("Vui lòng kích hoạt nguyên liệu khả dụng trong Tủ nguyên liệu trước!");
      return;
    }
    setLoading(true);
    try {
      const tempMenu: typeof weeklyMenu = {};
      for (const day of DAYS_OF_WEEK) {
        const response = await generateDailyMenu({
          dailyCalorieTarget: family.nutritionTargets.calories,
          availableIngredients,
          recentMeals: Object.values(tempMenu).flatMap(dayMenu => 
            Object.values(dayMenu.meals).flatMap(mealList => mealList.map(m => m.recipeName))
          ),
          budgetLimit: 180000
        });
        tempMenu[day.id] = response;
      }
      setWeeklyMenu(tempMenu);
      await saveMenuToFirestore(tempMenu);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi tạo thực đơn cả tuần.");
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

    return Object.keys(ingredientCounts).map(ingId => {
      const meta = mergedIngredients.find(i => i.id === ingId);
      return {
        id: ingId,
        name: meta?.name || ingId,
        category: meta?.category || 'dry_spice',
        frequency: ingredientCounts[ingId]
      };
    });
  };

  const handleSaveManualMeal = async () => {
    if (!manualRecipeName.trim()) return;

    let currentDayMenu = weeklyMenu[selectedDay];
    if (!currentDayMenu) {
      currentDayMenu = {
        meals: { breakfast: [], lunch: [], dinner: [] },
        totalDayCalories: 0,
        estimatedTotalCost: 0,
        nutritionSummary: {
          proteinGrams: Math.round((family!.nutritionTargets.calories * 0.20) / 4),
          carbsGrams: Math.round((family!.nutritionTargets.calories * 0.55) / 4),
          fatGrams: Math.round((family!.nutritionTargets.calories * 0.25) / 9)
        },
        healthNote: "Thực đơn tự thiết lập thủ công"
      };
    }

    const newDish = {
      recipeName: manualRecipeName.trim(),
      calories: manualCalories,
      estimatedCost: manualCost,
      ingredientsUsed: [] as string[]
    };

    const updatedMeals = { ...currentDayMenu.meals };

    if (editingMeal) {
      // Update existing dish
      updatedMeals[manualMealType] = [...updatedMeals[manualMealType]];
      const existingDish = updatedMeals[manualMealType][editingMeal.index];
      updatedMeals[manualMealType][editingMeal.index] = {
        ...newDish,
        ingredientsUsed: existingDish?.ingredientsUsed || []
      };
    } else {
      // Add new dish
      updatedMeals[manualMealType] = [...updatedMeals[manualMealType], newDish];
    }

    const newDayMenu: DailyMenuResponse = {
      ...currentDayMenu,
      meals: updatedMeals,
      totalDayCalories: Object.values(updatedMeals).flatMap(list => list).reduce((s, m) => s + m.calories, 0),
      estimatedTotalCost: Object.values(updatedMeals).flatMap(list => list).reduce((s, m) => s + m.estimatedCost, 0),
    };

    const updatedMenu = { ...weeklyMenu, [selectedDay]: newDayMenu };
    setWeeklyMenu(updatedMenu);
    await saveMenuToFirestore(updatedMenu);
    
    // Reset
    setManualRecipeName('');
    setShowManualAdd(false);
    setEditingMeal(null);
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

  // Open edit modal for an existing dish
  const handleEditMeal = (mealType: 'breakfast' | 'lunch' | 'dinner', mealIndex: number) => {
    const currentDayMenu = weeklyMenu[selectedDay];
    if (!currentDayMenu) return;

    const dish = currentDayMenu.meals[mealType][mealIndex];
    if (!dish) return;

    setManualMealType(mealType);
    setManualRecipeName(dish.recipeName);
    setManualCalories(dish.calories);
    setManualCost(dish.estimatedCost);
    setEditingMeal({ mealType, index: mealIndex });
    setShowManualAdd(true);
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
      alert("Đã lưu thực đơn vào danh mục yêu thích!");
    } catch (err) {
      console.error(err);
      alert("Lỗi khi lưu thực đơn");
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
          proteinGrams: Math.round((family.nutritionTargets.calories * 0.20) / 4),
          carbsGrams: Math.round((family.nutritionTargets.calories * 0.55) / 4),
          fatGrams: Math.round((family.nutritionTargets.calories * 0.25) / 9)
        },
        healthNote: `Áp dụng từ thực đơn yêu thích: ${fav.name}`
      }
    };

    setWeeklyMenu(updatedMenu);
    await saveMenuToFirestore(updatedMenu);
    setActiveSubTab('menu');
    alert(`Đã áp dụng thực đơn yêu thích "${fav.name}" vào ngày ${DAYS_OF_WEEK.find(d => d.id === selectedDay)?.name}`);
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
        alert("Lỗi khi xóa thực đơn yêu thích");
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

  const CATEGORY_SHOP_NAMES = {
    meat_egg: 'Sạp thịt & trứng',
    seafood: 'Sạp thủy hải sản',
    vegetables: 'Sạp rau củ quả',
    fruits: 'Sạp hoa quả',
    dry_spice: 'Cửa hàng tạp hóa / Gia vị'
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
          {selectedDayMenu && family && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}><Flame size={16} style={{ color: 'var(--primary)' }} /> Dinh dưỡng ngày {DAYS_OF_WEEK.find(d => d.id === selectedDay)?.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{selectedDayMenu.totalDayCalories} / {family.nutritionTargets.calories} Kcal</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFavName(`Thực đơn ngày ${DAYS_OF_WEEK.find(d => d.id === selectedDay)?.name}`);
                      setShowSaveFav(true);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                    title="Lưu yêu thích"
                  >
                    <Heart size={16} fill="var(--primary)" />
                  </button>
                </div>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--bg-grey)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((selectedDayMenu.totalDayCalories / family.nutritionTargets.calories) * 100, 100)}%`,
                  backgroundColor: Math.abs(selectedDayMenu.totalDayCalories - family.nutritionTargets.calories) < 400 ? 'var(--secondary)' : 'var(--accent)',
                  borderRadius: '4px'
                }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>Đạm (P): {selectedDayMenu.nutritionSummary.proteinGrams}g</span>
                <span>Bột đường (C): {selectedDayMenu.nutritionSummary.carbsGrams}g</span>
                <span>Béo (F): {selectedDayMenu.nutritionSummary.fatGrams}g</span>
              </div>
              <div style={{ fontSize: '11px', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '4px' }}>
                💡 {selectedDayMenu.healthNote}
              </div>
            </div>
          )}

          {/* Meals list */}
          {selectedDayMenu ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(['breakfast', 'lunch', 'dinner'] as const).map(mealType => (
                <div key={mealType}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--primary-dark)',
                    marginBottom: '8px',
                    paddingLeft: '4px'
                  }}>
                    {mealType === 'breakfast' ? 'Bữa Sáng' : mealType === 'lunch' ? 'Bữa Trưa' : 'Bữa Tối'}
                  </h4>

                  {selectedDayMenu.meals[mealType].map((dish, idx) => (
                    <div key={idx} className="card" style={{
                      margin: 0,
                      marginBottom: '8px',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '15px' }}>{dish.recipeName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <span>{dish.calories} Kcal</span>
                          <span>•</span>
                          <span>Dự tính: {dish.estimatedCost.toLocaleString('vi-VN')}đ</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleEditMeal(mealType, idx)}
                          title="Sửa món"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMeal(mealType, idx)}
                          title="Xóa món"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent)',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShuffleMeal(mealType, idx)}
                          title="Đổi món khác"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.15s'
                          }}
                          disabled={loading}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-grey)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <RefreshCw size={14} className={loading ? 'spin' : ''} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setManualMealType(mealType);
                      setManualRecipeName('');
                      setManualCalories(200);
                      setManualCost(15000);
                      setEditingMeal(null);
                      setShowManualAdd(true);
                    }}
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: 'var(--border-radius-sm)',
                      border: '1px dashed var(--border)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      marginBottom: '16px'
                    }}
                  >
                    <Plus size={14} /> Thêm món thủ công
                  </button>
                </div>
              ))}

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
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
              <Calendar size={32} style={{ color: 'var(--text-secondary)', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '15px', marginBottom: '16px' }}>Thực đơn ngày này trống</h3>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerateDay}
                disabled={loading}
              >
                {loading ? 'Đang tạo thực đơn...' : 'Gợi ý thực đơn hôm nay'}
              </button>
            </div>
          )}
        </>
      ) : activeSubTab === 'shopping' ? (
        /* Shopping checklist */
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px' }}>Danh sách đi chợ tuần này</h3>
            <p style={{ fontSize: '12px' }}>Tự động tổng hợp từ thực đơn tuần của bạn. Đánh dấu để check off các thứ đã mua.</p>
          </div>

          {shoppingList.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>Thực đơn tuần trống nên không có nguyên liệu cần mua.</p>
          ) : (
            Object.keys(groupedShopping).map(catKey => (
              <div key={catKey} className="card" style={{ padding: '12px 16px', marginBottom: '12px' }}>
                <h4 style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--primary-dark)',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '4px',
                  marginBottom: '10px'
                }}>
                  {CATEGORY_SHOP_NAMES[catKey as keyof typeof CATEGORY_SHOP_NAMES]}
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {groupedShopping[catKey].map(item => {
                    const isPurchased = purchasedIngredients.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleTogglePurchased(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textDecoration: isPurchased ? 'line-through' : 'none',
                          color: isPurchased ? 'var(--text-secondary)' : 'var(--text-primary)',
                          padding: '4px 0'
                        }}
                      >
                        {isPurchased ? <CheckSquare size={18} style={{ color: 'var(--primary)' }} /> : <Square size={18} />}
                        <span>{item.name} <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>(Dùng {item.frequency} lần)</span></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
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

      {/* Manual Meal addition modal */}
      {showManualAdd && (
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
              <h3 style={{ fontSize: '16px' }}>
                {editingMeal ? 'Sửa món' : 'Thêm món'} ({manualMealType === 'breakfast' ? 'Bữa Sáng' : manualMealType === 'lunch' ? 'Bữa Trưa' : 'Bữa Tối'})
              </h3>
              <button
                type="button"
                onClick={() => { setShowManualAdd(false); setEditingMeal(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Tên món ăn</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: Phở bò gia truyền, Trứng chiên..."
                value={manualRecipeName}
                onChange={(e) => setManualRecipeName(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Calo (Kcal)</label>
                <input
                  type="number"
                  className="form-control"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Chi phí (đ)</label>
                <input
                  type="number"
                  className="form-control"
                  value={manualCost}
                  onChange={(e) => setManualCost(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleSaveManualMeal}
                className="btn btn-primary"
                style={{ flex: 1, height: '40px' }}
              >
                {editingMeal ? 'Cập nhật' : 'Lưu món'}
              </button>
              <button
                type="button"
                onClick={() => { setShowManualAdd(false); setEditingMeal(null); }}
                className="btn btn-secondary"
                style={{ flex: 1, height: '40px' }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
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
