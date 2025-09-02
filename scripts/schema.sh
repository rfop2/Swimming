#!/bin/bash
REPO_ROOT=$(git rev-parse --show-toplevel)
cd $REPO_ROOT/docker
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
docker compose exec -T db bash -c 'exec mariadb-dump -u root -p"$MARIADB_ROOT_PASSWORD" --databases "$MARIADB_DATABASE" --add-drop-database --no-data --routines --triggers -r /dev/stdout | sed -E -e "s/ AUTO_INCREMENT=[0-9]+//g"' > $SCHEMA_FILE
