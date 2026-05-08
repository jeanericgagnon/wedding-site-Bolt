import { RsvpLiveContentView, type RsvpLiveContentViewProps } from './RsvpLiveContentView';
import { RsvpRouteView } from './RsvpRouteView';
import { RsvpTokenLoadingView } from './RsvpTokenLoadingView';

interface RsvpPageRouteViewProps {
  liveContentProps: RsvpLiveContentViewProps;
  onEnterCodeInstead: () => void;
  tokenAutoLoading: boolean;
}

export function RsvpPageRouteView({
  liveContentProps,
  onEnterCodeInstead,
  tokenAutoLoading,
}: RsvpPageRouteViewProps) {
  return (
    <RsvpRouteView
      tokenAutoLoading={tokenAutoLoading}
      tokenAutoLoadingView={(
        <RsvpTokenLoadingView onEnterCodeInstead={onEnterCodeInstead} />
      )}
      liveContent={<RsvpLiveContentView {...liveContentProps} />}
    />
  );
}
