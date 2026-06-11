import { useState } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { Eye, EyeOff, Lock, AlertCircle, Check } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useToast } from '../../../components/Toast';

export function ChangePasswordSection({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  const showToast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  if (!user) return null;

  const handleChangePassword = async () => {
    if (!user.email) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu mới không khớp');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setIsChangingPassword(true);
    setPasswordError('');
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      showToast('Đã đổi mật khẩu thành công!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onBack();
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setPasswordError('Mật khẩu hiện tại không đúng');
      } else {
        setPasswordError('Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const passwordStrength = newPassword.length < 6 ? 1 : newPassword.length < 8 ? 2 : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 4 : 3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card" style={{ backgroundColor: '#F3E5FF', borderColor: '#CE93D8', borderWidth: '1.5px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Lock size={16} style={{ color: '#8338EC', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', color: '#4A148C', lineHeight: 1.5 }}>
            Để bảo vệ tài khoản, vui lòng nhập mật khẩu hiện tại trước khi đặt mật khẩu mới.
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Mật khẩu hiện tại</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showCurrentPw ? 'text' : 'password'}
              className="form-control"
              placeholder="Nhập mật khẩu hiện tại"
              value={currentPassword}
              onChange={e => { setCurrentPassword(e.target.value); setPasswordError(''); }}
              style={{ paddingRight: '44px' }}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPw(v => !v)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
            >
              {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--border)' }} />

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Mật khẩu mới</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNewPw ? 'text' : 'password'}
              className="form-control"
              placeholder="Tối thiểu 6 ký tự"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setPasswordError(''); }}
              style={{ paddingRight: '44px' }}
            />
            <button
              type="button"
              onClick={() => setShowNewPw(v => !v)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
            >
              {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {newPassword.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', backgroundColor: i <= passwordStrength ? (passwordStrength <= 1 ? 'var(--danger)' : passwordStrength === 2 ? '#F77F00' : passwordStrength === 3 ? '#FFD166' : '#06D6A0') : 'var(--border)' }} />
                ))}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {newPassword.length < 6 ? 'Yếu — cần ít nhất 6 ký tự' : newPassword.length < 8 ? 'Trung bình' : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 'Rất mạnh' : 'Mạnh'}
              </div>
            </div>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Xác nhận mật khẩu mới</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirmPw ? 'text' : 'password'}
              className="form-control"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); }}
              style={{
                paddingRight: '44px',
                borderColor: confirmPassword && newPassword && confirmPassword !== newPassword ? 'var(--danger)' : confirmPassword && newPassword && confirmPassword === newPassword ? '#06D6A0' : 'var(--border)'
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPw(v => !v)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
            >
              {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirmPassword && newPassword && confirmPassword === newPassword && (
            <div style={{ fontSize: '11px', color: '#06D6A0', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={12} /> Mật khẩu khớp
            </div>
          )}
        </div>

        {passwordError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#FFEBEE', border: '1px solid #FFCDD2' }}>
            <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 600 }}>{passwordError}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleChangePassword}
        disabled={isChangingPassword}
        className="btn btn-primary"
        style={{ width: '100%', height: '50px', fontSize: '15px', fontWeight: 700, backgroundColor: '#8338EC', borderColor: '#8338EC', opacity: isChangingPassword ? 0.6 : 1 }}
      >
        {isChangingPassword ? 'Đang xử lý...' : 'Đổi mật khẩu'}
      </button>
    </div>
  );
}
