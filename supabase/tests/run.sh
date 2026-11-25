#!/usr/bin/env bash
# Applies all migrations + seed to a throwaway database on a local PostgreSQL
# and runs the SQL test suite. Usage: bash supabase/tests/run.sh
# Env: PGHOST/PGUSER/etc. as usual; defaults to the local "postgres" superuser.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="adultingos_test_$$"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X -o /dev/null)
if [ "$(id -u)" = "0" ] && [ -z "${PGUSER:-}" ]; then RUN=(su postgres -c); else RUN=(bash -c); fi
run() { "${RUN[@]}" "$*"; }

run "createdb $DB"
trap 'run "dropdb --if-exists $DB" >/dev/null 2>&1 || true' EXIT

echo "→ Supabase stub"
run "${PSQL[*]} -d $DB -f $(pwd)/tests/00_supabase_stub.sql"
for f in migrations/*.sql; do
  echo "→ $f"
  run "${PSQL[*]} -d $DB -f $(pwd)/$f"
done
for f in seeds/*.sql; do
  echo "→ $f"
  run "${PSQL[*]} -d $DB -f $(pwd)/$f"
done

pass=0; fail=0
for f in tests/[1-9]*.sql; do
  if out=$(run "${PSQL[*]} -d $DB -f $(pwd)/$f" 2>&1); then
    echo "✔ $(basename "$f")"; pass=$((pass+1))
    [ -n "$out" ] && echo "$out" | sed 's/^/    /'
  else
    echo "✘ $(basename "$f")"; echo "$out" | sed 's/^/    /'; fail=$((fail+1))
  fi
done
echo "DB tests: $pass passed, $fail failed"
[ "$fail" = "0" ]
