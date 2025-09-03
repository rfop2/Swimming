#!/bin/bash
set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
cd $REPO_ROOT/docker
if [ -s .env ]
then
  source .env
fi

DB_CONTAINER=db

SCHEMA_FILE="$REPO_ROOT/data/schema.sql"
if (( $# > 0 ))
then
    SCHEMA_FILE=$1
fi
if [ ! -f docker-compose.yml ]
then
    echo "Error, this script must be run from a docker directory"
    exit -1
fi
echo "Dumping schema file"

# Generate a random path inside the container for safety
REMOTE_CNF="/tmp/mydump-$$.cnf"

cleanup() {
  docker compose exec -T "$DB_CONTAINER" rm -f "$REMOTE_CNF" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

dbCmd="mariadb-dump --defaults-extra-file=$REMOTE_CNF dbCmd+="--databases '$MARIADB_DATABASE' --add-drop-database --no-data --routines --triggers -r /dev/stdout"
dbCmd+=' | sed -E -e "s/ AUTO_INCREMENT=[0-9]+//g"'
docker compose exec -T db /bin/bash -c $dbCmd > $SCHEMA_FILE

cleanup
