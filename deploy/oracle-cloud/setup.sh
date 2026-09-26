#!/usr/bin/env bash
#
# Contract OS - one-shot deploy for an Oracle Cloud always-free VM
# Target: Ubuntu 22.04/24.04 (ARM or x86) with nginx + Node 22 + PostgreSQL 16
#
# ORACLE CONSOLE (before running this script):
#   - Create the VM (Recommended: VM.Standard.A1.Flex, 2 OCPU / 12 GB, Ubuntu 24.04)
#   - In VCN -> Security List -> Default: add INGRESS rules for TCP 80 and 443 (0.0.0.0/0)
#   - (Optional but recommended) attach a free.ddns / your domain -> see CERTBOT_DOMAIN below
#
# Run as a user with passwordless sudo (the default 'ubuntu' user on Oracle images):
#   sudo bash deploy/oracle-cloud/setup.sh
#
set -euo pipefail

# ---------------------------------------------------------------------------
# EDIT THESE
# ---------------------------------------------------------------------------
GIT_REPO="https://github.com/YOUR_USER/contract-os.git"   # your repo URL
BRANCH="main"
APP_DIR="/opt/contract-os"

DB_USER="contract_dev"
DB_PASSWORD="contract_dev_password"
DB_NAME="contract_os"

# Leave empty to serve over plain HTTP with the server's IP.
# Set to a domain pointing at the VM (e.g. contractos.example.com) to also
# provision a free Let's Encrypt certificate and redirect HTTP -> HTTPS.
CERTBOT_DOMAIN=""

CORS_ORIGIN="http://localhost:3000"                        # updated automatically below if a domain/IP is used
# ---------------------------------------------------------------------------

APP_USER="${SUDO_USER:-ubuntu}"
NODE_MAJOR=22

cd_report() { echo; echo "==> $1"; }

cd_report "Detecting architecture"
ARCH="$(dpkg --print-architecture)"

cd_report "Installing system packages (nginx, postgres, git, node $NODE_MAJOR)"
apt-get update -y
apt-get install -y ca-certificates curl git build-essential nginx postgresql postgresql-contrib
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
apt-get install -y "nodejs"
node -v && npm -v

cd_report "Starting PostgreSQL"
systemctl enable --now postgresql || service postgresql start

cd_report "Creating database role + database (idempotent)"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}'"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?schema=public"

cd_report "Cloning application source into ${APP_DIR}"
mkdir -p "$(dirname "$APP_DIR")"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin && git -C "$APP_DIR" checkout "$BRANCH" && git -C "$APP_DIR" pull
else
  git clone -b "$BRANCH" "$GIT_REPO" "$APP_DIR"
fi
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

cd_report "Installing npm dependencies (workspaces)"
cd "$APP_DIR"
sudo -u "$APP_USER" npm ci

cd_report "Writing backend production .env"
JWT_SECRET="$(openssl rand -hex 32)"
if [ -n "$CERTBOT_DOMAIN" ]; then
  CORS_ORIGIN="https://${CERTBOT_DOMAIN}"
fi
cat > "$APP_DIR/apps/backend/.env" <<EOF
NODE_ENV=production
PORT=3001
HOST=127.0.0.1
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
CORS_ORIGIN=${CORS_ORIGIN}
AI_PROVIDER=mock
STORAGE_DRIVER=local
EOF

cd_report "Applying migrations to PostgreSQL"
sudo -u "$APP_USER" env DATABASE_URL="$DATABASE_URL" npm run migrate:deploy

cd_report "Seeding demo data (org-demo + users + contracts)"
sudo -u "$APP_USER" env DATABASE_URL="$DATABASE_URL" npm run seed:prod

cd_report "Building backend"
sudo -u "$APP_USER" npm run build:backend

cd_report "Building frontend (API served same-origin via nginx: /api)"
sudo -u "$APP_USER" env NEXT_PUBLIC_API_URL=/api npm run build -w apps/frontend

cd_report "Installing systemd services"
cp "$APP_DIR/deploy/oracle-cloud/contract-os-backend.service" /etc/systemd/system/
cp "$APP_DIR/deploy/oracle-cloud/contract-os-frontend.service" /etc/systemd/system/
sed -i "s|__APP_USER__|${APP_USER}|g" /etc/systemd/system/contract-os-backend.service
sed -i "s|__APP_USER__|${APP_USER}|g" /etc/systemd/system/contract-os-frontend.service
systemctl daemon-reload
systemctl enable --now contract-os-backend
systemctl enable --now contract-os-frontend

cd_report "Installing nginx site"
cp "$APP_DIR/deploy/oracle-cloud/contract-os.conf" /etc/nginx/sites-available/contract-os.conf
if [ -n "$CERTBOT_DOMAIN" ]; then
  sed -i "s/server_name _;/server_name ${CERTBOT_DOMAIN};/" /etc/nginx/sites-available/contract-os.conf
fi
ln -sf /etc/nginx/sites-available/contract-os.conf /etc/nginx/sites-enabled/contract-os.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

if [ -n "$CERTBOT_DOMAIN" ]; then
  cd_report "Provisioning free HTTPS certificate (Let's Encrypt)"
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "$CERTBOT_DOMAIN" --redirect --non-interactive --agree-tos -m "admin@${CERTBOT_DOMAIN}" || \
    certbot --nginx -d "$CERTBOT_DOMAIN" --redirect
  systemctl enable --now certbot.timer
  FINAL_URL="https://${CERTBOT_DOMAIN}"
else
  PUBLIC_IP="$(curl -s -4 ifconfig.me 2>/dev/null || echo '<your-public-ip>')"
  FINAL_URL="http://${PUBLIC_IP}"
fi

cd_report "Verifying services"
sleep 3
systemctl is-active contract-os-backend contract-os-frontend nginx || true
curl -sf "http://127.0.0.1/api/health" && echo " -> backend OK" || echo " -> backend not ready yet (check: journalctl -u contract-os-backend -e)"

echo
echo "=============================================================="
echo " Deploy complete. Open: ${FINAL_URL}"
echo " Login:   legal@acme.com  / Password@123"
echo " Swagger: ${FINAL_URL}/api/docs  (only when NODE_ENV != production)"
echo " Logs:    journalctl -u contract-os-backend -f  /  -u contract-os-frontend -f"
echo "=============================================================="