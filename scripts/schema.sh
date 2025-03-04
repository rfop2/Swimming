#!/usr/bin/env bash

REPO_ROOT=$(git rev-parse --show-toplevel)
cd $REPO_ROOT/data

SCHEMA_FILE=${1:-schema.sql}
echo "Dumping database schema to ${SCHEMA_FILE}"

sqlite3 ../db/records.db ".schema" \
    | sed -E 's/CREATE TABLE( IF NOT EXISTS)? "?(\w+)"?\s+\(/DROP TABLE IF EXISTS \2;\n&/' \
    | sed -E 's/CREATE VIEW( IF NOT EXISTS)? "?(\w+)"?\s+AS/DROP VIEW IF EXISTS \2;\n&/' \
    | sed -E 's/CREATE INDEX( IF NOT EXISTS)? "?(\w+)"?\s+ON/DROP INDEX IF EXISTS \2;\n&/' \
    | sed -e 's/IF NOT EXISTS //' \
    > ${SCHEMA_FILE}
