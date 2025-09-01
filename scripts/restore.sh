#!/bin/bash
REPO_ROOT=$(git rev-parse --show-toplevel)
cd $REPO_ROOT/docker
BACKUP_DIR=$REPO_ROOT/backups
DB_CONTAINER=db

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

echo "Restoring from Backup file $backupFile"
gunzip -c $backupFile | \
  docker compose exec -T $DB_CONTAINER /bin/bash -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mariadb -uroot "$MYSQL_DATABASE"'

restoreStatus=$?
if [ $restoreStatus == 0 ]
then
  echo "Restore successful"
else
  echo "Restore failed"
fi
