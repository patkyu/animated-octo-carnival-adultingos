-- Retrieval fix: websearch_to_tsquery() requires EVERY word of a question to
-- appear in one chunk, so natural questions ("How do I prepare for moving out?
-- Give me a short checklist.") matched nothing and Adu answered unverified.
-- Match ANY meaningful (stemmed, stop-word-free) term and rank by cover density.
create or replace function public.search_knowledge(p_query text, p_limit integer default 6)
returns table (guide_id uuid, slug text, guide_title text, heading text, content text, rank real, last_verified_on date)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select to_tsquery('english', string_agg(quote_literal(lexeme), ' | ')) as tsq
    from unnest(tsvector_to_array(to_tsvector('english', left(coalesce(p_query, ''), 1000)))) as lexeme
  )
  select c.guide_id, g.slug, g.title, c.heading, c.content,
         ts_rank_cd(c.tsv, q.tsq) as rank, g.last_verified_on
  from q
  join knowledge_chunks c on q.tsq is not null and c.tsv @@ q.tsq
  join guides g on g.id = c.guide_id and g.status in ('published', 'needs_update')
  order by rank desc
  limit least(greatest(p_limit, 1), 12)
$$;
grant execute on function public.search_knowledge(text, integer) to anon, authenticated;
