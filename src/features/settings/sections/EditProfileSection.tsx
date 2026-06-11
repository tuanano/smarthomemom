import { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { useAuthStore } from '../../../stores/authStore';
import { useToast } from '../../../components/Toast';

export function EditProfileSection({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  const showToast = useToast();

  const [editDisplayName, setEditDisplayName] = useState(user?.displayName ?? '');
  const [displayNameOverride, setDisplayNameOverride] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  if (!user) return null;

  const handleUpdateProfile = async () => {
    if (!editDisplayName.trim()) return;
    setIsUpdatingProfile(true);
    try {
      await updateProfile(user, { displayName: editDisplayName.trim() });
      setDisplayNameOverride(editDisplayName.trim());
      showToast('Đã cập nhật tên hiển thị!', 'success');
      onBack();
    } catch {
      showToast('Lỗi khi cập nhật thông tin', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0 8px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '24px',
          background: 'linear-gradient(135deg, var(--primary) 0%, #F15BB5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px', fontWeight: 800, color: 'white',
          boxShadow: '0 4px 16px rgba(255,140,105,0.4)', marginBottom: '12px'
        }}>
          {(editDisplayName || displayNameOverride || user.displayName || user.email || 'U').charAt(0).toUpperCase()}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ảnh đại diện tự động từ ký tự đầu tên</div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Tên hiển thị</label>
          <input
            type="text"
            className="form-control"
            placeholder="Nhập tên hiển thị của bạn"
            value={editDisplayName}
            onChange={e => setEditDisplayName(e.target.value)}
            autoFocus
          />
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '5px' }}>
            Tên này sẽ hiển thị trong ứng dụng thay cho địa chỉ email
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Email đăng nhập</label>
          <div style={{
            padding: '12px 14px', borderRadius: 'var(--border-radius-sm)',
            backgroundColor: 'var(--bg-grey)', border: '1px solid var(--border)',
            fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span>{user.email}</span>
            <span style={{
              fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px',
              backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)'
            }}>Không thể thay đổi</span>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>ID tài khoản</label>
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--border-radius-sm)',
            backgroundColor: 'var(--bg-grey)', border: '1px solid var(--border)',
            fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace'
          }}>
            {user.uid}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleUpdateProfile}
        disabled={isUpdatingProfile || !editDisplayName.trim()}
        className="btn btn-primary"
        style={{ width: '100%', height: '50px', fontSize: '15px', fontWeight: 700, opacity: (!editDisplayName.trim() || isUpdatingProfile) ? 0.6 : 1 }}
      >
        {isUpdatingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </div>
  );
}
