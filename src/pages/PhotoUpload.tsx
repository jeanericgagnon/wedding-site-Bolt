import React, { useMemo, useState } from 'react';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

const mapUploadError = (code?: string, fallback?: string): string => {
  switch (code) {
    case 'INVALID_TOKEN':
      return 'This upload link is invalid. Ask the couple for a fresh link.';
    case 'ALBUM_INACTIVE':
      return 'This album is currently paused.';
    case 'ALBUM_NOT_OPEN':
      return 'This album is not open for uploads yet.';
    case 'ALBUM_CLOSED':
      return 'This album is closed for uploads.';
    case 'FILE_TOO_LARGE':
    case 'TOTAL_TOO_LARGE':
    case 'TOO_MANY_FILES':
      return fallback || 'Your upload exceeds the allowed limits.';
    case 'UNSUPPORTED_FILE_TYPE':
      return 'Unsupported file type. Please upload photos or videos only.';
    default:
      return fallback || 'Upload failed. Please try again.';
  }
};

export const PhotoUpload: React.FC = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialToken = params.get('t')?.trim() ?? '';

  const [token, setToken] = useState(initialToken);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadedNames, setUploadedNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setUploadedNames([]);
    setError(null);

    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Supabase is not configured.');
      return;
    }

    if (!token.trim()) {
      setError('Upload token is required.');
      return;
    }

    if (files.length === 0) {
      setError('Please choose at least one file.');
      return;
    }

    try {
      setIsUploading(true);
      const form = new FormData();
      form.append('token', token.trim());
      if (guestName.trim()) form.append('guestName', guestName.trim());
      if (guestEmail.trim()) form.append('guestEmail', guestEmail.trim());
      if (note.trim()) form.append('note', note.trim());
      form.append('website', ''); // honeypot field for basic bot filtering
      files.forEach((file) => form.append('files', file));

      const res = await fetch(`${supabaseUrl}/functions/v1/photo-upload`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: form,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(mapUploadError(data?.code, data?.error));
      }

      const uploaded = Array.isArray(data.uploaded) ? data.uploaded : [];
      setUploadedNames(uploaded.map((u: { name?: string }) => u?.name).filter((v: unknown): v is string => typeof v === 'string'));
      setMessage(`Uploaded ${uploaded.length || files.length} file(s). Thank you!`);
      setFiles([]);
      setNote('');
      setGuestEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-50/40 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-sm border border-rose-100">
        <h1 className="text-2xl font-semibold text-gray-900">Share your photos</h1>
        <p className="mt-2 text-sm text-gray-600">Upload photos and videos directly to the couple&apos;s shared album.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Upload token</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Paste upload token"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Your name (optional)</label>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email (optional)</label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              placeholder="A few words for the couple"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Files</label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {files.length > 0 && <p className="mt-1 text-xs text-gray-500">{files.length} file(s) selected</p>}
            <p className="mt-1 text-xs text-gray-500">Up to 10 files per upload, 30MB per file, 120MB total.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}
          {uploadedNames.length > 0 && (
            <ul className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900 space-y-1">
              {uploadedNames.slice(0, 8).map((name) => <li key={name}>{name}</li>)}
              {uploadedNames.length > 8 && <li>+{uploadedNames.length - 8} more</li>}
            </ul>
          )}

          <button
            type="submit"
            disabled={isUploading}
            className="w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {isUploading ? 'Uploading…' : 'Upload files'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PhotoUpload;
