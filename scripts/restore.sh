#!/usr/bin/env bash

REPO_ROOT=$(git rev-parse --show-toplevel)
cd $REPO_ROOT/db

BACKUP_FILE=${1:-backup.sql}
echo "Restoring database from ${BACKUP_FILE}"

sqlite3 db/records.db < ${BACKUP_FILE}
