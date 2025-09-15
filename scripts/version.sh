#!/usr/bin/env bash
if [[ $1 == "" ]]
then
  echo "No version action given"
  exit -1
fi
action=$1

gitDir=`git rev-parse --show-toplevel`
cd $gitDir
cd app || die "Can't cd to app directory"
npm version $action || die "Can't update app version"
git add package*.json || die "Can't add package files to commit"

VERSION=`node -p -e "require('./package.json').version"`
CHANGELOG=public/changelog.json
npx auto-changelog -p --starting-version 3.0.0 --commit-limit false --hide-empty-releases --ignore-commit-pattern "update to version" -o $CHANGELOG -t json
git add $CHANGELOG
git commit -m "${action^} update to version $VERSION" || die "Can't commit version update"
git tag $VERSION || die "Can't commit version tag"
echo "Updated successfully to $VERSION"
exit

die() {
  echo $1
  exit -1
}
