import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.119.2';

const url = () => Deno.env.get('SUPABASE_URL') ?? '';

/** Client acting as the calling user — RLS applies. */
export function userClient(authHeader: string): SupabaseClient {
  return createClient(url(), Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Service-role client — bypasses RLS. Use only for narrowly scoped writes. */
export function serviceClient(): SupabaseClient {
  return createClient(url(), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Verifies the bearer token with Supabase Auth and returns the user, or null. */
export async function requireUser(req: Request): Promise<{ user: User; authHeader: string } | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const { data, error } = await userClient(authHeader).auth.getUser(authHeader.slice(7));
  if (error || !data.user) return null;
  return { user: data.user, authHeader };
}
