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
        <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 pt-20">
          <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Please refresh to continue.</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 transition-colors"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
              <button
                onClick={this.handleReset}
                className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
