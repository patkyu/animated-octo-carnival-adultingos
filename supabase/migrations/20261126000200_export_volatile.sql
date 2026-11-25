-- export_my_data() writes an audit event, so it must be VOLATILE. PostgREST runs
-- STABLE/IMMUTABLE functions in a read-only transaction, where that INSERT fails
-- ("cannot execute INSERT in a read-only transaction") and the export breaks.
alter function public.export_my_data() volatile;
