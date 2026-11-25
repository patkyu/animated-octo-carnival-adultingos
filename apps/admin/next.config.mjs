/**
 * Static export: the portal is a client-side app; all authorization is
 * enforced in Postgres (RLS + role-checked functions). Security headers
 * (CSP, X-Frame-Options, etc.) are set on the static host — see
 * docs/deployment/admin-portal.md.
 */
export default {
  output: 'export',
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
};
