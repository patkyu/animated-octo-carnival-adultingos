'use client';
import { useEffect, useState } from 'react';
import { useStaff } from '@/components/Shell';
import { can, sb } from '@/lib/supabase';

interface Row { id: string; slug: string; title: string; category: string; status: string; content_version: number; last_verified_on: string | null; updated_at: string }

export default function Guides() {
  const { role } = useStaff();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState('all');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => sb().from('guides').select('id, slug, title, category, status, content_version, last_verified_on, updated_at').order('updated_at', { ascending: false }).then(({ data }) => setRows((data as Row[]) ?? []));
  useEffect(() => void load(), []);
  const shown = rows.filter((r) => filter === 'all' || r.status === filter);
  return (
    <>
      <h1>Guides</h1>
      <p className="muted">Workflow: Draft → In review → Approved → Published → Needs update → Archived. Only reviewers can approve and publish, and publishing requires at least one verified official source.</p>
      <div className="row" style={{ marginBottom: 12 }}>
        <label>Status
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {['all', 'draft', 'in_review', 'approved', 'published', 'needs_update', 'archived'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </label>
      </div>
      <table>
        <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Version</th><th>Last verified</th><th /></tr></thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.id}>
              <td><b>{r.title}</b><div className="muted">{r.slug}</div></td>
              <td>{r.category}</td>
              <td><span className={`badge b-${r.status}`}>{r.status.replace('_', ' ')}</span></td>
              <td>{r.content_version || '—'}</td>
              <td>{r.last_verified_on ?? <span className="muted">never</span>}</td>
              <td><a href={`/guides/edit?slug=${r.slug}`}>Open</a></td>
            </tr>
          ))}
        </tbody>
      </table>
      {can(role, 'content_editor', 'content_reviewer') ? (
        <form className="card" style={{ marginTop: 16 }} onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await sb().from('guides').insert({ slug, title, category: 'government', status: 'draft' });
          setMsg(error ? error.message : 'Draft created.');
          if (!error) { setSlug(''); setTitle(''); void load(); }
        }}>
          <h2>New draft</h2>
          <div className="grid2">
            <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
            <label>Slug<input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} required pattern="[a-z0-9-]+" /></label>
          </div>
          <div className="row" style={{ marginTop: 12 }}><button type="submit">Create draft</button>{msg ? <span>{msg}</span> : null}</div>
        </form>
      ) : null}
    </>
  );
}
