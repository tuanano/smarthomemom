import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../firebase';
import { Lock, Mail } from 'lucide-react';
import AppLogo from '../../components/AppLogo';
import { useAuthStore } from '../../stores/authStore';


export default function AuthPage() {
  const { redirectError, setLoading: setAppLoading } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Show app-level loading screen immediately to avoid flash on success
    setAppLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // Success: onAuthStateChanged will call setAppLoading(false)
    } catch (err: any) {
      setAppLoading(false); // Reset on failure so AuthPage reappears with error
      setLoading(false);
      if (err.code === 'auth/invalid-credential') {
        setError('Email hoặc mật khẩu không chính xác.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email này đã được đăng ký sử dụng.');
      } else {
        setError('Đã xảy ra lỗi, vui lòng thử lại sau.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    // Show app-level loading screen immediately — eliminates the AuthPage→Dashboard flash
    setAppLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Success: onAuthStateChanged will call setAppLoading(false)
    } catch (err: any) {
      setAppLoading(false); // Reset on failure so AuthPage reappears with error
      setLoading(false);
      const ignoredCodes = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
      if (!ignoredCodes.includes(err?.code)) {
        setError(`Đăng nhập Google thất bại: ${err?.code ?? err?.message ?? 'unknown'}`);
      }
    }
  };

  return (
    <div className="scrollable" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ margin: '0 auto 16px', width: '80px', borderRadius: '20px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <AppLogo size={80} />
        </div>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '26px' }}>SmartHomeMom</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Quản lý chi tiêu & thực đơn dinh dưỡng gia đình</p>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '20px', textAlign: 'center', fontSize: '20px' }}>
          {isRegister ? 'Đăng ký tài khoản mới' : 'Đăng nhập vào gia đình'}
        </h2>

        {error && (
          <div style={{
            backgroundColor: '#FFEBEE',
            color: 'var(--danger)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '16px',
            border: '1px solid #FFCDD2'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Địa chỉ Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-secondary)' }} />
              <input
                type="email"
                className="form-control"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-secondary)' }} />
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : isRegister ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký ngay'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
        <span style={{ padding: '0 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>hoặc</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '14px 20px',
          border: '1.5px solid #e0e0e0',
          borderRadius: '14px',
          backgroundColor: '#fff',
          color: '#3c4043',
          fontWeight: 600,
          fontSize: '15px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.2s, border-color 0.2s',
          letterSpacing: '0.01em',
          opacity: loading ? 0.6 : 1,
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.14)'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#bdbdbd'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e0e0e0'; }}
        disabled={loading}
      >
        {/* Google icon with white circle background */}
        <span style={{
          width: '24px', height: '24px', borderRadius: '50%',
          backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
        </span>
        <span>{loading ? 'Đang xử lý...' : 'Tiếp tục với Google'}</span>
      </button>

      {/* Debug panel — shows Firebase auth errors directly on screen for mobile debugging */}
      {(redirectError || error) && !error && redirectError && (
        <div style={{
          marginTop: '16px', padding: '12px', borderRadius: '10px',
          backgroundColor: '#FFF3E0', border: '1px solid #FFB74D',
          fontSize: '12px', color: '#E65100', wordBreak: 'break-all', lineHeight: 1.5
        }}>
          <strong>Debug:</strong> {redirectError}
          {redirectError.includes('unauthorized-domain') && (
            <div style={{ marginTop: '6px', color: '#BF360C' }}>
              Thêm domain GitHub Pages vào Firebase Console → Authentication → Authorized domains
            </div>
          )}
        </div>
      )}
    </div>
  );
}
