'use client';
import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';

/** Aggregate counts only — the portal never lists individual users' records. */
export default function Overview() {
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [stale, setStale] = useState<{ slug: string; title: string; last_verified_on: string | null }[]>([]);
  useEffect(() => {
    sb().rpc('admin_usage_summary').then(({ data, error }) => (error ? setErr(error.message) : setData(data as Record<string, number>)));
    const cutoff = new Date(Date.now() - 180 * 86400_000).toISOString().slice(0, 10);
    sb().from('guides').select('slug, title, last_verified_on').eq('status', 'published').or(`last_verified_on.is.null,last_verified_on.lt.${cutoff}`)
      .then(({ data }) => setStale((data as typeof stale) ?? []));
  }, []);
  const labels: Record<string, string> = {
    users_total: 'Accounts', users_onboarded: 'Completed onboarding', obligations_active: 'Active obligations', occurrences_completed_7d: 'Completed (7 days)',
    documents_tracked: 'Documents tracked', ai_questions_7d: 'AI questions (7 days)', open_content_reports: 'Open guide reports', open_ai_reports: 'Open AI reports', open_feedback: 'Open feedback',
  };
  return (
    <>
      <h1>Overview</h1>
      {err ? <p className="error">{err}</p> : null}
      <div className="stats">
        {data ? Object.entries(labels).map(([k, l]) => <div key={k} className="stat"><span className="muted">{l}</span><b>{data[k] ?? 0}</b></div>) : <p>Loading…</p>}
      </div>
      <h2>Outdated content alerts</h2>
      {stale.length ? (
        <div className="card">
          <p>These published guides were last verified more than 180 days ago (or never). Re-check their sources and mark them “needs update” if anything changed.</p>
          <ul>{stale.map((g) => <li key={g.slug}><a href={`/guides/edit?slug=${g.slug}`}>{g.title}</a> — {g.last_verified_on ?? 'never verified'}</li>)}</ul>
        </div>
      ) : <p className="muted">No published guide is overdue for re-verification.</p>}
    </>
  );
}
