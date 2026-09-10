set -ex

# Deploys the current branch to the OC repository. Assumes that the `occultcrescent` folder lives
# adjacent to this folder's git repo.

COMMIT_HASH=$(git rev-parse --short=8 HEAD)

sed -i 's/https:\/\/xivintheshell.com/https:\/\/oc.xivintheshell.com/' package.json
npm run build
git checkout -- package.json
pushd ../occultcrescent
git fetch
git reset --hard origin/gh-pages
rm -rf *
popd
mv build/* ../occultcrescent
cd ../occultcrescent
echo "oc.xivintheshell.com" > CNAME
git add .
git commit -m "oc update: $COMMIT_HASH"
git push
