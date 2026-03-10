import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: '24px',
          borderRadius: 14,
          background: 'var(--color-raised)',
          border: '1px solid rgba(248,113,113,0.15)',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: '#f87171',
            marginBottom: 6,
          }}>Something went wrong</div>
          <div style={{
            fontFamily: "'SF Mono', monospace",
            fontSize: 11,
            color: 'var(--color-text-3)',
            marginBottom: 12,
          }}>
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              fontFamily: "'SF Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--color-base)',
              background: '#D4FF00',
              border: 'none',
              padding: '8px 20px',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
