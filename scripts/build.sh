#!/usr/bin/env bash

REPO_ROOT=$(git rev-parse --show-toplevel)

echo "Building lib"

cd $REPO_ROOT/lib
npm install && npm run build

echo "Building cli"

cd $REPO_ROOT/cli
npm install && npm run build

echo "Building web"

cd $REPO_ROOT/web
npm install && npm run build

echo "Restarting docker"

cd $REPO_ROOT/docker
docker compose down && docker compose up -d
