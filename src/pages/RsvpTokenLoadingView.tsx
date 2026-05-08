interface RsvpTokenLoadingViewProps {
  onEnterCodeInstead: () => void;
}

export function RsvpTokenLoadingView({ onEnterCodeInstead }: RsvpTokenLoadingViewProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Loading your invitation…</p>
        <button
          type="button"
          onClick={onEnterCodeInstead}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Enter invitation code instead
        </button>
      </div>
    </div>
  );
}
