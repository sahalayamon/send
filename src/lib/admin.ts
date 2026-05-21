import { supabase } from './supabase';
import type { ShareRecord } from './shares';
import { STORAGE_BUCKET } from './shares';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AdminStats {
  total: number;
  active: number;
  expired: number;
}

// ── Settings ───────────────────────────────────────────────────────────────

export async function getExpiryHours(): Promise<number> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'expiry_hours')
    .single();
  return data ? parseInt(data.value, 10) : 1;
}

export async function setExpiryHours(hours: number): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .update({ value: String(hours) })
    .eq('key', 'expiry_hours');
  if (error) throw new Error(`Failed to update expiry setting: ${error.message}`);
  // Bust the cache in shares.ts
  expiryCache = null;
}

// Cache for shares.ts consumption — module-level
export let expiryCache: number | null = null;

export async function getCachedExpiryHours(): Promise<number> {
  if (expiryCache !== null) return expiryCache;
  expiryCache = await getExpiryHours();
  return expiryCache;
}

// ── Admin Password ─────────────────────────────────────────────────────────

export async function getAdminPassword(): Promise<string> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'admin_password')
    .single();
  return data?.value ?? '123123';
}

export async function setAdminPassword(newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 4) {
    throw new Error('Password must be at least 4 characters.');
  }
  const { error } = await supabase
    .from('settings')
    .update({ value: newPassword })
    .eq('key', 'admin_password');
  if (error) throw new Error(`Failed to update password: ${error.message}`);
}

// ── Admin Queries ──────────────────────────────────────────────────────────

export async function fetchAllShares(): Promise<ShareRecord[]> {
  const { data, error } = await supabase
    .from('shares')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to fetch shares: ${error.message}`);
  return (data ?? []) as ShareRecord[];
}

export async function deleteShare(share: ShareRecord): Promise<void> {
  // Delete storage file first if it's a file share
  if (share.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([share.storage_path]);
    if (storageError) {
      console.warn('Storage delete warning:', storageError.message);
    }
  }

  const { error } = await supabase
    .from('shares')
    .delete()
    .eq('id', share.id);
  if (error) throw new Error(`Failed to delete share: ${error.message}`);
}

export async function purgeExpiredShares(): Promise<number> {
  // First fetch expired shares to get storage paths
  const { data: expired, error: fetchError } = await supabase
    .from('shares')
    .select('id, storage_path')
    .lt('expires_at', new Date().toISOString());

  if (fetchError) throw new Error(`Failed to fetch expired: ${fetchError.message}`);
  if (!expired || expired.length === 0) return 0;

  // Delete storage files in bulk
  const storagePaths = expired
    .map((s: { storage_path: string | null }) => s.storage_path)
    .filter(Boolean) as string[];

  if (storagePaths.length > 0) {
    await supabase.storage.from(STORAGE_BUCKET).remove(storagePaths);
  }

  // Delete DB rows
  const ids = expired.map((s: { id: string }) => s.id);
  const { error: deleteError } = await supabase
    .from('shares')
    .delete()
    .in('id', ids);

  if (deleteError) throw new Error(`Failed to purge expired: ${deleteError.message}`);
  return expired.length;
}

export function getAdminStats(shares: ShareRecord[]): AdminStats {
  const now = new Date();
  const expired = shares.filter(s => new Date(s.expires_at) <= now).length;
  return {
    total: shares.length,
    active: shares.length - expired,
    expired,
  };
}
