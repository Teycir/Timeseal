#!/bin/bash
set -e

BACKUP_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)
REMOTE="${1:-false}"

mkdir -p "$BACKUP_DIR"

echo "Starting D1 database backup..."
echo "Date: $DATE"
echo "Remote: $REMOTE"
echo ""

if [ "$REMOTE" = "true" ]; then
  FLAG="--remote"
  echo "Backing up PRODUCTION database"
else
  FLAG="--local"
  echo "Backing up LOCAL database"
fi

# Backup seals table
echo "Backing up seals table..."
npx wrangler d1 execute DB $FLAG --command="SELECT * FROM seals" > "$BACKUP_DIR/seals_$DATE.json" 2>/dev/null || echo "[]" > "$BACKUP_DIR/seals_$DATE.json"

# Backup rate_limits table
echo "Backing up rate_limits table..."
npx wrangler d1 execute DB $FLAG --command="SELECT * FROM rate_limits" > "$BACKUP_DIR/rate_limits_$DATE.json" 2>/dev/null || echo "[]" > "$BACKUP_DIR/rate_limits_$DATE.json"

# Backup nonces table
echo "Backing up nonces table..."
npx wrangler d1 execute DB $FLAG --command="SELECT * FROM nonces" > "$BACKUP_DIR/nonces_$DATE.json" 2>/dev/null || echo "[]" > "$BACKUP_DIR/nonces_$DATE.json"

# Create metadata
cat > "$BACKUP_DIR/metadata_$DATE.json" << EOF
{
  "timestamp": "$DATE",
  "remote": $REMOTE,
  "tables": ["seals", "rate_limits", "nonces"]
}
EOF

# Compress backup
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" \
  "$BACKUP_DIR/seals_$DATE.json" \
  "$BACKUP_DIR/rate_limits_$DATE.json" \
  "$BACKUP_DIR/nonces_$DATE.json" \
  "$BACKUP_DIR/metadata_$DATE.json"

# Cleanup individual files
rm "$BACKUP_DIR/seals_$DATE.json" \
   "$BACKUP_DIR/rate_limits_$DATE.json" \
   "$BACKUP_DIR/nonces_$DATE.json" \
   "$BACKUP_DIR/metadata_$DATE.json"

echo ""
echo "✓ Backup complete: $BACKUP_DIR/backup_$DATE.tar.gz"

# Cleanup old backups (keep last 30)
ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +31 | xargs -r rm
echo "✓ Cleaned up old backups (keeping last 30)"
