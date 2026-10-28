#!/usr/bin/env bash
# Applies the migrations + seed to a throwaway database on a plain PostgreSQL
# server (with a small Supabase shim) and runs the SQL test suite.
#
#   PGHOST=localhost PGUSER=postgres ./scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DB="${TEST_DB_NAME:-unirate_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -d postgres -c "drop database if exists ${DB}" -c "create database ${DB}"
"${PSQL[@]}" -d "$DB" -f supabase/tests/local_supabase_shim.sql
for f in supabase/migrations/*.sql; do
  echo "→ $f"
  "${PSQL[@]}" -d "$DB" -f "$f"
done
echo "→ supabase/seed.sql"
"${PSQL[@]}" -d "$DB" -f supabase/seed.sql

status=0
for t in supabase/tests/[0-9]*_*.sql; do
  echo "→ $t"
  if ! "${PSQL[@]}" -d "$DB" -f "$t"; then status=1; fi
done
[ "$status" -eq 0 ] && echo "All database tests passed." || echo "Database tests FAILED."
exit "$status"
