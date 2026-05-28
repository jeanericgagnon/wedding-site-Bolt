export const buildGuestPhotoShareMessage = (bucketName: string, uploadLink: string) =>
  `Please upload your ${bucketName} photos here: ${uploadLink}`;

export const buildGuestPhotoBucketMessagingPath = ({
  bucketName,
  uploadLink,
}: {
  bucketName: string;
  uploadLink: string;
}): string | null => {
  const trimmedUploadLink = uploadLink.trim();
  if (!trimmedUploadLink) return null;

  const subject = encodeURIComponent(`${bucketName} photos upload`);
  const body = encodeURIComponent(buildGuestPhotoShareMessage(bucketName, trimmedUploadLink));
  return `/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`;
};
