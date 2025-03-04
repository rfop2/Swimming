#!/usr/bin/env bash
if [ -s .env ]
then
  source .env
fi
REPO_ROOT=$(git rev-parse --show-toplevel)
BACKUP_DIR=$REPO_ROOT/backups
DATABASE_DIR=$REPO_ROOT/db
BACKUP_NAME=db
if [ ! -d $BACKUP_DIR ]
then
  echo "Can't find $BACKUP_DIR, aborting backup"
  exit -1
fi

timestamp=`date +"%Y%m%d-%H%M%S"`
backupFileRoot="${BACKUP_DIR}/backup-${BACKUP_NAME}-"
backupFile="${backupFileRoot}${timestamp}.sql"
lastBackupFile=`(ls -t ${backupFileRoot}* 2>/dev/null) | head -1`
tempBackupFile="temp.sql"

sqlite3 ${DATABASE_DIR}/records.db ".dump" \
    | sed -E 's/CREATE TABLE( IF NOT EXISTS)? "?(\w+)"?\s+\(/DROP TABLE IF EXISTS \2;\n&/' \
    | sed -E 's/CREATE VIEW( IF NOT EXISTS)? "?(\w+)"?\s+AS/DROP VIEW IF EXISTS \2;\n&/' \
    | sed -E 's/CREATE INDEX( IF NOT EXISTS)? "?(\w+)"?\s+ON/DROP INDEX IF EXISTS \2;\n&/' \
    | sed -e 's/IF NOT EXISTS //' \
    > ${backupFile}

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
  [[ -t 1 ]] && echo "Backed up to $backupFile.gz"
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
