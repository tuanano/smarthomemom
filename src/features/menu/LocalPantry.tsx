import { useFamilyStore } from '../../stores/familyStore';
import { useAuthStore } from '../../stores/authStore';
import { Check, Info, ShoppingBasket } from 'lucide-react';
import PullToRefresh from '../../components/PullToRefresh';

const CATEGORY_NAMES = {
  meat_egg: 'Thịt & Trứng',
  seafood: 'Thủy hải sản',
  vegetables: 'Rau xanh & Củ quả',
  fruits: 'Trái cây tráng miệng',
  dry_spice: 'Gia vị & Đồ khô'
};

export default function LocalPantry() {
  const { user } = useAuthStore();
  const { availableIngredients, saveIngredients, customIngredients } = useFamilyStore();
  
  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  const handleToggle = async (ingredientId: string) => {
    if (!user) return;
    
    let newList: string[];
    if (availableIngredients.includes(ingredientId)) {
      newList = availableIngredients.filter(id => id !== ingredientId);
    } else {
      newList = [...availableIngredients, ingredientId];
    }
    
    try {
      await saveIngredients(user.uid, newList);
    } catch (err) {
      console.error(err);
    }
  };

  const selectAll = async () => {
    if (!user) return;
    const allIds = customIngredients.map(i => i.id);
    await saveIngredients(user.uid, allIds);
  };

  const clearAll = async () => {
    if (!user) return;
    await saveIngredients(user.uid, []);
  };

  // Group ingredients
  const grouped = customIngredients.reduce((acc, ing) => {
    acc[ing.category] = acc[ing.category] || [];
    acc[ing.category].push(ing);
    return acc;
  }, {} as { [key: string]: { id: string; name: string; category: string; }[] });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingBasket size={22} style={{ color: 'var(--primary)' }} />
            Tủ nguyên liệu khả dụng
          </h2>
          <p style={{ fontSize: '12px' }}>Chỉ những thực phẩm được bật mới xuất hiện trong gợi ý thực đơn của AI.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button type="button" onClick={selectAll} className="btn btn-secondary" style={{ flex: 1, height: '36px', fontSize: '12px' }}>Chọn tất cả</button>
        <button type="button" onClick={clearAll} className="btn btn-secondary" style={{ flex: 1, height: '36px', fontSize: '12px', color: 'var(--danger)' }}>Bỏ tất cả</button>
      </div>

      {Object.keys(grouped).map(catKey => (
        <div key={catKey} style={{ marginBottom: '20px' }}>
          <h4 style={{
            fontSize: '14px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '6px',
            marginBottom: '10px',
            color: 'var(--text-secondary)'
          }}>
            {CATEGORY_NAMES[catKey as keyof typeof CATEGORY_NAMES]}
          </h4>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            {grouped[catKey].map((ing: any) => {
              const isChecked = availableIngredients.includes(ing.id);
              return (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => handleToggle(ing.id)}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid',
                    borderColor: isChecked ? 'var(--primary)' : 'var(--border)',
                    backgroundColor: isChecked ? 'var(--primary-bg)' : 'var(--bg-card)',
                    color: isChecked ? 'var(--primary)' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{ing.name}</span>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: isChecked ? 'var(--primary)' : 'var(--border)',
                    backgroundColor: isChecked ? 'var(--primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    {isChecked && <Check size={14} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FFFEEA', borderColor: '#E8E5B8', padding: '12px' }}>
        <Info size={16} style={{ color: '#E0B500', flexShrink: 0 }} />
        <p style={{ fontSize: '11px', color: '#857500' }}>
          Mẹo: Hãy tắt các nguyên liệu trái mùa hoặc khó mua tại địa phương của bạn để thực đơn AI gợi ý luôn có tính thực tế và dễ dàng đi chợ.
        </p>
      </div>
    </PullToRefresh>
  );
}
