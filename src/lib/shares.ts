import { supabase } from './supabase';
import { getCachedExpiryHours } from './admin';

export const STORAGE_BUCKET = 'tempsend-files';
export const EXPIRY_HOURS = 1;
export const MAX_FILE_SIZE_MB = 25;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Characters used for the 6-char code (a-z + 0-9, case-insensitive)
const CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 6;

// ── Types ──────────────────────────────────────────────────────────────────

export type ShareType = 'text' | 'file';

export interface ShareRecord {
  id: string;
  code: string;
  type: ShareType;
  content: string | null;
  storage_path: string | null;
  filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  expires_at: string;
}

// ── Code helpers ───────────────────────────────────────────────────────────

/** Generate a random 6-character alphanumeric code (lowercase). */
function generateCode(): string {
  let code = '';
  const array = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(array);
  for (const byte of array) {
    code += CODE_CHARS[byte % CODE_CHARS.length];
  }
  return code;
}

/** Validate that a string is a valid 6-char share code. */
export function isValidCode(code: string): boolean {
  return /^[a-z0-9]{6}$/i.test(code);
}

// ── Expiry / countdown helpers ─────────────────────────────────────────────

export function isExpired(record: ShareRecord): boolean {
  return new Date(record.expires_at) <= new Date();
}

export function secondsRemaining(record: ShareRecord): number {
  return Math.max(0, Math.floor((new Date(record.expires_at).getTime() - Date.now()) / 1000));
}

export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Create Shares ──────────────────────────────────────────────────────────

/** Try inserting with a unique code, retrying up to 5 times on collision. */
async function insertWithCode(payload: Record<string, unknown>): Promise<ShareRecord> {
  const expiryHours = await getCachedExpiryHours();
  const expires_at = new Date(Date.now() + expiryHours * 3600 * 1000).toISOString();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await supabase
      .from('shares')
      .insert({ ...payload, code, expires_at })
      .select('*')
      .single();

    if (!error) return data as ShareRecord;
    if (error.code === '23505') continue;
    throw new Error(error.message);
  }
  throw new Error('Failed to generate a unique share code. Please try again.');
}

/** Upload a text snippet to Supabase. Returns the full share record. */
export async function createTextShare(text: string): Promise<ShareRecord> {
  return insertWithCode({ type: 'text', content: text });
}

/** Upload any file to Supabase Storage and create a share record. */
export async function createFileShare(file: File): Promise<ShareRecord> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`);
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
  const storagePath = `${crypto.randomUUID()}${ext ? `.${ext}` : ''}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) throw new Error(`Failed to upload file: ${uploadError.message}`);

  try {
    return await insertWithCode({
      type: 'file',
      storage_path: storagePath,
      filename: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
    });
  } catch (err) {
    // Clean up orphaned file if DB insert fails
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw err;
  }
}

// ── Fetch Share ────────────────────────────────────────────────────────────

/** Fetch a share by its 6-char code. Returns null if not found. */
export async function getShareByCode(code: string): Promise<ShareRecord | null> {
  const { data, error } = await supabase
    .from('shares')
    .select('*')
    .eq('code', code.toLowerCase())
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch share: ${error.message}`);
  return data as ShareRecord | null;
}

/** Get a just-in-time signed download URL (valid 60 seconds). */
export async function getFileDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60);

  if (error) throw new Error(`Failed to get download URL: ${error.message}`);
  return data.signedUrl;
}
