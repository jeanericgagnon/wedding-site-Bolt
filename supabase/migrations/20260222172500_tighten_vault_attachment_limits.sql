/*
  # Tighten vault attachment limits for cost control

  - Reduce bucket per-file cap to 40MB
  - Keep MIME allowlist for image/video/audio
*/

UPDATE storage.buckets
SET
  file_size_limit = 41943040, -- 40 MB
  allowed_mime_types = ARRAY[
    'image/jpeg','image/jpg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/quicktime',
    'audio/mpeg','audio/mp3','audio/wav','audio/webm','audio/ogg','audio/mp4','audio/aac','audio/x-m4a'
  ]
WHERE id = 'vault-attachments';
