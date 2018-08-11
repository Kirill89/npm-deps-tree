# npm-deps-tree

Simple web application to show full tree of dependencies for specific npm package.

## Run

1. clone repo
2. `npm install`
3. `npm run client-build`
4. `npm start`
5. open http://localhost:3000/

## Author's Comments

* Most of the logic is in `server/lib/npm.js`.
* `server/lib/npm.js` is 100% covered by tests. Run `npm run test` to check.
* For cache I use [mahsan](https://www.npmjs.com/package/mahsan) - npm module written by me. It allows to cache locally or through redis.
* Vue.js is totally new for me.
