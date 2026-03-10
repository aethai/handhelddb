#!/bin/bash
# HandheldDB Supabase backup script
# Run daily via cron: 0 4 * * * /home/ubuntu/handhelddb/scripts/backup-db.sh
#
# Backs up the remote Supabase PostgreSQL database via pg_dump
# Retention: 7 daily + 4 weekly backups

set -euo pipefail

HANDHELD_DIR="/home/ubuntu/handhelddb"
BACKUP_DIR="${HANDHELD_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)

# Read DIRECT_URL from .env (format: postgresql://user:pass@host:port/db)
DIRECT_URL=$(grep '^DIRECT_URL=' "${HANDHELD_DIR}/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
if [ -z "$DIRECT_URL" ]; then
    echo "[$(date)] ERROR: DIRECT_URL not found in .env" >&2
    exit 1
fi
# Parse connection string
PG_USER=$(echo "$DIRECT_URL" | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
export PGPASSWORD=$(echo "$DIRECT_URL" | sed -n 's|postgresql://[^:]*:\([^@]*\)@.*|\1|p')
PG_HOST=$(echo "$DIRECT_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
PG_PORT=$(echo "$DIRECT_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
PG_DB=$(echo "$DIRECT_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

echo "[$(date)] Starting HandheldDB backup..."

# PostgreSQL backup (schema + data, exclude Supabase internal schemas)
PG_BACKUP="$BACKUP_DIR/daily/handhelddb_${TIMESTAMP}.sql.gz"
pg_dump \
    -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$PG_DB" \
    --no-owner --no-privileges \
    -N 'auth' -N 'storage' -N 'realtime' -N 'supabase_*' -N 'extensions' -N '_realtime' -N 'pgsodium*' -N 'vault' -N 'graphql*' \
    | gzip > "$PG_BACKUP"

BACKUP_SIZE=$(du -h "$PG_BACKUP" | cut -f1)
echo "[$(date)] PostgreSQL backup: $PG_BACKUP ($BACKUP_SIZE)"

# Weekly backup (on Sundays)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    cp "$PG_BACKUP" "$BACKUP_DIR/weekly/handhelddb_weekly_${TIMESTAMP}.sql.gz"
    echo "[$(date)] Weekly backup created"
fi

# Cleanup: keep 7 daily backups
find "$BACKUP_DIR/daily" -name "handhelddb_*.sql.gz" -mtime +7 -delete 2>/dev/null || true

# Cleanup: keep 4 weekly backups
find "$BACKUP_DIR/weekly" -name "handhelddb_*.sql.gz" -mtime +28 -delete 2>/dev/null || true

echo "[$(date)] Backup complete."
