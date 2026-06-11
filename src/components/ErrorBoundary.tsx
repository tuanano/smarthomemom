import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100%', padding: '40px 24px', textAlign: 'center', gap: '16px'
        }}>
          <div style={{ fontSize: '40px' }}>😔</div>
          <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)' }}>
            Đã xảy ra lỗi
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '300px', lineHeight: 1.6 }}>
            Tính năng này gặp sự cố. Vui lòng tải lại trang hoặc liên hệ hỗ trợ nếu lỗi tiếp tục xảy ra.
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-primary"
            style={{ marginTop: '8px' }}
          >
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
