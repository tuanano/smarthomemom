import { useState } from 'react';
import CurrencyInput from '../../../components/CurrencyInput';
import { useConfirm } from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';
import { useFamilyStore } from '../../../stores/familyStore';
import { useAuthStore } from '../../../stores/authStore';
import type { Budget } from '../../../types';
import { getMergedCategories } from '../../../core/constants';
import { Trash2 } from 'lucide-react';

export default function BudgetsSection() {
  const { user } = useAuthStore();
  const confirm = useConfirm();
  const showToast = useToast();
  const {
    budgets,
    customCategories,
    saveBudget,
    deleteBudget,
  } = useFamilyStore();

  const mergedCategories = getMergedCategories(customCategories);

  const unusedCategories = mergedCategories
    .filter(c => c.type === 'expense')
    .filter(c => !budgets.some(b => b.category === c.name));

  const [showAddBudget, setShowAddBudget] = useState(false);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetLimit, setNewBudgetLimit] = useState(2000000);

  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editBudgetLimit, setEditBudgetLimit] = useState(0);

  if (!user) return null;

  const handleCreateBudget = async () => {
    const cat = newBudgetCategory || unusedCategories.find(c => !budgets.some(b => b.category === c.name))?.name;
    if (!cat) {
      showToast("Không còn danh mục nào chưa thiết lập hạn mức!", "info");
      return;
    }
    try {
      const budgetId = 'budget_' + cat.replace(/\s+/g, '').replace(/\//g, '');
      await saveBudget(user.uid, {
        budgetId,
        category: cat,
        limitAmount: newBudgetLimit,
        spentAmount: 0,
        period: 'monthly',
        startDate: new Date(),
        endDate: new Date(),
        alertThreshold: 0.8,
        isAlerted: false
      });
      setShowAddBudget(false);
    } catch {
      showToast("Lỗi khi tạo hạn mức, vui lòng thử lại", "error");
    }
  };

  const handleUpdateBudget = async (b: Budget) => {
    try {
      await saveBudget(user.uid, { ...b, limitAmount: editBudgetLimit });
      setEditingBudgetId(null);
    } catch {
      showToast("Lỗi khi cập nhật hạn mức, vui lòng thử lại", "error");
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    const yes = await confirm({
      title: 'Xóa hạn mức',
      message: 'Bạn có chắc muốn xóa hạn mức chi tiêu cho danh mục này?',
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (yes) {
      await deleteBudget(user.uid, budgetId);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px' }}>Hạn mức chi tiêu tháng</h3>
        {unusedCategories.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setShowAddBudget(!showAddBudget);
              if (unusedCategories.length > 0) {
                setNewBudgetCategory(unusedCategories[0].name);
              }
            }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
          >
            {showAddBudget ? 'Hủy' : '+ Thêm hạn mức'}
          </button>
        )}
      </div>

      {/* Add budget card */}
      {showAddBudget && unusedCategories.length > 0 && (
        <div className="card" style={{ borderStyle: 'dashed' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Thiết lập hạn mức mới</h4>
          <div className="form-group">
            <label>Chọn danh mục chi tiêu</label>
            <select
              className="form-control"
              value={newBudgetCategory}
              onChange={(e) => setNewBudgetCategory(e.target.value)}
            >
              {unusedCategories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Hạn mức chi tối đa hàng tháng (VND)</label>
            <CurrencyInput
              className="form-control"
              value={newBudgetLimit}
              onChange={setNewBudgetLimit}
            />
          </div>
          <button
            type="button"
            onClick={handleCreateBudget}
            className="btn btn-primary"
            style={{ width: '100%', height: '44px' }}
          >
            Lưu hạn mức
          </button>
        </div>
      )}

      {/* List budgets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {budgets.map(b => {
          const isEditing = editingBudgetId === b.budgetId;
          return (
            <div key={b.budgetId} className="card" style={{ margin: 0, padding: '16px' }}>
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Hạn mức: {b.category}</div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Số tiền hạn mức tối đa (VND)</label>
                    <CurrencyInput
                      className="form-control"
                      value={editBudgetLimit}
                      onChange={setEditBudgetLimit}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleUpdateBudget(b)}
                      className="btn btn-primary"
                      style={{ flex: 1, height: '36px', fontSize: '12px' }}
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingBudgetId(null)}
                      className="btn btn-secondary"
                      style={{ flex: 1, height: '36px', fontSize: '12px' }}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{b.category}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Ngân sách tối đa: <strong>{b.limitAmount.toLocaleString('vi-VN')} đ</strong> / tháng
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBudgetId(b.budgetId);
                        setEditBudgetLimit(b.limitAmount);
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
                      onClick={() => handleDeleteBudget(b.budgetId)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
