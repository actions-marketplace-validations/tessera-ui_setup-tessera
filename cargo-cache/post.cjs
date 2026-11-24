const path = require('node:path');
const { pruneTarget } = require('./prune.cjs');
const { saveSourceMtimes } = require('./source-mtimes.cjs');

if (process.env.STATE_paths) {
  const { root, target } = JSON.parse(process.env.STATE_paths);
  const pruned = pruneTarget(path.resolve(root, target));
  console.log(`Pruned ${(pruned / 1048576).toFixed(0)} MiB of test executables and packaged outputs.`);
  saveSourceMtimes(root, target);
}
