// Shared HTTP helpers for Edge Functions.
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_WEB_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  // Native apps send no Origin; web pages must be on the allow-list.
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** Errors return a stable code and a human message; never internal details. */
export function fail(req: Request, status: number, code: string, message: string): Response {
  return json(req, { error: { code, message } }, status);
}

/** Logs without user content: only codes, counts and ids. */
export function logEvent(event: string, fields: Record<string, string | number | boolean | null> = {}): void {
  console.log(JSON.stringify({ event, ...fields, at: new Date().toISOString() }));
}
