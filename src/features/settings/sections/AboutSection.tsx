import { ChevronRight } from 'lucide-react';
import AppLogo from '../../../components/AppLogo';

export function AboutSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 20px', textAlign: 'center' }}>
        <div style={{ marginBottom: '14px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(255,140,105,0.4)' }}>
          <AppLogo size={80} />
        </div>
        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>SmartHomeMom</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>Quản lý chi tiêu gia đình thông minh</div>
        <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 14px', borderRadius: '20px', backgroundColor: 'var(--bg-grey)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          Phiên bản 1.0.0
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {[
          { label: 'Phiên bản', value: '1.0.0' },
          { label: 'Nhà phát triển', value: 'https://github.com/tuanano' },
          { label: 'Liên hệ hỗ trợ', value: 'https://github.com/tuanano' }
        ].map((row, idx, arr) => (
          <div key={row.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '13px 16px',
            borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.label}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', maxWidth: '200px', textAlign: 'right' }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {['Chính sách quyền riêng tư', 'Điều khoản dịch vụ', 'Chính sách cookie'].map((item, idx, arr) => (
          <div key={item} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '13px 16px', cursor: 'default',
            borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{item}</span>
            <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '8px 0 4px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        © 2026 TuanLe<br />
        Được làm với ❤️ cho các gia đình Việt Nam
      </div>
    </div>
  );
}
