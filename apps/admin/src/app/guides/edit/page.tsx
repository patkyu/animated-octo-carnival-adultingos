'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useStaff } from '@/components/Shell';
import { can, sb, type GuideStatus } from '@/lib/supabase';

interface Guide {
  id: string; slug: string; title: string; category: string; agency: string | null; audience: string; summary: string; eligibility_caveats: string;
  helpful_notes: string; fees_text: string | null; processing_time_text: string | null; related_slugs: string[]; status: GuideStatus; content_version: number; last_verified_on: string | null;
}
interface Step { id?: string; position: number; title: string; body: string; is_optional: boolean; suggested_offset_days: number }
interface Req { id?: string; position: number; text: string }
interface Source { id?: string; title: string; url: string; publisher: string; is_official: boolean; verified_on: string | null; notes: string }
interface Version { version: number; created_at: string }

function Editor() {
  const slug = useSearchParams().get('slug') ?? '';
  const { role } = useStaff();
  const editor = can(role, 'content_editor', 'content_reviewer');
  const reviewer = can(role, 'content_reviewer');
  const [g, setG] = useState<Guide | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await sb().from('guides').select('*').eq('slug', slug).maybeSingle();
    if (!data) return setG(null);
    setG(data as Guide);
    const [s, r, so, v] = await Promise.all([
      sb().from('guide_steps').select('*').eq('guide_id', data.id).order('position'),
      sb().from('guide_requirements').select('*').eq('guide_id', data.id).order('position'),
      sb().from('guide_sources').select('*').eq('guide_id', data.id),
      sb().from('guide_versions').select('version, created_at').eq('guide_id', data.id).order('version', { ascending: false }),
    ]);
    setSteps((s.data as Step[]) ?? []);
    setReqs((r.data as Req[]) ?? []);
    setSources((so.data as Source[]) ?? []);
    setVersions((v.data as Version[]) ?? []);
  }, [slug]);
  useEffect(() => void load(), [load]);

  if (!g) return <p>Loading… (or guide not found)</p>;
  const report = (ok: boolean, text: string) => setMsg({ ok, text });

  const save = async () => {
    const { id, status, content_version, last_verified_on, slug: _s, ...fields } = g;
    void status; void content_version; void last_verified_on; void _s;
    const r1 = await sb().from('guides').update(fields).eq('id', id);
    if (r1.error) return report(false, r1.error.message);
    // Replace child rows (small lists; simplest correct approach).
    await sb().from('guide_steps').delete().eq('guide_id', id);
    await sb().from('guide_requirements').delete().eq('guide_id', id);
    const r2 = await sb().from('guide_steps').insert(steps.map((s, i) => ({ guide_id: id, position: i + 1, title: s.title, body: s.body, is_optional: s.is_optional, suggested_offset_days: s.suggested_offset_days })));
    const r3 = reqs.length ? await sb().from('guide_requirements').insert(reqs.map((r, i) => ({ guide_id: id, position: i + 1, text: r.text }))) : { error: null };
    for (const s of sources) {
      const row = { guide_id: id, title: s.title, url: s.url, publisher: s.publisher, is_official: s.is_official, notes: s.notes };
      const res = s.id ? await sb().from('guide_sources').update(row).eq('id', s.id) : await sb().from('guide_sources').insert(row);
      if (res.error) return report(false, res.error.message);
    }
    if (r2.error || r3.error) return report(false, (r2.error ?? r3.error)!.message);
    report(true, 'Saved. Published guides keep their last published version for users until you publish again.');
    void load();
  };

  const transition = async (to: GuideStatus) => {
    const { error } = await sb().rpc('set_guide_status', { p_guide: g.id, p_status: to });
    report(!error, error ? error.message : `Status changed to ${to.replace('_', ' ')}.`);
    void load();
  };
  const publish = async () => {
    const { data, error } = await sb().rpc('publish_guide', { p_guide: g.id });
    report(!error, error ? error.message : `Published version ${data}.`);
    void load();
  };
  const verifySource = async (s: Source) => {
    if (!s.id) return report(false, 'Save the source first.');
    const today = new Date().toISOString().slice(0, 10);
    const { data: u } = await sb().auth.getUser();
    const { error } = await sb().from('guide_sources').update({ verified_on: today, verified_by: u.user?.id }).eq('id', s.id);
    report(!error, error ? error.message : `Marked verified on ${today}. Confirm you checked every requirement, fee and step against this page.`);
    void load();
  };

  const field = (k: keyof Guide, label: string, multi = false) => (
    <label>{label}
      {multi ? <textarea value={(g[k] as string) ?? ''} onChange={(e) => setG({ ...g, [k]: e.target.value })} disabled={!editor} />
        : <input value={(g[k] as string) ?? ''} onChange={(e) => setG({ ...g, [k]: e.target.value || (k === 'fees_text' || k === 'processing_time_text' || k === 'agency' ? null : '') })} disabled={!editor} />}
    </label>
  );

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{g.title}</h1>
        <span className={`badge b-${g.status}`}>{g.status.replace('_', ' ')}</span>
      </div>
      <p className="muted">Version {g.content_version || 'unpublished'} · last verified {g.last_verified_on ?? 'never'}</p>
      {msg ? <p className={msg.ok ? '' : 'error'} role="status">{msg.text}</p> : null}
      <div className="card row">
        {editor && (g.status === 'draft' || g.status === 'needs_update') ? <button onClick={() => transition('in_review')}>Submit for review</button> : null}
        {reviewer && g.status === 'in_review' ? <button onClick={() => transition('approved')}>Approve</button> : null}
        {reviewer && g.status === 'in_review' ? <button className="secondary" onClick={() => transition('draft')}>Send back to draft</button> : null}
        {reviewer && (g.status === 'approved' || g.status === 'needs_update') ? <button onClick={publish}>Publish</button> : null}
        {editor && g.status === 'published' ? <button className="secondary" onClick={() => transition('needs_update')}>Mark needs update</button> : null}
        {reviewer && g.status !== 'archived' ? <button className="danger" onClick={() => transition('archived')}>Archive</button> : null}
      </div>

      <div className="card">
        <h2>Content</h2>
        <div className="grid2">
          {field('title', 'Title')}
          <label>Category
            <select value={g.category} onChange={(e) => setG({ ...g, category: e.target.value })} disabled={!editor}>
              {['government', 'employment', 'independent_living', 'freelancing', 'life_events'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          {field('agency', 'Agency')}
          {field('audience', 'Intended audience')}
        </div>
        {field('summary', 'Summary', true)}
        {field('eligibility_caveats', 'Eligibility caveats', true)}
        <div className="grid2">
          {field('fees_text', 'Fees (only if verified; leave empty otherwise)')}
          {field('processing_time_text', 'Processing time (only if verified)')}
        </div>
        {field('helpful_notes', 'Helpful notes', true)}
      </div>

      <div className="card">
        <h2>Requirements</h2>
        {reqs.map((r, i) => (
          <div key={i} className="row" style={{ marginBottom: 8 }}>
            <input style={{ flex: 1 }} value={r.text} onChange={(e) => setReqs(reqs.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} disabled={!editor} />
            {editor ? <button className="secondary" onClick={() => setReqs(reqs.filter((_, j) => j !== i))}>Remove</button> : null}
          </div>
        ))}
        {editor ? <button className="secondary" onClick={() => setReqs([...reqs, { position: reqs.length + 1, text: '' }])}>Add requirement</button> : null}
      </div>

      <div className="card">
        <h2>Steps</h2>
        {steps.map((s, i) => (
          <div key={i} className="card">
            <div className="grid2">
              <label>Step {i + 1} title<input value={s.title} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} disabled={!editor} /></label>
              <label>Suggested days after start<input type="number" min={0} value={s.suggested_offset_days} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, suggested_offset_days: Number(e.target.value) } : x)))} disabled={!editor} /></label>
            </div>
            <label>Details<textarea value={s.body} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} disabled={!editor} /></label>
            <div className="row">
              <label className="row"><input type="checkbox" checked={s.is_optional} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, is_optional: e.target.checked } : x)))} disabled={!editor} /> Optional</label>
              {editor ? <button className="secondary" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>Remove step</button> : null}
            </div>
          </div>
        ))}
        {editor ? <button className="secondary" onClick={() => setSteps([...steps, { position: steps.length + 1, title: '', body: '', is_optional: false, suggested_offset_days: 0 }])}>Add step</button> : null}
      </div>

      <div className="card">
        <h2>Sources</h2>
        <p className="muted">Publishing requires at least one official source verified by a reviewer. Verification means you checked the guide&apos;s requirements, steps, fees and times against the source page today.</p>
        {sources.map((s, i) => (
          <div key={s.id ?? i} className="card">
            <div className="grid2">
              <label>Title<input value={s.title} onChange={(e) => setSources(sources.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} disabled={!editor} /></label>
              <label>Publisher<input value={s.publisher} onChange={(e) => setSources(sources.map((x, j) => (j === i ? { ...x, publisher: e.target.value } : x)))} disabled={!editor} /></label>
            </div>
            <label>URL (https)<input value={s.url} onChange={(e) => setSources(sources.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} disabled={!editor} /></label>
            <div className="row" style={{ marginTop: 8 }}>
              <label className="row"><input type="checkbox" checked={s.is_official} onChange={(e) => setSources(sources.map((x, j) => (j === i ? { ...x, is_official: e.target.checked } : x)))} disabled={!editor} /> Official government source</label>
              <span className="muted">{s.verified_on ? `Verified ${s.verified_on}` : 'Not verified'}</span>
              {reviewer && s.id ? <button className="secondary" onClick={() => verifySource(s)}>I verified this today</button> : null}
              <a href={s.url} target="_blank" rel="noreferrer noopener">Open</a>
            </div>
          </div>
        ))}
        {editor ? <button className="secondary" onClick={() => setSources([...sources, { title: '', url: 'https://', publisher: '', is_official: true, verified_on: null, notes: '' }])}>Add source</button> : null}
      </div>

      {editor ? <button onClick={save}>Save changes</button> : null}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Version history</h2>
        {versions.length ? <ul>{versions.map((v) => <li key={v.version}>Version {v.version} — published {v.created_at.slice(0, 16).replace('T', ' ')}</li>)}</ul> : <p className="muted">Never published.</p>}
      </div>
    </>
  );
}

export default function EditGuidePage() {
  return <Suspense fallback={<p>Loading…</p>}><Editor /></Suspense>;
}
