export type MessagePhotoBucket = {
  id: string;
  is_active: boolean;
};

export const getMessagePhotoLinkState = ({
  buckets,
  storedLinks,
  fallbackLink,
}: {
  buckets: MessagePhotoBucket[] | null;
  storedLinks: Record<string, string>;
  fallbackLink: string;
}) => {
  const trimmedFallbackLink = fallbackLink.trim();
  const allStoredLinks = Object.values(storedLinks).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  if (!buckets) {
    return {
      knownPhotoLinksCount: allStoredLinks.length,
      preferredPhotoLink: allStoredLinks[0] ?? trimmedFallbackLink,
    };
  }

  const activeStoredLinks = buckets.reduce<string[]>((links, bucket) => {
    if (!bucket.is_active) return links;
    const uploadLink = storedLinks[bucket.id]?.trim() ?? '';
    if (!uploadLink) return links;
    links.push(uploadLink);
    return links;
  }, []);

  return {
    knownPhotoLinksCount: activeStoredLinks.length,
    preferredPhotoLink: activeStoredLinks[0] ?? trimmedFallbackLink,
  };
};

export function buildPhotoRequestTemplateBody(photoLink: string): string {
  const trimmedPhotoLink = photoLink.trim();
  if (!trimmedPhotoLink) {
    return 'We are getting photo sharing ready for this event and will send the guest link soon.';
  }

  return `We made a place where everyone can share their favorite moments from the event. Open photo sharing here: ${trimmedPhotoLink}`;
}
