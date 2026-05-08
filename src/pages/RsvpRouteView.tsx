type RsvpRouteViewProps = {
  tokenAutoLoading: boolean;
  tokenAutoLoadingView: React.ReactNode;
  liveContent: React.ReactNode;
};

export function RsvpRouteView({
  tokenAutoLoading,
  tokenAutoLoadingView,
  liveContent,
}: RsvpRouteViewProps) {
  if (tokenAutoLoading) return <>{tokenAutoLoadingView}</>;
  return <>{liveContent}</>;
}
