#!/usr/bin/env bash

REPO_ROOT=$(git rev-parse --show-toplevel)
cd $REPO_ROOT/db

BACKUP_FILE=${1:-backup.sql}
echo "Backing up database to ${BACKUP_FILE}"

sqlite3 records.db ".mode csv" ".output ${BACKUP_FILE}" ".dump"
