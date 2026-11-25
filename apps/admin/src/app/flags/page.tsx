'use client';
import { useEffect, useState } from 'react';
import { useStaff } from '@/components/Shell';
import { can, sb } from '@/lib/supabase';

interface Flag { key: string; enabled: boolean; description: string; updated_at: string }

export default function Flags() {
  const { role } = useStaff();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => void sb().from('feature_flags').select('*').order('key').then(({ data }) => setFlags((data as Flag[]) ?? []));
  useEffect(load, []);
  const admin = can(role);
  return (
    <>
      <h1>Feature flags</h1>
      <div className="notice">The app only honours remote overrides for <b>ai_assistant</b>, <b>subscriptions</b> and <b>achievements</b>. Unreleased modules and the unverified-guides preview are fixed at build time and cannot be turned on remotely.</div>
      {msg ? <p className="error">{msg}</p> : null}
      <table>
        <thead><tr><th>Flag</th><th>Description</th><th>Enabled</th></tr></thead>
        <tbody>
          {flags.map((f) => (
            <tr key={f.key}>
              <td><code>{f.key}</code></td>
              <td>{f.description}</td>
              <td>
                <input type="checkbox" aria-label={`Enable ${f.key}`} checked={f.enabled} disabled={!admin} onChange={async (e) => {
                  const { error } = await sb().from('feature_flags').update({ enabled: e.target.checked, updated_at: new Date().toISOString() }).eq('key', f.key);
                  if (!error) await sb().rpc('log_audit', { p_action: 'flag.update', p_target_type: 'feature_flag', p_target_id: null, p_metadata: { key: f.key, enabled: e.target.checked }, p_kind: 'admin' });
                  setMsg(error ? error.message : null);
                  load();
                }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!admin ? <p className="muted">Only super administrators can change flags.</p> : null}
    </>
  );
}
