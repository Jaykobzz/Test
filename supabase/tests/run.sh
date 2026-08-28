#!/usr/bin/env bash
#
# Kör FRIENDs databastester mot en tillfällig Postgres.
#
# Testerna behöver inte Supabase — 00_supabase_shim.sql skapar de roller,
# scheman och funktioner (auth.uid(), storage.foldername() …) som Supabase
# annars ger. Det gör att hela RLS-lagret kan testas i CI utan moln.
#
# Krav: postgresql-16 och postgresql-16-postgis-3.
# Kör:  ./supabase/tests/run.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGDATA="${PGDATA:-/var/lib/pgtest/data}"
PGRUN="${PGRUN:-/var/lib/pgtest/run}"
PGPORT="${PGPORT:-5433}"
DBNAME="friend_test"

psql_run() {
  psql -h "$PGRUN" -p "$PGPORT" -U postgres -v ON_ERROR_STOP=1 "$@"
}

# Starta en instans om ingen redan lyssnar.
if ! pg_isready -h "$PGRUN" -p "$PGPORT" -q 2>/dev/null; then
  echo "→ startar Postgres i $PGDATA"
  rm -rf "$PGDATA" "$PGRUN"
  mkdir -p "$PGDATA" "$PGRUN"
  chown -R postgres:postgres "$(dirname "$PGDATA")"
  su postgres -c "$PGBIN/initdb -D $PGDATA -U postgres --auth=trust" >/dev/null
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA \
    -o '-k $PGRUN -p $PGPORT -c listen_addresses=' -l $PGDATA/../pg.log start" >/dev/null
  sleep 2
fi

echo "→ återskapar $DBNAME"
psql_run -q -d postgres -c "drop database if exists $DBNAME;" \
                        -c "create database $DBNAME;" >/dev/null

echo "→ lägger på Supabase-attrappen"
psql_run -q -d "$DBNAME" -f "$ROOT/supabase/tests/00_supabase_shim.sql" >/dev/null

echo "→ kör migrationer"
for file in "$ROOT"/supabase/migrations/*.sql; do
  printf '   %s\n' "$(basename "$file")"
  psql_run -q -d "$DBNAME" -f "$file" >/dev/null
done

echo "→ kör tester"
echo
psql_run -qtA -d "$DBNAME" -f "$ROOT/supabase/tests/01_flows_and_rls.sql" 2>&1 \
  | grep -E 'NOTICE:  ok:|MISSLYCKADES|ERROR|Alla tester' \
  | sed -E 's/^psql:[^ ]+ //; s/NOTICE:  //'

echo
echo "→ $(psql_run -qtA -d "$DBNAME" -c "select count(*) from activities") aktiviteter i testdatan"
