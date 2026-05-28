export const getGuestPhotoBucketShareLink = ({
  isActive,
  uploadLink,
}: {
  isActive: boolean;
  uploadLink: string;
}): string => {
  if (!isActive) return '';
  return uploadLink.trim();
};
