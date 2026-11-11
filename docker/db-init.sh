#!/bin/sh
# Rulează o singură dată, la crearea volumului Postgres: rolul aplicației (sec. 3–4).
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE ROLE app_rw LOGIN PASSWORD '${APP_RW_PASSWORD}';
GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO app_rw;
SQL
