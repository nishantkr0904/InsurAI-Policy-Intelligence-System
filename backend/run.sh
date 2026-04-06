#!/usr/bin/env sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
CELERY_BIN="$SCRIPT_DIR/.venv/bin/celery"

pkill -f "app.workers.celery_app worker" >/dev/null 2>&1 || true

if [ ! -x "$CELERY_BIN" ]; then
	CELERY_BIN="celery"
fi

exec "$CELERY_BIN" -A app.workers.celery_app worker -l info -n worker@%h