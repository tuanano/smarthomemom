import { useState } from 'react';
import { useConfirm } from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';
import { useFamilyStore } from '../../../stores/familyStore';
import { useAuthStore } from '../../../stores/authStore';
import type { CustomCategory } from '../../../types';
import { getMergedCategories, ICON_MAP } from '../../../core/constants';
import { HelpCircle, ChevronDown, Plus, Trash2 } from 'lucide-react';

const ICON_OPTIONS: { name: string; label: string }[] = [
  { name: 'Utensils', label: 'Ăn uống' },
  { name: 'UtensilsCrossed', label: 'Nhà hàng' },
  { name: 'Coffee', label: 'Cà phê' },
  { name: 'Wine', label: 'Đồ uống' },
  { name: 'ShoppingBag', label: 'Mua sắm' },
  { name: 'ShoppingCart', label: 'Siêu thị' },
  { name: 'Shirt', label: 'Quần áo' },
  { name: 'Scissors', label: 'Cắt tóc' },
  { name: 'Sparkles', label: 'Làm đẹp' },
  { name: 'Car', label: 'Xe hơi' },
  { name: 'Bike', label: 'Xe máy' },
  { name: 'Bus', label: 'Xe buýt' },
  { name: 'Plane', label: 'Máy bay' },
  { name: 'Fuel', label: 'Xăng dầu' },
  { name: 'Home', label: 'Nhà ở' },
  { name: 'Lightbulb', label: 'Điện' },
  { name: 'Droplets', label: 'Nước' },
  { name: 'Wifi', label: 'Internet' },
  { name: 'Zap', label: 'Gas/Điện' },
  { name: 'Flame', label: 'Gas' },
  { name: 'Sofa', label: 'Nội thất' },
  { name: 'Wrench', label: 'Sửa chữa' },
  { name: 'HeartPulse', label: 'Sức khỏe' },
  { name: 'Pill', label: 'Thuốc' },
  { name: 'Stethoscope', label: 'Bác sĩ' },
  { name: 'Dumbbell', label: 'Thể dục' },
  { name: 'Activity', label: 'Hoạt động' },
  { name: 'GraduationCap', label: 'Học phí' },
  { name: 'BookOpen', label: 'Sách vở' },
  { name: 'Laptop', label: 'Máy tính' },
  { name: 'Briefcase', label: 'Công việc' },
  { name: 'Tv', label: 'Giải trí' },
  { name: 'Music', label: 'Âm nhạc' },
  { name: 'Gamepad2', label: 'Game' },
  { name: 'Camera', label: 'Ảnh/Video' },
  { name: 'Film', label: 'Phim' },
  { name: 'Baby', label: 'Trẻ em' },
  { name: 'Gift', label: 'Quà tặng' },
  { name: 'Heart', label: 'Tình cảm' },
  { name: 'PartyPopper', label: 'Lễ tiệc' },
  { name: 'Phone', label: 'Điện thoại' },
  { name: 'Globe', label: 'Quốc tế' },
  { name: 'Leaf', label: 'Môi trường' },
  { name: 'Package', label: 'Đơn hàng' },
  { name: 'PiggyBank', label: 'Tiết kiệm' },
  { name: 'TrendingUp', label: 'Đầu tư' },
  { name: 'DollarSign', label: 'Thu nhập' },
  { name: 'Wallet', label: 'Ví tiền' },
  { name: 'BarChart3', label: 'Tài chính' },
  { name: 'HelpCircle', label: 'Khác' },
];

