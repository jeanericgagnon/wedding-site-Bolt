import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logClientError } from '../lib/errorLogger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidMount(): void {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('dayof_chunk_reload_once_v1');
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logClientError({
      source: 'react-error-boundary',
      severity: 'error',
      message: error.message || 'Unknown React runtime error',
      stack: error.stack,
      metadata: { componentStack: info.componentStack?.slice(0, 2000) },
    });

    if (typeof window !== 'undefined') {
      const msg = (error?.message || '').toLowerCase();
      const isChunkLoadIssue =
        msg.includes('failed to fetch dynamically imported module') ||
        msg.includes('chunkloaderror') ||
        msg.includes('loading chunk') ||
        msg.includes('importing a module script failed');

      if (isChunkLoadIssue) {
        const key = 'dayof_chunk_reload_once_v1';
        const alreadyRetried = window.sessionStorage.getItem(key) === '1';
        if (!alreadyRetried) {
          window.sessionStorage.setItem(key, '1');
          window.location.reload();
          return;
        }
      }

      if ((window as unknown as Record<string, unknown>)['Sentry']) {
        (window as unknown as Record<string, { captureException: (e: Error, ctx: unknown) => void }>)['Sentry'].captureException(error, { extra: info });
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Quick refresh needed</h1>
            <p className="text-gray-500 text-sm mb-6">
              The app just updated. Please reload to continue.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                <RefreshCw size={14} />
                Reload page
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
