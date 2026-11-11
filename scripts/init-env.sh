#!/bin/sh
# Creează .env pentru rulare locală, cu parole și chei generate aleator. Nu suprascrie un .env existent.
set -eu
cd "$(dirname "$0")/.."
[ -f .env ] && { echo ".env există deja — nu îl suprascriu."; exit 0; }
rnd() { openssl rand -base64 "$1" | tr -d '\n/+=' | cut -c1-"$2"; }
PG=$(rnd 32 32); RW=$(rnd 32 32)
cat > .env <<ENV
DOMAIN=localhost
POSTGRES_PASSWORD=$PG
APP_RW_PASSWORD=$RW
DATABASE_URL=postgres://app_rw:$RW@db:5432/adi
DATABASE_ADMIN_URL=postgres://app_admin:$PG@db:5432/adi
TOTP_ENC_KEY=$(openssl rand -base64 32)
SESSION_PEPPER=$(openssl rand -base64 32)
FILE_STORAGE_DIR=/data/files
APP_MODE=demo
TZ_APP=Europe/Bucharest
DEMO_RESET_ENABLED=true
DEMO_WASTE_SHIFT=years
ENV
chmod 600 .env
echo ".env creat."
