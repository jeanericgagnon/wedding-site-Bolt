import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logClientError } from '../lib/errorLogger';
import { clearChunkReloadRetryFlag, hasFreshChunkReloadRetryFlag, writeChunkReloadRetryFlag } from './chunkReloadStorage';

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
    clearChunkReloadRetryFlag();
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const runtimeMetadata = {
      componentStack: info.componentStack?.slice(0, 2000),
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      search: typeof window !== 'undefined' ? window.location.search : undefined,
      hash: typeof window !== 'undefined' ? window.location.hash : undefined,
      lastSectionError:
        typeof window !== 'undefined'
          ? (window as unknown as Record<string, unknown>).__dayof_last_section_error
          : undefined,
    };

    logClientError({
      source: 'react-error-boundary',
      severity: 'error',
      message: error.message || 'Unknown React runtime error',
      stack: error.stack,
      metadata: runtimeMetadata,
    });

    if (typeof window !== 'undefined') {
      const msg = (error?.message || '').toLowerCase();
      const isChunkLoadIssue =
        msg.includes('failed to fetch dynamically imported module') ||
        msg.includes('chunkloaderror') ||
        msg.includes('loading chunk') ||
        msg.includes('importing a module script failed');

      if (isChunkLoadIssue) {
        const alreadyRetried = hasFreshChunkReloadRetryFlag();
        if (!alreadyRetried) {
          writeChunkReloadRetryFlag();
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
        <div className="flex min-h-screen items-start justify-center bg-surface-subtle p-4 pt-20">
          <div className="w-full max-w-md rounded-xl border border-border-subtle bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <AlertTriangle className="h-4 w-4 text-text-tertiary" />
              <span>Please refresh to continue.</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-xl hover:bg-gray-800 transition-colors"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
              <button
                onClick={this.handleReset}
                className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-50 transition-colors"
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
