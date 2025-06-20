import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('ErrorBoundary caught an error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary componentDidCatch:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Log to main process as well
    if (window.electronAPI) {
      console.log('Sending error to main process...');
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #ff6b6b',
          borderRadius: '8px',
          backgroundColor: '#ffe0e0',
          fontFamily: 'monospace'
        }}>
          <h2 style={{ color: '#d63031', marginTop: 0 }}>
            🚨 Application Error
          </h2>
          <details style={{ marginBottom: '10px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Error Details
            </summary>
            <pre style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '10px', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {this.state.error?.toString()}
            </pre>
          </details>
          
          {this.state.errorInfo && (
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Component Stack
              </summary>
              <pre style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#0984e3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
