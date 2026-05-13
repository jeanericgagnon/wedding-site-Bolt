import { RefreshCw, WifiOff } from 'lucide-react';

type HubConfigStatus = 'loading' | 'ready' | 'fallback' | 'offline';

interface EventHubConfigStatusCardProps {
  onRetry: () => void;
  status: HubConfigStatus;
}

export function EventHubConfigStatusCard({ onRetry, status }: EventHubConfigStatusCardProps) {
  if (status === 'ready') return null;

  return (
    <div className="mt-5 rounded-lg border border-[#eadfd2] bg-[#fffdf9] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          {status === 'offline' ? (
            <WifiOff className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#8b6f53]" />
          ) : (
            <RefreshCw className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#8b6f53]" />
          )}
          <div>
            <p className="text-sm font-semibold text-[#2f261d]">
              {status === 'loading' ? 'Loading the latest wedding details' : 'Showing the saved guest hub'}
            </p>
            <p className="mt-1 text-sm leading-6 text-[#6f5843]">
              {status === 'loading'
                ? 'The hub will stay usable while the newest details load.'
                : 'Travel, RSVP, and photo links are still available. Try again when the connection feels steadier.'}
            </p>
          </div>
        </div>
        {status !== 'loading' && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d8c8b6] px-3 py-2 text-xs font-semibold text-[#69513f] transition-colors hover:bg-[#f3eadf]"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
