'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { sb, type Role } from '@/lib/supabase';

interface Ctx {
  session: Session;
  role: Role | null;
}
const StaffContext = createContext<Ctx | null>(null);
export const useStaff = () => useContext(StaffContext)!;

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/guides', label: 'Guides' },
  { href: '/reports', label: 'Reports' },
  { href: '/flags', label: 'Feature flags' },
  { href: '/audit', label: 'Audit log' },
];

/** Sign-in gate. Staff without an admin role see nothing but an explanation. */
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let client;
    try {
      client = sb();
    } catch (e) {
      setError((e as Error).message);
      setSession(null);
      return;
    }
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    sb().from('admin_roles').select('role').eq('user_id', session.user.id).maybeSingle().then(({ data }) => setRole((data?.role as Role) ?? null));
  }, [session]);

  if (error) return <main className="center"><h1>Configuration needed</h1><p>{error}</p></main>;
  if (session === undefined) return <main className="center"><p>Loading…</p></main>;
  if (!session) return <Login />;

  return (
    <StaffContext.Provider value={{ session, role }}>
      <div className="layout">
        <nav className="side">
          <div className="brand">AdultingOS <span>Content</span></div>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path === n.href || (n.href !== '/' && path.startsWith(n.href)) ? 'active' : ''}>{n.label}</Link>
          ))}
          <div className="who">
            <div>{session.user.email}</div>
            <div className="muted">{role ? role.replace('_', ' ') : 'no staff role'}</div>
            <button className="link" onClick={() => sb().auth.signOut()}>Sign out</button>
          </div>
        </nav>
        <main className="content">
          {role ? children : (
            <div className="card">
              <h1>No staff access</h1>
              <p>Your account has no administrative role. A super administrator can grant one. Staff roles never grant access to users&apos; private records or conversations.</p>
            </div>
          )}
        </main>
      </div>
    </StaffContext.Provider>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <main className="center">
      <form className="card narrow" onSubmit={async (e) => {
        e.preventDefault();
        setMsg(null);
        const { error } = await sb().auth.signInWithPassword({ email, password });
        if (error) setMsg('Sign-in failed. Check your e-mail and password.');
      }}>
        <h1>AdultingOS content portal</h1>
        <p className="muted">Authorized staff only. All actions are audited.</p>
        <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        {msg ? <p className="error" role="alert">{msg}</p> : null}
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
