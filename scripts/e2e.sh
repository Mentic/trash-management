#!/bin/sh
# Teste end-to-end pe build-ul de producție (standalone), fiecare pe o bază proaspătă:
#   1. tests/e2e/auth-smoke.cjs      — L1–L5 (conturi neînrolate)
#   2. tests/e2e/demo-scenarios.cjs  — L1–L2, R1–R8, D1–D5, D7, S08, N08
# Necesită: `pnpm build` făcut, PostgreSQL accesibil, PG_ADMIN_BASE (ex. postgres://app_admin:parola@localhost:5432)
# și rolul app_rw cu parola din APP_RW_PASSWORD. Opțional: PORT (implicit 3100).
set -eu
cd "$(dirname "$0")/.."
: "${PG_ADMIN_BASE:?ex. postgres://app_admin:parola@localhost:5432}"
: "${APP_RW_PASSWORD:?parola rolului app_rw}"
PORT="${PORT:-3100}"
HOSTPORT="${PG_ADMIN_BASE#*@}"
S=.next/standalone
[ -f "$S/server.js" ] || { echo "Rulați întâi: pnpm build"; exit 1; }
rm -rf "$S/.next/static" "$S/src/db/migrations" "$S/seed"
mkdir -p "$S/.next" "$S/src/db"
cp -r .next/static "$S/.next/static"; cp -r src/db/migrations "$S/src/db/migrations"; cp -r seed "$S/seed"
TMP=$(mktemp -d)
export TOTP_ENC_KEY="$(openssl rand -base64 32)" SESSION_PEPPER="$(openssl rand -base64 32)" APP_MODE=demo DEMO_RESET_ENABLED=true NEXT_TELEMETRY_DISABLED=1

run() { # $1 = baza, $2 = testul
  psql -q "$PG_ADMIN_BASE/postgres" -c "DROP DATABASE IF EXISTS $1 WITH (FORCE)" -c "CREATE DATABASE $1"
  psql -q "$PG_ADMIN_BASE/postgres" -c "GRANT CONNECT ON DATABASE $1 TO app_rw"
  rm -rf "$TMP/files"
  (cd "$S" && DATABASE_URL="postgres://app_rw:$APP_RW_PASSWORD@$HOSTPORT/$1" DATABASE_ADMIN_URL="$PG_ADMIN_BASE/$1" \
    FILE_STORAGE_DIR="$TMP/files" PORT="$PORT" HOSTNAME=127.0.0.1 node server.js > "$TMP/$1.log" 2>&1) &
  PID=$!
  i=0; until curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null; do i=$((i+1)); [ $i -gt 60 ] && { cat "$TMP/$1.log"; kill $PID; exit 1; }; sleep 1; done
  BASE_URL="http://127.0.0.1:$PORT" node "$2" || { echo "--- log server ---"; tail -50 "$TMP/$1.log"; kill $PID; exit 1; }
  kill $PID; wait $PID 2>/dev/null || true
}

run adi_e2e_auth tests/e2e/auth-smoke.cjs
run adi_e2e_demo tests/e2e/demo-scenarios.cjs
echo "E2E: toate testele au trecut."
