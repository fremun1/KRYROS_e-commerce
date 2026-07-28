import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  pageName?: string;
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
    console.error(
      `[ErrorBoundary] ${this.props.pageName || 'Page'} crashed:`,
      error,
      info.componentStack
    );

    // Auto-recover from chunk loading errors at the component level
    if (
      error.message.includes("Loading chunk") ||
      error.message.includes("Loading CSS chunk") ||
      error.message.includes("Failed to fetch dynamically imported module")
    ) {
      const lastReload = sessionStorage.getItem("kryros_last_chunk_reload");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem("kryros_last_chunk_reload", now.toString());
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
          }}>⚠️</div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
            color: 'var(--kryros-primary-text)',
          }}>
            Something went wrong
          </h2>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--kryros-secondary-text)',
            marginBottom: '1.5rem',
            maxWidth: '400px',
          }}>
            {this.state.error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '0.625rem 1.5rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: 'var(--kryros-primary, #0d9488)',
              color: 'var(--kryros-white-text)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
