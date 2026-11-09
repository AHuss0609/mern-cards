#!/usr/bin/env bash
# One-command setup of the Cards app on a DigitalOcean droplet running
# Ubuntu 24.04 (the Marketplace "LAMP" image or plain Ubuntu).
#
# Does everything from tutorial steps 7 and 13 that happens on the server:
#   - creates the unprivileged "deploy" user and installs Node 26 with nvm
#   - installs the API in /opt/cards-api and runs it as a systemd user service
#   - builds the React frontend and serves it from /var/www/cards
#   - sets up the Apache site (/api is proxied to Node on port 5000)
#   - gets a Let's Encrypt certificate and turns on HTTPS with a redirect
#
# Run it as root in the droplet's console:
#   curl -fsSL https://raw.githubusercontent.com/AHuss0609/mern-cards/main/setup-droplet.sh -o setup.sh
#   bash setup.sh
#
# It asks for two things: your MongoDB Atlas connection string (hidden) and
# an email for Let's Encrypt. It is safe to run again: it pulls the latest
# code, rebuilds, and keeps your existing .env and certificate.
#
# Settings you can override, e.g.  CARDS_HOST=cards.example.com bash setup.sh
#   CARDS_HOST      the hostname that points at this droplet
#   REPO_URL        Git URL of the repository holding cards-backend/ and cards-frontend/
#   RESET_ENV=1     ask for a new MongoDB connection string even if .env exists

set -euo pipefail

HOST="${CARDS_HOST:-cards.lampali.lol}"
REPO_URL="${REPO_URL:-https://github.com/AHuss0609/mern-cards.git}"
BRANCH=main
DEPLOY_USER=deploy
SRC=/home/deploy/src/mern-cards   # the Git checkout
APP_DIR=/opt/cards-api
SITE_DIR=/var/www/cards
NODE_MAJOR=26
NVM_VERSION=v0.40.8

