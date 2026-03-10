#!/usr/bin/env bash
#
# Install cron jobs for HandheldDB data sync
#
# Schedules:
#   - Steam sync:          daily at 3:00 AM UTC
#   - ProtonDB sync:       weekly on Sunday at 4:00 AM UTC
#   - Meilisearch reindex: every 6 hours (0:00, 6:00, 12:00, 18:00)
#   - Consensus recalc:    every 12 hours (2:00, 14:00)
#   - News ingestion:      every 2 hours
#   - Article generation:  every 3 hours (offset 30 min)
#   - Game enrichment:     daily at 5:00 AM UTC
#   - Report generation:   daily at 6:00 AM UTC
#   - YouTube import:      daily at 7:00 AM UTC
#
# Usage: bash scripts/install-cron.sh
#        bash scripts/install-cron.sh --remove   (to uninstall)

set -euo pipefail

WORKDIR="/home/ubuntu/handhelddb"
LOGDIR="${WORKDIR}/logs"
TSX="$(which npx) tsx"
MARKER="# HandheldDB cron jobs"

# Create logs directory
mkdir -p "${LOGDIR}"

if [[ "${1:-}" == "--remove" ]]; then
    echo "Removing HandheldDB cron jobs..."
    crontab -l 2>/dev/null | grep -v "${MARKER}" | grep -v "cron-sync-steam" | grep -v "cron-sync-protondb" | grep -v "cron-reindex-meilisearch" | grep -v "cron-consensus" | grep -v "cron-ingest-news" | grep -v "cron-generate-articles" | grep -v "cron-enrich-games" | grep -v "cron-generate-reports" | grep -v "cron-youtube-import" | grep -v "# Steam sync:" | grep -v "# ProtonDB sync:" | grep -v "# Meilisearch reindex:" | grep -v "# Consensus recalc" | grep -v "# News ingestion:" | grep -v "# Article generation:" | grep -v "# Game enrichment:" | grep -v "# Performance report" | grep -v "# YouTube benchmark" | crontab -
    echo "Done. Cron jobs removed."
    exit 0
fi

echo "Installing HandheldDB cron jobs..."
echo "  Working directory: ${WORKDIR}"
echo "  Log directory:     ${LOGDIR}"
echo "  TSX runner:        ${TSX}"
echo ""

# Build cron entries
CRON_ENTRIES=$(cat <<EOF
${MARKER}
# Steam sync: daily at 3:00 AM UTC
0 3 * * * cd ${WORKDIR} && ${TSX} scripts/cron-sync-steam.ts >> ${LOGDIR}/cron-sync-steam.log 2>&1
# ProtonDB sync: weekly on Sunday at 4:00 AM UTC
0 4 * * 0 cd ${WORKDIR} && ${TSX} scripts/cron-sync-protondb.ts >> ${LOGDIR}/cron-sync-protondb.log 2>&1
# Meilisearch reindex: every 6 hours
0 */6 * * * cd ${WORKDIR} && ${TSX} scripts/cron-reindex-meilisearch.ts >> ${LOGDIR}/cron-reindex-meilisearch.log 2>&1
# Consensus recalculation: every 12 hours (2am and 2pm UTC)
0 2,14 * * * cd ${WORKDIR} && ${TSX} scripts/cron-consensus.ts >> ${LOGDIR}/cron-consensus.log 2>&1
# News ingestion: every 2 hours
0 */2 * * * cd ${WORKDIR} && ${TSX} scripts/cron-ingest-news.ts >> ${LOGDIR}/cron-ingest-news.log 2>&1
# Article generation: every 3 hours (offset 30 min)
30 */3 * * * cd ${WORKDIR} && ${TSX} scripts/cron-generate-articles.ts >> ${LOGDIR}/cron-generate-articles.log 2>&1
# Game enrichment: daily at 5:00 AM UTC
0 5 * * * cd ${WORKDIR} && ${TSX} scripts/cron-enrich-games.ts >> ${LOGDIR}/cron-enrich-games.log 2>&1
# Performance report generation: daily at 6:00 AM UTC
0 6 * * * cd ${WORKDIR} && ${TSX} scripts/cron-generate-reports.ts >> ${LOGDIR}/cron-generate-reports.log 2>&1
# YouTube benchmark import: daily at 7:00 AM UTC
0 7 * * * cd ${WORKDIR} && ${TSX} scripts/cron-youtube-import.ts >> ${LOGDIR}/cron-youtube-import.log 2>&1
${MARKER} END
EOF
)

# Remove any existing HandheldDB cron entries, then append new ones
EXISTING_CRON=$(crontab -l 2>/dev/null || true)

# Filter out old HandheldDB entries (both cron commands and orphaned comment lines)
CLEAN_CRON=$(echo "${EXISTING_CRON}" | grep -v "${MARKER}" | grep -v "cron-sync-steam" | grep -v "cron-sync-protondb" | grep -v "cron-reindex-meilisearch" | grep -v "cron-consensus" | grep -v "cron-ingest-news" | grep -v "cron-generate-articles" | grep -v "cron-enrich-games" | grep -v "cron-generate-reports" | grep -v "cron-youtube-import" | grep -v "# Steam sync:" | grep -v "# ProtonDB sync:" | grep -v "# Meilisearch reindex:" | grep -v "# Consensus recalc" | grep -v "# News ingestion:" | grep -v "# Article generation:" | grep -v "# Game enrichment:" | grep -v "# Performance report" | grep -v "# YouTube benchmark" || true)

# Install updated crontab
echo "${CLEAN_CRON}
${CRON_ENTRIES}" | crontab -

echo "Cron jobs installed successfully!"
echo ""
echo "Installed entries:"
crontab -l | grep -A1 "HandheldDB"
echo ""
echo "Log files will be written to: ${LOGDIR}/"
echo "  - cron-sync-steam.log"
echo "  - cron-sync-protondb.log"
echo "  - cron-reindex-meilisearch.log"
echo "  - cron-consensus.log"
echo "  - cron-ingest-news.log"
echo "  - cron-generate-articles.log"
echo "  - cron-enrich-games.log"
echo "  - cron-generate-reports.log"
echo "  - cron-youtube-import.log"
echo ""
echo "To remove: bash scripts/install-cron.sh --remove"
echo "To view logs: tail -f ${LOGDIR}/cron-*.log"