function IconPicker({ value, onChange, color }: { value: string; onChange: (v: string) => void; color: string }) {
  const [open, setOpen] = useState(false);
  const CurrentIcon = ICON_MAP[value] || HelpCircle;
  const currentLabel = ICON_OPTIONS.find(i => i.name === value)?.label || value;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="form-control"
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
          backgroundColor: open ? 'var(--primary-bg)' : undefined,
          borderColor: open ? 'var(--primary)' : undefined,
        }}
      >
        <div style={{
          width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
          backgroundColor: `${color}22`, color: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <CurrentIcon size={14} />
        </div>
        <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, textAlign: 'left' }}>{currentLabel}</span>
        <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          marginTop: '6px',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '4px',
          padding: '8px',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card)',
          maxHeight: '192px',
          overflowY: 'auto'
        }}>
          {ICON_OPTIONS.map(opt => {
            const Icon = ICON_MAP[opt.name] || HelpCircle;
            const isSelected = value === opt.name;
            return (
              <button
                key={opt.name}
                type="button"
                onClick={() => { onChange(opt.name); setOpen(false); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '3px', padding: '7px 2px', borderRadius: '8px',
                  border: isSelected ? `1.5px solid ${color}` : '1.5px solid transparent',
                  backgroundColor: isSelected ? `${color}22` : 'transparent',
                  color: isSelected ? color : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <Icon size={18} />
                <span style={{
                  fontSize: '9px', fontWeight: isSelected ? 700 : 500,
                  textAlign: 'center', lineHeight: 1.2,
                  maxWidth: '38px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CategoriesSection() {
  const { user } = useAuthStore();
  const confirm = useConfirm();
  const showToast = useToast();
  const {
    family,
    customCategories,
    addCustomCategory,
    deleteCustomCategory,
  } = useFamilyStore();

  const mergedCategories = getMergedCategories(customCategories);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatType, setEditCatType] = useState<'income' | 'expense'>('expense');
  const [editCatIcon, setEditCatIcon] = useState('Utensils');
  const [editCatColor, setEditCatColor] = useState('#FF8C69');

  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
  const [newCatIcon, setNewCatIcon] = useState('Utensils');
  const [newCatColor, setNewCatColor] = useState('#FF8C69');

  if (!user || !family) return null;

  const handleAddCustomCategory = async () => {
    if (!newCatName.trim()) return;
    const catId = 'cat_' + Date.now().toString();
    const newCat: CustomCategory = {
      id: catId,
      name: newCatName.trim(),
      type: newCatType,
      iconName: newCatIcon,
      color: newCatColor
    };
    try {
      await addCustomCategory(family.familyId, newCat);
      setNewCatName('');
      showToast("Đã thêm danh mục tùy chỉnh!", "success");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi thêm danh mục tùy chỉnh", "error");
    }
  };

  const handleDeleteCustomCategory = async (catId: string) => {
    const yes = await confirm({
      title: 'Xóa danh mục',
      message: 'Bạn có muốn xóa danh mục này?',
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (yes) {
      try {
        await deleteCustomCategory(family.familyId, catId);
      } catch (err) {
        console.error(err);
        showToast("Lỗi khi xóa danh mục", "error");
      }
    }
  };

  const handleUpdateCustomCategory = async (catId: string) => {
    if (!editCatName.trim()) return;
    const updatedCat: CustomCategory = {
      id: catId,
      name: editCatName.trim(),
      type: editCatType,
      iconName: editCatIcon,
      color: editCatColor
    };
    try {
      await addCustomCategory(family.familyId, updatedCat);
      setEditingCategoryId(null);
      showToast("Đã cập nhật danh mục!", "success");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi cập nhật danh mục", "error");
    }
  };

  return (
    <>
      {/* List of categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {mergedCategories.map(cat => {
          const isCustom = true;
          const isEditing = editingCategoryId === cat.id;
          const IconComponent = cat.icon || HelpCircle;

          return (
            <div
              key={cat.id}
              className="card"
              style={{
                margin: 0,
                padding: '16px',
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg-card)'
              }}
            >
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Sửa danh mục: {cat.name}</div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Tên danh mục</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Loại</label>
                    <select
                      className="form-control"
                      value={editCatType}
                      onChange={(e: any) => setEditCatType(e.target.value)}
                    >
                      <option value="expense">Khoản chi</option>
                      <option value="income">Khoản thu</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Biểu tượng</label>
                    <IconPicker value={editCatIcon} onChange={setEditCatIcon} color={editCatColor} />
                  </div>
                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <label>Màu sắc</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="color"
                        className="form-control"
                        value={editCatColor}
                        onChange={(e) => setEditCatColor(e.target.value)}
                        style={{ width: '60px', padding: '0 4px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px' }}>{editCatColor}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleUpdateCustomCategory(cat.id)}
                      className="btn btn-primary"
                      style={{ flex: 1, height: '36px', fontSize: '12px' }}
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategoryId(null)}
                      className="btn btn-secondary"
                      style={{ flex: 1, height: '36px', fontSize: '12px' }}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: `${cat.color}22`,
                      color: cat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <IconComponent size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{cat.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {cat.type === 'expense' ? 'Khoản chi' : cat.type === 'income' ? 'Khoản thu' : 'Chuyển tiền'}
                      </div>
                    </div>
                  </div>

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
                            setEditingCategoryId(cat.id);
                            setEditCatName(cat.name);
                            setEditCatType(cat.type as any);
                            setEditCatIcon(cat.iconName || 'HelpCircle');
                            setEditCatColor(cat.color);
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
                          onClick={() => handleDeleteCustomCategory(cat.id)}
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

      {/* Add Custom Category Form */}
      <div className="card" style={{ borderStyle: 'dashed', backgroundColor: 'var(--secondary-bg)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Thêm danh mục mới</h4>
        <div className="form-group">
          <label>Tên danh mục</label>
          <input
            type="text"
            className="form-control"
            placeholder="Ví dụ: Ăn vặt, Nuôi thú cưng..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Loại danh mục</label>
            <select
              className="form-control"
              value={newCatType}
              onChange={(e: any) => setNewCatType(e.target.value)}
            >
              <option value="expense">Khoản chi</option>
              <option value="income">Khoản thu</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Biểu tượng</label>
          <IconPicker value={newCatIcon} onChange={setNewCatIcon} color={newCatColor} />
        </div>
        <div className="form-group">
          <label>Màu sắc đại diện</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="color"
              className="form-control"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              style={{ width: '60px', padding: '0 4px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Mã màu: {newCatColor}</span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleAddCustomCategory}
          style={{ width: '100%', height: '44px' }}
        >
          <Plus size={16} /> Thêm danh mục
        </button>
      </div>
    </>
  );
}
