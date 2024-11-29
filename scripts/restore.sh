#!/usr/bin/env bash
REPO_ROOT=$(git rev-parse --show-toplevel)
BACKUP_DIR=$REPO_ROOT/backups
DATABASE_DIR=$REPO_ROOT/db

if [ -z $1 ]
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

echo "Restoring from backup file $backupFile"
gunzip -c $backupFile \
  | sqlite3 ${DATABASE_DIR}/records.db

restoreStatus=$?
if [ $restoreStatus == 0 ]
then
  echo "Restore successful"
else
  echo "Restore failed"
fi
