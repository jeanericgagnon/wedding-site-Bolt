export const buildGuestPhotoShareMessage = (bucketName: string, uploadLink: string) =>
  `Please upload your ${bucketName} photos here: ${uploadLink}`;

export const buildGuestPhotoShareBulkMessagingPath = (messages: string[]): string | null => {
  const trimmedMessages = messages.map((message) => message.trim()).filter(Boolean);
  if (trimmedMessages.length === 0) return null;

  const subject = encodeURIComponent('Photo sharing links');
  const body = encodeURIComponent(trimmedMessages.join('\n\n'));
  return `/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`;
};

export const buildGuestPhotoBucketMessagingPath = ({
  bucketName,
  uploadLink,
}: {
  bucketName: string;
  uploadLink: string;
}): string | null => {
  const trimmedUploadLink = uploadLink.trim();
  if (!trimmedUploadLink) return null;

  const subject = encodeURIComponent(`${bucketName} photo sharing`);
  const body = encodeURIComponent(buildGuestPhotoShareMessage(bucketName, trimmedUploadLink));
  return `/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`;
};