# --- Output helpers --------------------------------------------------------
step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m    OK:\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m    NOTE:\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31mSTOPPED:\033[0m %s\n' "$*" >&2; exit 1; }

# Read from the terminal even when the script itself arrives on stdin
ask() { local __var=$1 __prompt=$2 __reply; read -rp "$__prompt" __reply </dev/tty; printf -v "$__var" '%s' "$__reply"; }
ask_secret() { local __var=$1 __prompt=$2 __reply; read -rsp "$__prompt" __reply </dev/tty; echo; printf -v "$__var" '%s' "$__reply"; }

[ "$(id -u)" -eq 0 ] || die "Run this as root (in the DigitalOcean console you are root already)."
cd /   # so commands run as the deploy user don't start in root's private home folder

# Run a command as the deploy user, with nvm's Node on the PATH. It starts
# from a clean environment so root's own settings (an NVM_DIR from an earlier
# nvm install, for example) can't leak in. (nvm doesn't work under "set -u",
# so the inner shell doesn't use it: chain with &&.)
as_deploy() {
  runuser -u "$DEPLOY_USER" -- env -i HOME="/home/$DEPLOY_USER" USER="$DEPLOY_USER" LOGNAME="$DEPLOY_USER" \
    PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin LANG=C.UTF-8 GIT_TERMINAL_PROMPT=0 bash -c \
    "cd ~; if [ -s ~/.nvm/nvm.sh ]; then . ~/.nvm/nvm.sh; nvm use --silent $NODE_MAJOR >/dev/null 2>&1; fi; $1"
}

# Talk to the deploy user's own systemd (for its user service)
deploy_systemctl() {
  local uid; uid=$(id -u "$DEPLOY_USER")
  runuser -u "$DEPLOY_USER" -- env XDG_RUNTIME_DIR="/run/user/$uid" \
    DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" systemctl --user "$@"
}

public_ip() {
  curl -fsS -m 5 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address 2>/dev/null \
    || curl -fsS -m 5 https://api.ipify.org 2>/dev/null || true
}

IP=$(public_ip)
echo "Cards app setup for https://$HOST  (this droplet's IP: ${IP:-unknown})"

# --- 1. System packages ----------------------------------------------------
step "Installing system packages (Apache, Certbot, Git, rsync)"
export DEBIAN_FRONTEND=noninteractive
APT="apt-get -y -q -o DPkg::Lock::Timeout=600"
# apt-get update doesn't wait for the lock other apt jobs may hold; retry it
for try in $(seq 30); do
  $APT update >/dev/null 2>&1 && break
  [ "$try" = 30 ] && { $APT update; die "apt-get update keeps failing"; }
  sleep 10
done
PKGS=(git rsync curl ca-certificates openssl apache2 bind9-dnsutils)
# The LAMP image may already have Certbot (apt or snap); don't add a second
# copy, but make sure an apt-installed one has its Apache plugin
if ! command -v certbot >/dev/null; then PKGS+=(certbot python3-certbot-apache)
elif [ "$(command -v certbot)" = /usr/bin/certbot ]; then PKGS+=(python3-certbot-apache); fi
$APT install "${PKGS[@]}" >/dev/null
ok "packages installed"

# Only SSH, HTTP and HTTPS from outside; the API's port 5000 stays private
$APT install ufw >/dev/null
ufw allow OpenSSH >/dev/null
ufw allow 'Apache Full' >/dev/null
[[ "$(ufw status)" == *"Status: active"* ]] || ufw --force enable >/dev/null
ok "firewall on: SSH, HTTP and HTTPS open; port 5000 closed"

# Building the React app needs more memory than a 1 GB droplet has
if [ "$(awk '/MemTotal/ {print $2}' /proc/meminfo)" -lt 2000000 ] && [ -z "$(swapon --show)" ]; then
  step "Adding 2 GB of swap so the frontend build has enough memory"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "swap on"
fi

# --- 2. The deploy user ----------------------------------------------------
step "Setting up the '$DEPLOY_USER' user"
id "$DEPLOY_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$DEPLOY_USER"
usermod -aG systemd-journal "$DEPLOY_USER"
# Let the same SSH keys that log in as root also log in as deploy
if [ -f /root/.ssh/authorized_keys ]; then
  install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
  while IFS= read -r key || [ -n "$key" ]; do
    [ -n "$key" ] && ! grep -qxF "$key" "/home/$DEPLOY_USER/.ssh/authorized_keys" \
      && echo "$key" >> "/home/$DEPLOY_USER/.ssh/authorized_keys"
  done < /root/.ssh/authorized_keys
  chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi
# Keep deploy's services running when nobody is logged in
loginctl enable-linger "$DEPLOY_USER"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR" "$SITE_DIR"
ok "user ready; $APP_DIR and $SITE_DIR belong to $DEPLOY_USER"

step "Installing Node.js $NODE_MAJOR with nvm"
as_deploy "[ -s ~/.nvm/nvm.sh ] || { curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh -o ~/nvm-install.sh && bash ~/nvm-install.sh >/dev/null; }"
as_deploy ". ~/.nvm/nvm.sh && nvm install $NODE_MAJOR >/dev/null && nvm alias default $NODE_MAJOR >/dev/null"
ok "node $(as_deploy 'node --version')"

# --- 3. Get the code -------------------------------------------------------
step "Downloading the code from GitHub"
as_deploy "mkdir -p ~/src
  if [ -d $SRC/.git ]; then
    git -C $SRC fetch -q --depth 1 origin $BRANCH && git -C $SRC reset -q --hard FETCH_HEAD
  else
    git clone -q --depth 1 --branch $BRANCH $REPO_URL $SRC
  fi" || die "couldn't download $REPO_URL (is the repository public?)"
ok "code at commit $(as_deploy "git -C $SRC log -1 --format='%h %s'")"

# --- 4. The API ------------------------------------------------------------
step "Installing the API in $APP_DIR"
# Same file selection as the backend's GitHub Actions deploy
as_deploy "rsync -a --delete --exclude .git/ --exclude .github/ --exclude node_modules/ --exclude .env \
  --exclude tests/ --exclude api-tests/ --exclude tutorials/ $SRC/cards-backend/ $APP_DIR/"
as_deploy "cd $APP_DIR && npm ci --omit=dev --no-audit --no-fund --loglevel=error"
ok "API dependencies installed"

check_atlas() {
  as_deploy "cd $APP_DIR && node -e \"
    require('dotenv').config({ quiet: true });
    require('mongoose').connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
      .then(() => { console.log('connected'); process.exit(0); })
      .catch((e) => { console.error(e.message); process.exit(1); });\""
}

write_env() {
  local uri jwt again=""
  while :; do
    echo
    echo "    Paste your MongoDB Atlas connection string. In Atlas: your cluster > Connect >"
    echo "    Drivers. It looks like mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/..."
    echo "    (Replace <db_password> with the real password first. Nothing shows while you paste.)"
    ask_secret uri "    Connection string: "
    uri="${uri//[[:space:]]/}"
    if [[ ! "$uri" =~ ^mongodb(\+srv)?:// ]]; then warn "that doesn't start with mongodb+srv:// - try again"; continue; fi
    if [[ "$uri" == *"<"* || "$uri" == *">"* ]]; then warn "it still contains <...>: put your real password in - try again"; continue; fi
    if [[ "$uri" == *"'"* ]]; then warn "the password contains a ' character; change it in Atlas (Database Access) and try again"; continue; fi
    # Add the database name if the string has none (…mongodb.net/?retryWrites…)
    if [[ "$uri" =~ ^(mongodb(\+srv)?://[^/?]+)/?(\?.*)?$ ]]; then
      uri="${BASH_REMATCH[1]}/CardsDB${BASH_REMATCH[3]}"
    fi
    jwt=$(openssl rand -hex 48)
    ( umask 077
      printf "MONGODB_URI='%s'\nPORT=5000\nJWT_SECRET=%s\nJWT_EXPIRES_IN=8h\n" "$uri" "$jwt" > "$APP_DIR/.env" )
    chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/.env"
    chmod 600 "$APP_DIR/.env"
    echo "    Testing the connection to $(sed -E 's#^[^@]*@([^/?]+).*#\1#' <<<"$uri") ..."
    if check_atlas; then ok "MongoDB Atlas connection works"; return; fi
    warn "Atlas refused the connection. The usual causes:"
    echo "      - Atlas > Network Access does not list this droplet's IP (${IP:-unknown}). Add it, or 0.0.0.0/0."
    echo "      - wrong database user or password (Atlas > Database Access)."
    echo "      - the password contains @ : / ? # or %. Pick one with only letters and numbers."
    ask again "    Try again? [Y/n] "
    [[ "$again" =~ ^[Nn] ]] && die "fix the Atlas settings, then run this script again"
  done
}

step "Connecting the API to MongoDB Atlas"
if [ -f "$APP_DIR/.env" ] && grep -q '^MONGODB_URI=' "$APP_DIR/.env" && [ "${RESET_ENV:-0}" != 1 ]; then
  if check_atlas >/dev/null 2>&1; then
    ok "keeping the existing $APP_DIR/.env (connection works). Use RESET_ENV=1 to replace it."
  else
    warn "the existing .env can't reach Atlas; let's replace the connection string"
    write_env
  fi
else
  write_env
fi

step "Starting the API as a systemd user service"
DUID=$(id -u "$DEPLOY_USER")
systemctl start "user@$DUID.service"
for _ in $(seq 30); do [ -S "/run/user/$DUID/bus" ] && break; sleep 1; done
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.config" "/home/$DEPLOY_USER/.config/systemd" "/home/$DEPLOY_USER/.config/systemd/user"
install -m 644 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$SRC/cards-backend/deploy/cards-api.service" \
  "/home/$DEPLOY_USER/.config/systemd/user/cards-api.service"
deploy_systemctl daemon-reload
deploy_systemctl enable cards-api >/dev/null 2>&1
deploy_systemctl restart cards-api
if curl -fsS --retry 15 --retry-delay 2 --retry-connrefused http://127.0.0.1:5000/api/ping >/dev/null; then
  ok "API answers on http://127.0.0.1:5000/api/ping"
else
  runuser -u "$DEPLOY_USER" -- env XDG_RUNTIME_DIR="/run/user/$DUID" journalctl --user-unit cards-api -n 30 --no-pager || true
  die "the API did not start; the log is above"
fi

# --- 5. The frontend -------------------------------------------------------
step "Building the React frontend (this takes a few minutes)"
as_deploy "cd $SRC/cards-frontend && CYPRESS_INSTALL_BINARY=0 npm ci --no-audit --no-fund --loglevel=error"
as_deploy "cd $SRC/cards-frontend && NODE_OPTIONS=--max-old-space-size=1536 npm run build > ~/frontend-build.log 2>&1" \
  || { tail -n 40 "/home/$DEPLOY_USER/frontend-build.log"; die "the frontend build failed; the end of its log is above"; }
[ -f "$SRC/cards-frontend/dist/index.html" ] || die "the build did not produce dist/index.html"
as_deploy "rsync -a --delete $SRC/cards-frontend/dist/ $SITE_DIR/"
ok "frontend copied to $SITE_DIR"

# --- 6. Apache -------------------------------------------------------------
step "Configuring Apache for $HOST"
SITE_CONF=/etc/apache2/sites-available/cards.conf
# Certbot edits cards.conf and creates cards-le-ssl.conf; once that exists,
# leave both alone so re-running this script keeps HTTPS working.
if [ ! -f /etc/apache2/sites-available/cards-le-ssl.conf ]; then
  install -m 644 "$SRC/cards-backend/deploy/apache-cards.conf" "$SITE_CONF"
  sed -i -E "s/^([[:space:]]*ServerName[[:space:]]+).*/\1$HOST/" "$SITE_CONF"
fi
a2enmod -q proxy proxy_http >/dev/null
a2ensite -q cards >/dev/null
conftest=$(apachectl configtest 2>&1) || true
[[ "$conftest" == *"Syntax OK"* ]] || { echo "$conftest"; die "Apache rejected the site config"; }
systemctl reload apache2
ok "Apache serves $SITE_DIR and forwards /api to the API"

# --- 7. DNS and HTTPS ------------------------------------------------------
step "Checking that $HOST points at this droplet"
resolved() { dig +short A "$HOST" @1.1.1.1 2>/dev/null | tail -n1; }
if [ -n "$IP" ] && [ "$(resolved)" != "$IP" ]; then
  echo "    $HOST does not point here yet (it resolves to '$(resolved)')."
  echo "    In Porkbun: Domain Management > lampali.lol > DNS > add a record:"
  echo "        Type A    Host cards    Answer $IP    TTL 600"
  echo "    Waiting up to 15 minutes for it to show up (Ctrl+C to stop; re-run the script later)..."
  for _ in $(seq 90); do sleep 10; [ "$(resolved)" = "$IP" ] && break; printf '.'; done
  echo
  [ "$(resolved)" = "$IP" ] || die "$HOST still doesn't point at $IP. Add the DNS record, wait a few minutes, then run this script again."
fi
ok "$HOST -> $IP"

step "Getting the HTTPS certificate from Let's Encrypt"
if [ -d "/etc/letsencrypt/live/$HOST" ] && [ -f /etc/apache2/sites-available/cards-le-ssl.conf ]; then
  ok "HTTPS is already set up (Certbot renews the certificate by itself)"
else
  EMAIL_ARGS=()
  if ! compgen -G "/etc/letsencrypt/accounts/*/directory/*" >/dev/null; then
    ask EMAIL "    Email for certificate expiry notices (Enter to skip): "
    if [ -n "$EMAIL" ]; then EMAIL_ARGS=(-m "$EMAIL" --no-eff-email); else EMAIL_ARGS=(--register-unsafely-without-email); fi
  fi
  certbot --apache -d "$HOST" --redirect --agree-tos --non-interactive --keep-until-expiring "${EMAIL_ARGS[@]}"
  ok "HTTPS enabled; http:// now redirects to https://"
fi

# --- 8. Final check --------------------------------------------------------
step "Final check from the internet side"
[[ "$(curl -fsS "https://$HOST/api/ping" || true)" == *"Hello World"* ]] || die "https://$HOST/api/ping did not answer"
ok "https://$HOST/api/ping answers"
[[ "$(curl -fsS "https://$HOST/" || true)" == *'id="root"'* ]] || die "https://$HOST/ did not return the React app"
ok "https://$HOST/ serves the React app"
code=$(curl -s -o /dev/null -w '%{http_code}' "http://$HOST/" || true)
[ "$code" = 301 ] && ok "http://$HOST redirects to HTTPS" || warn "http://$HOST returned $code instead of a 301 redirect"

printf '\n\033[1;32mAll done.\033[0m Open https://%s in your browser.\n' "$HOST"
echo "To deploy new code later, push to GitHub and run this script again:  bash setup.sh"
