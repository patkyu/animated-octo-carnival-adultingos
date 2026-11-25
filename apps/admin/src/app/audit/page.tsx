'use client';
import { useEffect, useState } from 'react';
import { useStaff } from '@/components/Shell';
import { can, sb } from '@/lib/supabase';

interface Ev { id: string; actor_kind: string; action: string; target_type: string | null; target_id: string | null; metadata: Record<string, unknown>; created_at: string }

export default function Audit() {
  const { role } = useStaff();
  const [rows, setRows] = useState<Ev[]>([]);
  useEffect(() => {
    if (can(role)) void sb().from('audit_events').select('*').order('created_at', { ascending: false }).limit(300).then(({ data }) => setRows((data as Ev[]) ?? []));
  }, [role]);
  if (!can(role)) return <><h1>Audit log</h1><p>Only super administrators can view the audit log.</p></>;
  return (
    <>
      <h1>Audit log</h1>
      <p className="muted">Events never include user content. Retained for 24 months.</p>
      <table>
        <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Metadata</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td>{r.created_at.slice(0, 19).replace('T', ' ')}</td><td>{r.actor_kind}</td><td><code>{r.action}</code></td><td>{r.target_type}</td><td><code>{JSON.stringify(r.metadata)}</code></td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
