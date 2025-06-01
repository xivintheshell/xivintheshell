set -ex

# Deploys the current branch to the beta repository. Assumes that the `beta` folder lives
# adjacent to this folder's git repo.

COMMIT_HASH=$(git rev-parse --short=8 HEAD)

sed -i 's/https:\/\/xivintheshell.com/https:\/\/beta.xivintheshell.com/' package.json
npm run build
git checkout -- package.json
pushd ../beta
git fetch
git reset --hard origin/gh-pages
rm -rf *
popd
mv build/* ../beta
cd ../beta
echo "beta.xivintheshell.com" > CNAME
git add .
git commit -m "beta update: $COMMIT_HASH"
git push
