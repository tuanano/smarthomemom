import { useState } from 'react';
import { useConfirm } from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';
import { useFamilyStore } from '../../../stores/familyStore';
import { useAuthStore } from '../../../stores/authStore';
import type { CustomIngredient } from '../../../types';
import { Plus, Trash2 } from 'lucide-react';

export default function IngredientsSection() {
  const { user } = useAuthStore();
  const confirm = useConfirm();
  const showToast = useToast();
  const {
    family,
    customIngredients,
    addCustomIngredient,
    deleteCustomIngredient,
  } = useFamilyStore();

  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editIngName, setEditIngName] = useState('');
  const [editIngCategory, setEditIngCategory] = useState<'meat_egg' | 'seafood' | 'vegetables' | 'fruits' | 'dry_spice'>('vegetables');

  const [newIngName, setNewIngName] = useState('');
  const [newIngCategory, setNewIngCategory] = useState<'meat_egg' | 'seafood' | 'vegetables' | 'fruits' | 'dry_spice'>('vegetables');

  if (!user || !family) return null;

  const handleAddCustomIngredient = async () => {
    if (!newIngName.trim()) return;
    const ingId = 'ing_' + Date.now().toString();
    const newIng: CustomIngredient = {
      id: ingId,
      name: newIngName.trim(),
      category: newIngCategory
    };
    try {
      await addCustomIngredient(family.familyId, newIng);
      setNewIngName('');
      showToast("Đã thêm nguyên liệu tùy chỉnh!", "success");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi thêm nguyên liệu", "error");
    }
  };

  const handleDeleteCustomIngredient = async (ingId: string) => {
    const yes = await confirm({
      title: 'Xóa nguyên liệu',
      message: 'Bạn có muốn xóa nguyên liệu này khỏi tủ đồ tùy chỉnh?',
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (yes) {
      try {
        await deleteCustomIngredient(family.familyId, ingId);
      } catch (err) {
        console.error(err);
        showToast("Lỗi khi xóa nguyên liệu", "error");
      }
    }
  };

  const handleUpdateCustomIngredient = async (ingId: string) => {
    if (!editIngName.trim()) return;
    const updatedIng: CustomIngredient = {
      id: ingId,
      name: editIngName.trim(),
      category: editIngCategory
    };
    try {
      await addCustomIngredient(family.familyId, updatedIng);
      setEditingIngredientId(null);
      showToast("Đã cập nhật nguyên liệu!", "success");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi cập nhật nguyên liệu", "error");
    }
  };

  const getCatName = (cat: string) => {
    switch(cat) {
      case 'meat_egg': return 'Thịt & Trứng';
      case 'seafood': return 'Hải sản';
      case 'vegetables': return 'Rau củ';
      case 'fruits': return 'Trái cây';
      case 'dry_spice': return 'Đồ khô & Gia vị';
      default: return 'Khác';
    }
  };

  const allIngredients = customIngredients;
  const grouped: { [key: string]: typeof allIngredients } = {};
  allIngredients.forEach(ing => {
    grouped[ing.category] = grouped[ing.category] || [];
    grouped[ing.category].push(ing);
  });

  return (
    <>
      {/* List of ingredients grouped by category */}
      {Object.keys(grouped).map(catKey => (
        <div key={catKey} style={{ marginBottom: '24px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 700,
            borderBottom: '1px solid var(--border)',
            paddingBottom: '6px',
            marginBottom: '12px',
            color: 'var(--text-secondary)'
          }}>
            {getCatName(catKey)} ({grouped[catKey].length})
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {grouped[catKey].map(ing => {
              const isCustom = true;
              const isEditing = editingIngredientId === ing.id;

              return (
                <div
                  key={ing.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Tên nguyên liệu</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editIngName}
                          onChange={(e) => setEditIngName(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Nhóm nguyên liệu</label>
                        <select
                          className="form-control"
                          value={editIngCategory}
                          onChange={(e: any) => setEditIngCategory(e.target.value)}
                        >
                          <option value="meat_egg">Thịt & Trứng</option>
                          <option value="seafood">Hải sản</option>
                          <option value="vegetables">Rau củ</option>
                          <option value="fruits">Trái cây</option>
                          <option value="dry_spice">Đồ khô & Gia vị</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateCustomIngredient(ing.id)}
                          className="btn btn-primary"
                          style={{ flex: 1, height: '36px', fontSize: '12px' }}
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIngredientId(null)}
                          className="btn btn-secondary"
                          style={{ flex: 1, height: '36px', fontSize: '12px' }}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{ing.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {!isCustom ? (
                          <span style={{
                            fontSize: '10px',
                            backgroundColor: 'var(--bg-grey)',
                            color: 'var(--text-secondary)',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 600
                          }}>Hệ thống</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingIngredientId(ing.id);
                                setEditIngName(ing.name);
                                setEditIngCategory(ing.category);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomIngredient(ing.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Add Custom Ingredient Form */}
      <div className="card" style={{ borderStyle: 'dashed', backgroundColor: 'var(--secondary-bg)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Thêm nguyên liệu mới</h4>
        <div className="form-group">
          <label>Tên nguyên liệu</label>
          <input
            type="text"
            className="form-control"
            placeholder="Ví dụ: Rau đay, cá quả, ốc..."
            value={newIngName}
            onChange={(e) => setNewIngName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Nhóm nguyên liệu</label>
          <select
            className="form-control"
            value={newIngCategory}
            onChange={(e: any) => setNewIngCategory(e.target.value)}
          >
            <option value="meat_egg">Thịt & Trứng</option>
            <option value="seafood">Hải sản</option>
            <option value="vegetables">Rau củ</option>
            <option value="fruits">Trái cây</option>
            <option value="dry_spice">Đồ khô & Gia vị</option>
          </select>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleAddCustomIngredient}
          style={{ width: '100%', height: '44px' }}
        >
          <Plus size={16} /> Thêm nguyên liệu
        </button>
      </div>
    </>
  );
}
