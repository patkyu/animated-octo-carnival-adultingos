'use client';
import { useEffect, useState } from 'react';
import { useStaff } from '@/components/Shell';
import { can, sb } from '@/lib/supabase';

interface Report { id: string; reason?: string; kind?: string; details?: string; message?: string; shared_excerpt?: string; status: string; created_at: string; guides?: { title: string; slug: string } | null }

const STATUSES = ['open', 'triaged', 'resolved', 'dismissed'];

function Table({ table, title, rows, onChange, editable }: { table: string; title: string; rows: Report[]; onChange: () => void; editable: boolean }) {
  return (
    <>
      <h2>{title}</h2>
      {rows.length === 0 ? <p className="muted">Nothing here.</p> : (
        <table>
          <thead><tr><th>Received</th><th>Reason</th><th>Details</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.created_at.slice(0, 16).replace('T', ' ')}</td>
                <td>{r.reason ?? r.kind}{r.guides ? <div><a href={`/guides/edit?slug=${r.guides.slug}`}>{r.guides.title}</a></div> : null}</td>
                <td style={{ whiteSpace: 'pre-wrap', maxWidth: 420 }}>{r.details || r.message}{r.shared_excerpt ? <details><summary>Shared by the reporter</summary>{r.shared_excerpt}</details> : null}</td>
                <td>
                  {editable ? (
                    <select value={r.status} aria-label="Status" onChange={async (e) => { await sb().from(table).update({ status: e.target.value }).eq('id', r.id); onChange(); }}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  ) : <span className={`badge b-${r.status}`}>{r.status}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/** Reports contain only what reporters chose to share — no access to conversations or records. */
export default function Reports() {
  const { role } = useStaff();
  const [content, setContent] = useState<Report[]>([]);
  const [ai, setAi] = useState<Report[]>([]);
  const [feedback, setFeedback] = useState<Report[]>([]);
  const load = () => {
    void sb().from('content_reports').select('id, reason, details, status, created_at, guides(title, slug)').order('created_at', { ascending: false }).limit(200).then(({ data }) => setContent((data as unknown as Report[]) ?? []));
    void sb().from('ai_content_reports').select('id, reason, details, shared_excerpt, status, created_at').order('created_at', { ascending: false }).limit(200).then(({ data }) => setAi((data as Report[]) ?? []));
    void sb().from('feedback_reports').select('id, kind, message, status, created_at').order('created_at', { ascending: false }).limit(200).then(({ data }) => setFeedback((data as Report[]) ?? []));
  };
  useEffect(load, []);
  return (
    <>
      <h1>Reports</h1>
      <Table table="content_reports" title="Guide reports" rows={content} onChange={load} editable={can(role, 'content_editor', 'content_reviewer', 'support_operator')} />
      <Table table="ai_content_reports" title="AI answer reports" rows={ai} onChange={load} editable={can(role, 'support_operator', 'content_reviewer')} />
      <Table table="feedback_reports" title="App feedback" rows={feedback} onChange={load} editable={can(role, 'support_operator')} />
    </>
  );
}
