#!/usr/bin/env bash

REPO_ROOT=$(git rev-parse --show-toplevel)

echo "Building lib"

cd $REPO_ROOT/lib
npm ci && npm run build

echo "Building cli"

cd $REPO_ROOT/cli
npm ci && npm run build

echo "Running database migrations"
npm run migrate

echo "Building web"

cd $REPO_ROOT/web
npm ci && npm run build

cd $REPO_ROOT/docker

echo "Rebuilding docker container"
docker compose build

echo "Restarting docker"
docker compose down && docker compose up -d
