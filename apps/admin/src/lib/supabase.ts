'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function sb(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce' } });
  }
  return client;
}

export type Role = 'super_admin' | 'content_editor' | 'content_reviewer' | 'support_operator';

export function can(role: Role | null, ...allowed: Role[]): boolean {
  return !!role && (role === 'super_admin' || allowed.includes(role));
}

export const GUIDE_STATUSES = ['draft', 'in_review', 'approved', 'published', 'needs_update', 'archived'] as const;
export type GuideStatus = (typeof GUIDE_STATUSES)[number];
