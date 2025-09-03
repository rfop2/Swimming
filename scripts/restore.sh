#!/bin/bash
set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
cd $REPO_ROOT/docker
if [ -s .env ]
then
  source .env
fi

BACKUP_DIR=$REPO_ROOT/backups
DB_CONTAINER=db

if [ $# -eq 0 ]
then
  echo "No backup file specified, aborting"
  exit -1
fi

backupFile=$1
if [ ! -f $backupFile ]
then
  echo "Backup file $backupFile not found or not valid, aborting"
  exit -1
fi

echo "Restoring from Backup file $backupFile"

# Generate a random path inside the container for safety
REMOTE_CNF="/tmp/mydump-$$.cnf"

cleanup() {
  docker compose exec -T "$DB_CONTAINER" rm -f "$REMOTE_CNF" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker compose exec -T "$DB_CONTAINER" /bin/bash -c "umask 077 && cat > '$REMOTE_CNF'" <<EOF
[client]
user=root
password=$MARIADB_ROOT_PASSWORD
EOF

gunzip -c $backupFile | \
  docker compose exec -T $DB_CONTAINER /bin/bash -c "mariadb --defaults-extra-file=$REMOTE_CNF $MARIADB_DATABASE"
cleanup

restoreStatus=$?
if [ $restoreStatus == 0 ]
then
  echo "Restore successful"
else
  echo "Restore failed"
fi
