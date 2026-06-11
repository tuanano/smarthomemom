import { useState, useEffect } from 'react';
import { X, Sparkles, Pencil, Loader, Bot, BrainCircuit, ChefHat, Flame } from 'lucide-react';
import {
  generateMealSuggestions,
  estimateDishCalories,
} from '../../core/gemini';
import type { Meal, MealOption, FoodPreference, CalorieEstimate } from '../../core/gemini';

interface Props {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  familySize: number;
  availableIngredients: string[];
  recentMeals: string[];
  onSave: (meal: Meal) => void;
  onClose: () => void;
  initialMeal?: Meal;
}

type Mode = 'ai' | 'manual';

interface PrefChip {
  id: FoodPreference;
  label: string;
}

const PREF_CHIPS: PrefChip[] = [
  { id: 'any',       label: '🎲 Tất cả' },
  { id: 'com',       label: '🍚 Cơm' },
  { id: 'bun_pho_my', label: '🍜 Bún/Phở/Mỳ' },
  { id: 'chao_sup',  label: '🥣 Cháo/Súp' },
  { id: 'lau_nuong', label: '🫕 Lẩu/Nướng' },
  { id: 'mon_cuon',  label: '🥗 Món cuốn' },
  { id: 'chay',      label: '🌿 Chay' },
];

const LOADING_STEPS = [
  '🔍 Đang phân tích nguyên liệu...',
  '🍳 Đang tìm kiếm công thức phù hợp...',
  '📊 Đang tính thành phần dinh dưỡng...',
  '💰 Đang ước tính chi phí thị trường...',
  '✨ Sắp có kết quả rồi...',
];

const MEAL_LABEL = { breakfast: 'Bữa Sáng', lunch: 'Bữa Trưa', dinner: 'Bữa Tối' };

