#!/bin/bash
REPO_ROOT=$(git rev-parse --show-toplevel)
cd $REPO_ROOT/docker
if [ -s .env ]
then
  source .env
fi
BACKUP_DIR=$REPO_ROOT/backups
DB_CONTAINER=db
BACKUP_NAME="$DB_CONTAINER"
if [ ! -d $BACKUP_DIR ]
then
  echo "Can't find $BACKUP_DIR, aborting backup"
  exit -1
fi
#BACKUP_USER=$MARIADB_USER
BACKUP_USER=root

timestamp=`date +"%Y%m%d-%H%M%S"`
backupFileRoot="${BACKUP_DIR}/backup-${BACKUP_NAME}-"
backupFile="${backupFileRoot}${timestamp}.sql"
lastBackupFile=`(ls -t ${backupFileRoot}* 2>/dev/null) | head -1`
tempBackupFile="temp.sql"

dumpCmd="mariadb-dump -u$BACKUP_USER --extended-insert=1 --routines --triggers --single-transaction --quick --skip-comments"
backupCmd='MARIADB_PWD="$MARIADB_ROOT_PASSWORD"'
backupCmd+=" ${dumpCmd}"
backupCmd+=' "$MARIADB_DATABASE"'
docker compose exec -T $DB_CONTAINER /bin/bash -c "$backupCmd" > $backupFile

if [[ $lastBackupFile ]]
then
  gunzip -c $lastBackupFile > $tempBackupFile
  diff -q $backupFile $tempBackupFile > /dev/null
  diffStatus=$?
  /bin/rm $tempBackupFile
else
  # First backup so force the backup to be kept
  diffStatus=1
fi
if [ $diffStatus == 0 ]
then
  /bin/rm $backupFile
else
  [[ -t 1 ]] && echo "Backed up to ${backupFile}.gz"
  gzip $backupFile
fi

function purgeBackups {
  let minDays=30
  let minWeeks=12

  [[ -t 1 ]] && echo "Purging Backups"
  pattern=$1
  backups=`ls -r $pattern`
  let now=`date +%s`
  lastDate=''
  lastWeek=''
  for file in ${backups[*]}
  do
    date=`echo $file | rev | cut -d- -f2 | rev`
    let secs=`date -d$date +%s`
    let ageSecs=$(($now-$secs))
    let ageDays=$(($ageSecs/86400))
    let ageWeeks=$(($ageSecs/(7*86400)))
    if (( $ageDays > $minDays ))
    then
      if [[ $date == $lastDate ]]
      then
        [[ -t 1 ]] && echo "Deleting $file"
        /bin/rm -f $file
      elif (( $ageWeeks > $minWeeks ))
      then
        let week=`date -d$date +%-W`
        if [[ $week == $lastWeek ]]
        then
          [[ -t 1 ]] && echo "Deleting $file"
          /bin/rm -f $file
        fi
        let lastWeek=$week
      fi
    fi
    let lastDate=$date
  done
}

timeOfDay=`date +"%H:%M"`
if [ "$timeOfDay" == "00:00" ]
then
    purgeBackups "${backupFileRoot}*.gz"
fi
exit 0
