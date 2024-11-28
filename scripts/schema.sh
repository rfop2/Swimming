#!/usr/bin/env bash

REPO_ROOT=$(git rev-parse --show-toplevel)
cd $REPO_ROOT/data

SCHEMA_FILE=${1:-schema.sql}
echo "Dumping database schema to ${SCHEMA_FILE}"

sqlite3 ../db/records.db ".schema" > ${SCHEMA_FILE}
