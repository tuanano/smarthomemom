import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { auth } from '../../firebase';
import { Heart, Lock, Mail, Sparkles } from 'lucide-react';

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError('Email hoặc mật khẩu không chính xác.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email này đã được đăng ký sử dụng.');
      } else {
        setError('Đã xảy ra lỗi, vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = async () => {
    setError('');
    setLoading(true);
    try {
      // Sign in anonymously for easy demo/POC testing without credentials
      await signInAnonymously(auth);
    } catch (err) {
      console.error(err);
      setError('Không thể kích hoạt chế độ dùng thử. Vui lòng kiểm tra kết nối mạng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scrollable" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          backgroundColor: 'var(--primary-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'var(--primary)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <Heart size={40} fill="currentColor" />
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
        onClick={handleDemoMode}
        className="btn btn-secondary"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          border: '1px dashed var(--primary)',
          backgroundColor: 'var(--primary-bg)',
          color: 'var(--primary)',
          fontWeight: 600
        }}
        disabled={loading}
      >
        <Sparkles size={18} />
        {loading ? 'Đang kích hoạt...' : 'Trải nghiệm Demo nhanh (PWA)'}
      </button>

      <p style={{ textAlign: 'center', fontSize: '11px', marginTop: '24px', color: 'var(--text-secondary)' }}>
        * Chế độ demo cho phép bạn trải nghiệm đầy đủ các tính năng lập kế hoạch thực đơn AI và quản lý ví ngay lập tức.
      </p>
    </div>
  );
}