export default function AddMealModal({ mealType, familySize, availableIngredients, recentMeals, onSave, onClose, initialMeal }: Props) {
  const [mode, setMode] = useState<Mode>(initialMeal ? 'manual' : 'ai');
  const [preference, setPreference] = useState<FoodPreference>('any');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [suggestions, setSuggestions] = useState<MealOption[]>([]);

  // Manual mode state
  const [name, setName] = useState(initialMeal?.recipeName || '');
  const [calories, setCalories] = useState(initialMeal?.calories || 300);
  const [calcingCal, setCalcingCal] = useState(false);
  const [calResult, setCalResult] = useState<CalorieEstimate | null>(null);

  // Cycle loading messages while generating
  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const interval = setInterval(() => {
      setLoadingStep(s => (s + 1) % LOADING_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    setLoading(true);
    setSuggestions([]);
    try {
      const results = await generateMealSuggestions({
        mealType,
        preference,
        familySize,
        availableIngredients,
        recentMeals,
      });
      setSuggestions(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (meal: MealOption) => {
    onSave({ recipeName: meal.recipeName, calories: meal.calories, estimatedCost: 0, ingredientsUsed: meal.ingredientsUsed });
  };

  const handleCalcCalories = async () => {
    if (!name.trim()) return;
    setCalcingCal(true);
    setCalResult(null);
    try {
      const result = await estimateDishCalories(name.trim());
      setCalResult(result);
      setCalories(result.calories);
    } catch (err) {
      console.error(err);
    } finally {
      setCalcingCal(false);
    }
  };

  const handleSaveManual = () => {
    if (!name.trim()) return;
    onSave({ recipeName: name.trim(), calories, estimatedCost: 0, ingredientsUsed: [] });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-meal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="slide-up"
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px 20px 0 0',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 id="add-meal-title" style={{ fontSize: '16px', fontWeight: 700 }}>
            {initialMeal ? 'Sửa món' : 'Thêm món'} — {MEAL_LABEL[mealType]}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode toggle — only when adding new */}
        {!initialMeal && (
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <button
              type="button"
              onClick={() => setMode('ai')}
              style={{
                flex: 1, padding: '10px', borderRadius: 'var(--border-radius-sm)',
                border: '1.5px solid', borderColor: mode === 'ai' ? 'var(--primary)' : 'var(--border)',
                backgroundColor: mode === 'ai' ? 'var(--primary-bg)' : 'transparent',
                color: mode === 'ai' ? 'var(--primary)' : 'var(--text-secondary)',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              <Sparkles size={14} /> AI Gợi ý
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              style={{
                flex: 1, padding: '10px', borderRadius: 'var(--border-radius-sm)',
                border: '1.5px solid', borderColor: mode === 'manual' ? 'var(--primary)' : 'var(--border)',
                backgroundColor: mode === 'manual' ? 'var(--primary-bg)' : 'transparent',
                color: mode === 'manual' ? 'var(--primary)' : 'var(--text-secondary)',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              <Pencil size={14} /> Tự thiết kế
            </button>
          </div>
        )}

        {/* ── AI MODE ── */}
        {mode === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Preference chips */}
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                Loại món muốn gợi ý:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {PREF_CHIPS.map(chip => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => { setPreference(chip.id); setSuggestions([]); }}
                    style={{
                      padding: '6px 12px', borderRadius: '20px',
                      border: '1.5px solid',
                      borderColor: preference === chip.id ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: preference === chip.id ? 'var(--primary-bg)' : 'transparent',
                      color: preference === chip.id ? 'var(--primary)' : 'var(--text-primary)',
                      fontSize: '12px', fontWeight: preference === chip.id ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="btn btn-primary"
              style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading
                ? <><Loader size={15} className="spin" /> Đang tìm món...</>
                : <><Sparkles size={15} /> Gợi ý ngay</>}
            </button>

            {/* Loading state — cycling message + skeleton cards */}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  textAlign: 'center', fontSize: '13px', fontWeight: 600,
                  color: 'var(--primary)', padding: '4px 0',
                  minHeight: '24px',
                }}>
                  {LOADING_STEPS[loadingStep]}
                </div>
                {[0.1, 0.3, 0.5].map((delay, i) => (
                  <div
                    key={i}
                    className="skeleton"
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--border-radius-sm)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg)',
                      animationDelay: `${delay}s`,
                    }}
                  >
                    <div style={{ height: '14px', width: `${55 + i * 12}%`, background: 'var(--bg-grey)', borderRadius: '4px', marginBottom: '10px' }} />
                    <div style={{ height: '11px', width: '75%', background: 'var(--bg-grey)', borderRadius: '4px', marginBottom: '10px' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ height: '20px', width: '64px', background: 'var(--bg-grey)', borderRadius: '10px' }} />
                      <div style={{ height: '20px', width: '82px', background: 'var(--bg-grey)', borderRadius: '10px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestion cards */}
            {!loading && suggestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Chọn một món phù hợp:
                </p>
                {suggestions.map((meal, idx) => (
                  <div
                    key={idx}
                    className="slide-up"
                    onClick={() => handleSelectSuggestion(meal)}
                    style={{
                      padding: '12px 14px', borderRadius: 'var(--border-radius-sm)',
                      border: '1.5px solid var(--border)',
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      backgroundColor: 'var(--bg-card)',
                      animationDelay: `${idx * 0.07}s`,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    {/* Calorie badge */}
                    <div style={{
                      flexShrink: 0, width: '52px', textAlign: 'center',
                      padding: '6px 0', borderRadius: '8px',
                      backgroundColor: 'rgba(255,140,105,0.10)',
                    }}>
                      <Flame size={13} style={{ color: 'var(--primary)', display: 'block', margin: '0 auto 2px' }} />
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{meal.calories}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '1px' }}>Kcal</div>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px', lineHeight: 1.4 }}>
                        {meal.recipeName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {meal.description}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div style={{ flexShrink: 0, fontSize: '18px', color: 'var(--primary)', opacity: 0.5 }}>›</div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty prompt */}
            {!loading && suggestions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)' }}>
                <ChefHat size={28} style={{ marginBottom: '8px', opacity: 0.45 }} />
                <p style={{ fontSize: '13px' }}>Chọn loại món và nhấn "Gợi ý ngay"</p>
                <p style={{ fontSize: '11px', marginTop: '4px' }}>AI sẽ đề xuất 3 món phù hợp với nguyên liệu và sở thích</p>
              </div>
            )}
          </div>
        )}

        {/* ── MANUAL MODE ── */}
        {mode === 'manual' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Tên món ăn</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: Phở bò gia truyền, Trứng chiên..."
                value={name}
                onChange={(e) => { setName(e.target.value); setCalResult(null); }}
              />
            </div>

            {/* Calories + AI calc */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Calo (Kcal/người) — 1 khẩu phần
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  style={{ flex: 1 }}
                  value={calories}
                  min={0}
                  onChange={(e) => setCalories(parseInt(e.target.value) || 0)}
                />
                <button
                  type="button"
                  onClick={handleCalcCalories}
                  disabled={calcingCal || !name.trim()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '0 12px', height: '40px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1.5px solid var(--primary)',
                    backgroundColor: 'var(--primary-bg)',
                    color: 'var(--primary)',
                    fontSize: '12px', fontWeight: 700,
                    cursor: name.trim() ? 'pointer' : 'not-allowed',
                    opacity: name.trim() ? 1 : 0.5,
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}
                >
                  {calcingCal
                    ? <><Loader size={13} className="spin" /> Đang tính...</>
                    : <><BrainCircuit size={13} /> AI tính Calo</>}
                </button>
              </div>

              {calResult && (
                <div style={{
                  marginTop: '8px', padding: '10px 12px',
                  borderRadius: 'var(--border-radius-sm)',
                  backgroundColor: 'rgba(129,178,154,0.12)',
                  border: '1px solid rgba(129,178,154,0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '4px' }}>
                    <Bot size={13} /> AI ước tính: {calResult.calories} Kcal/người
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Đạm: {calResult.proteinGrams}g</span>
                    <span>Bột đường: {calResult.carbsGrams}g</span>
                    <span>Béo: {calResult.fatGrams}g</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    💡 {calResult.note}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveManual}
              disabled={!name.trim()}
              className="btn btn-primary"
              style={{ height: '42px', opacity: name.trim() ? 1 : 0.5, cursor: name.trim() ? 'pointer' : 'not-allowed' }}
            >
              {initialMeal ? 'Cập nhật món' : 'Lưu món'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
