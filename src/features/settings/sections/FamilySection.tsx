import { useState } from 'react';
import { useConfirm } from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';
import { useFamilyStore } from '../../../stores/familyStore';
import { useAuthStore } from '../../../stores/authStore';
import type { FamilyMember } from '../../../types';
import { Users, Save, Flame, Plus, Trash2, Pencil, Check, UserCheck } from 'lucide-react';

const calculateMemberCalories = (member: FamilyMember): number => {
  let base = 2000;
  if (member.role === 'father') base = 2400;
  else if (member.role === 'mother') base = 2000;
  else if (member.role === 'grandparent') base = 1600;
  else {
    if (member.age < 3) base = 1000;
    else if (member.age < 6) base = 1400;
    else if (member.age < 12) base = 1800;
    else base = 2200;
  }

  const multipliers = {
    sedentary: 0.85,
    lightly_active: 1.0,
    moderately_active: 1.15,
    very_active: 1.3
  };

  return Math.round(base * multipliers[member.activityLevel]);
};

export default function FamilySection() {
  const { user } = useAuthStore();
  const confirm = useConfirm();
  const showToast = useToast();
  const { family, saveFamily } = useFamilyStore();

  const [editFamilyName, setEditFamilyName] = useState(family?.familyName || '');
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<'father' | 'mother' | 'child' | 'grandparent'>('child');
  const [memberAgeStr, setMemberAgeStr] = useState('6');
  const [memberGender, setMemberGender] = useState<'male' | 'female'>('male');
  const [memberActivity, setMemberActivity] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'>('lightly_active');

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberRole, setEditMemberRole] = useState<'father' | 'mother' | 'child' | 'grandparent'>('child');
  const [editMemberAgeStr, setEditMemberAgeStr] = useState('');
  const [editMemberGender, setEditMemberGender] = useState<'male' | 'female'>('male');
  const [editMemberActivity, setEditMemberActivity] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'>('lightly_active');

  if (!user || !family) return null;

  const recalculateAndSaveFamily = async (updatedMembers: FamilyMember[], updatedName: string = family.familyName) => {
    const totalCal = updatedMembers.reduce((sum, m) => sum + calculateMemberCalories(m), 0);
    const protein = Math.round((totalCal * 0.20) / 4);
    const carbs = Math.round((totalCal * 0.55) / 4);
    const fat = Math.round((totalCal * 0.25) / 9);

    await saveFamily({
      ...family,
      familyName: updatedName,
      members: updatedMembers,
      nutritionTargets: {
        calories: totalCal,
        protein,
        carbs,
        fat
      },
      updatedAt: new Date()
    });
  };

  const handleSaveFamilyName = async () => {
    if (!editFamilyName.trim()) return;
    await recalculateAndSaveFamily(family.members, editFamilyName.trim());
    showToast("Đã cập nhật tên gia đình!", "success");
  };

  const handleAddMember = async () => {
    if (!memberName.trim()) return;
    const age = parseInt(memberAgeStr) || 1;
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: memberName.trim(),
      role: memberRole,
      age,
      gender: memberGender,
      activityLevel: memberActivity
    };
    const updated = [...family.members, newMember];
    await recalculateAndSaveFamily(updated);
    setMemberName('');
    setMemberAgeStr('6');
  };

  const handleUpdateMember = async () => {
    if (!editingMemberId || !editMemberName.trim()) return;
    const age = parseInt(editMemberAgeStr) || 1;
    const updated = family.members.map(m =>
      m.id === editingMemberId
        ? { ...m, name: editMemberName.trim(), role: editMemberRole, age, gender: editMemberGender, activityLevel: editMemberActivity }
        : m
    );
    await recalculateAndSaveFamily(updated);
    setEditingMemberId(null);
  };

  const handleDeleteMember = async (id: string) => {
    if (family.members.length <= 1) {
      showToast("Gia đình cần có ít nhất một thành viên!", "warning");
      return;
    }
    const yes = await confirm({
      title: 'Xóa thành viên',
      message: 'Bạn có muốn xóa thành viên này? Chỉ số calo gia đình sẽ được tự động tính toán lại.',
      confirmText: 'Xóa',
      variant: 'danger'
    });
    if (yes) {
      const updated = family.members.filter(m => m.id !== id);
      await recalculateAndSaveFamily(updated);
    }
  };

  const handleSetDefaultSpender = async (id: string) => {
    const updated = family.members.map(m => ({ ...m, isDefaultSpender: m.id === id }));
    await recalculateAndSaveFamily(updated);
  };

  const handleLinkUserToMember = async (memberId: string) => {
    if (!user) return;
    await saveFamily({
      ...family,
      linkedMemberIds: { ...(family.linkedMemberIds || {}), [user.uid]: memberId }
    });
  };

  return (
    <>
      <div className="card">
        <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>Tên gia đình</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="form-control"
            value={editFamilyName}
            onChange={(e) => setEditFamilyName(e.target.value)}
          />
          <button
            type="button"
            onClick={handleSaveFamilyName}
            className="btn btn-primary"
            style={{ width: '48px', height: '48px', padding: 0 }}
          >
            <Save size={18} />
          </button>
        </div>
      </div>

      {/* Tài khoản của bạn là ai */}
      {(() => {
        const linkedId = family.linkedMemberIds?.[user.uid];
        const linkedMember = family.members.find(m => m.id === linkedId);
        return (
          <div className="card" style={{ marginBottom: '20px', backgroundColor: 'var(--primary-bg)', borderColor: 'var(--primary-light)', borderWidth: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <UserCheck size={18} style={{ color: 'var(--primary)' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Tài khoản của bạn</div>
            </div>
            {linkedMember ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{linkedMember.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {linkedMember.role === 'father' ? 'Bố' : linkedMember.role === 'mother' ? 'Mẹ' : linkedMember.role === 'grandparent' ? 'Ông/Bà' : 'Con cái'} • {linkedMember.age} tuổi
                  </div>
                </div>
                <button type="button" onClick={() => handleLinkUserToMember('')}
                  style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Đổi
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Chọn thành viên tương ứng với tài khoản đăng nhập của bạn:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {family.members.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleLinkUserToMember(m.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left'
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{m.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {m.role === 'father' ? 'Bố' : m.role === 'mother' ? 'Mẹ' : m.role === 'grandparent' ? 'Ông/Bà' : 'Con cái'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <h3 style={{ fontSize: '16px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Users size={18} style={{ color: 'var(--primary)' }} />
        Thành viên gia đình ({family.members.length})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {family.members.map(m => {
          const isEditing = editingMemberId === m.id;
          const isDefaultSpender = !!m.isDefaultSpender;
          const isLinked = family.linkedMemberIds?.[user.uid] === m.id;
          const roleLabel = m.role === 'father' ? 'Bố' : m.role === 'mother' ? 'Mẹ' : m.role === 'grandparent' ? 'Ông/Bà' : 'Con cái';

          return (
            <div key={m.id} className="card" style={{
              margin: 0, padding: '14px 16px',
              borderColor: isDefaultSpender ? 'var(--secondary)' : 'var(--border)',
              borderWidth: isDefaultSpender ? '2px' : '1px'
            }}>
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>Sửa thông tin: {m.name}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                      <label>Họ tên</label>
                      <input type="text" className="form-control" value={editMemberName} onChange={e => setEditMemberName(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ flex: 1.5, marginBottom: 0 }}>
                      <label>Vai trò</label>
                      <select className="form-control" value={editMemberRole} onChange={(e: any) => setEditMemberRole(e.target.value)}>
                        <option value="child">Con cái</option>
                        <option value="father">Bố</option>
                        <option value="mother">Mẹ</option>
                        <option value="grandparent">Ông/Bà</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600 }}>Tuổi</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="form-control"
                        value={editMemberAgeStr}
                        onChange={e => setEditMemberAgeStr(e.target.value.replace(/\D/g, ''))}
                        placeholder="1"
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600 }}>Giới tính</label>
                      <select className="form-control" value={editMemberGender} onChange={(e: any) => setEditMemberGender(e.target.value)}>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                      </select>
                    </div>
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600 }}>Vận động</label>
                      <select className="form-control" value={editMemberActivity} onChange={(e: any) => setEditMemberActivity(e.target.value)}>
                        <option value="sedentary">Ít</option>
                        <option value="lightly_active">Nhẹ</option>
                        <option value="moderately_active">Vừa</option>
                        <option value="very_active">Nhiều</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                    <button type="button" onClick={handleUpdateMember} className="btn btn-primary" style={{ flex: 1, height: '38px', fontSize: '13px' }}>
                      <Check size={14} /> Lưu
                    </button>
                    <button type="button" onClick={() => setEditingMemberId(null)} className="btn btn-secondary" style={{ flex: 1, height: '38px', fontSize: '13px' }}>
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Info row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                      backgroundColor: isDefaultSpender ? '#81B29A22' : 'var(--bg-grey)',
                      color: isDefaultSpender ? 'var(--secondary)' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: 800
                    }}>
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '15px' }}>{m.name}</span>
                        {isLinked && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '8px', backgroundColor: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary-light)' }}>
                            Của bạn
                          </span>
                        )}
                        {isDefaultSpender && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '8px', backgroundColor: '#81B29A22', color: 'var(--secondary)', border: '1px solid #81B29A44' }}>
                            Chi mặc định
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {roleLabel} • {m.age} tuổi • {m.gender === 'male' ? 'Nam' : 'Nữ'} • ~{calculateMemberCalories(m)} Kcal
                      </div>
                    </div>
                  </div>

                  {/* Action bar */}
                  <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMemberId(m.id);
                        setEditMemberName(m.name);
                        setEditMemberRole(m.role);
                        setEditMemberAgeStr(String(m.age));
                        setEditMemberGender(m.gender);
                        setEditMemberActivity(m.activityLevel);
                      }}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: '3px', padding: '8px 4px',
                        background: 'none', border: 'none', borderRight: '1px solid var(--border)',
                        cursor: 'pointer', color: 'var(--primary)'
                      }}
                    >
                      <Pencil size={15} />
                      <span style={{ fontSize: '10px', fontWeight: 600 }}>Sửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => !isDefaultSpender && handleSetDefaultSpender(m.id)}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: '3px', padding: '8px 4px',
                        background: isDefaultSpender ? '#81B29A15' : 'none',
                        border: 'none', borderRight: '1px solid var(--border)',
                        cursor: isDefaultSpender ? 'default' : 'pointer',
                        color: isDefaultSpender ? 'var(--secondary)' : 'var(--text-secondary)'
                      }}
                    >
                      <Check size={15} />
                      <span style={{ fontSize: '10px', fontWeight: 600 }}>{isDefaultSpender ? 'Chi mặc định' : 'Đặt mặc định'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteMember(m.id)}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: '3px', padding: '8px 4px',
                        background: 'none', border: 'none',
                        cursor: 'pointer', color: 'var(--danger)'
                      }}
                    >
                      <Trash2 size={15} />
                      <span style={{ fontSize: '10px', fontWeight: 600 }}>Xóa</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Form thêm thành viên */}
      <div className="card" style={{ backgroundColor: 'var(--secondary-bg)', borderStyle: 'dashed' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Thêm thành viên mới</h4>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Họ tên thành viên"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            style={{ flex: 2 }}
          />
          <select
            className="form-control"
            value={memberRole}
            onChange={(e: any) => setMemberRole(e.target.value)}
            style={{ flex: 1.5, padding: '0 8px' }}
          >
            <option value="child">Con cái</option>
            <option value="father">Bố</option>
            <option value="mother">Mẹ</option>
            <option value="grandparent">Ông/Bà</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600 }}>Tuổi</label>
            <input
              type="text"
              inputMode="numeric"
              className="form-control"
              value={memberAgeStr}
              onChange={(e) => setMemberAgeStr(e.target.value.replace(/\D/g, ''))}
              placeholder="6"
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600 }}>Giới tính</label>
            <select className="form-control" value={memberGender} onChange={(e: any) => setMemberGender(e.target.value)}>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </div>
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600 }}>Vận động</label>
            <select className="form-control" value={memberActivity} onChange={(e: any) => setMemberActivity(e.target.value)}>
              <option value="sedentary">Ít vận động</option>
              <option value="lightly_active">Nhẹ nhàng</option>
              <option value="moderately_active">Vừa phải</option>
              <option value="very_active">Nhiều</option>
            </select>
          </div>
        </div>
        <button type="button" onClick={handleAddMember} className="btn btn-secondary" style={{ width: '100%', height: '42px' }}>
          <Plus size={16} /> Thêm thành viên
        </button>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--primary-bg)', borderColor: 'var(--primary-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--primary)' }}><Flame size={24} fill="currentColor" /></div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mục tiêu dinh dưỡng gia đình</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{family.nutritionTargets.calories} Kcal / ngày</div>
          </div>
        </div>
      </div>
    </>
  );
}
