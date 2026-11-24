const fs = require('node:fs');
const path = require('node:path');

// Tessera packaging rewrites these target subdirectories on every build.
const GENERATED = ['packages', 'xcode'];
const TEST_UNIT = /^(test|bench)-/;

function size(entry) {
  const stat = fs.lstatSync(entry);
  if (!stat.isDirectory()) return stat.size;
  return fs.readdirSync(entry).reduce((total, name) => total + size(path.join(entry, name)), 0);
}

function remove(entry) {
  let bytes;
  try {
    bytes = size(entry);
  } catch {
    return 0;
  }
  fs.rmSync(entry, { recursive: true, force: true });
  return bytes;
}

function directories(directory) {
  try {
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(directory, entry.name));
  } catch {
    return [];
  }
}

function profiles(directory, depth) {
  if (fs.existsSync(path.join(directory, '.cargo-lock'))) return [directory];
  if (depth === 0) return [];
  return directories(directory).flatMap(child => profiles(child, depth - 1));
}

// Cargo 1.100+ keeps each build unit in `build/<package>/<hash>` and names its
// fingerprint after the unit kind. Removing a test harness unit only rebuilds it.
function testUnits(profile) {
  return directories(path.join(profile, 'build'))
    .flatMap(directories)
    .filter(unit => {
      try {
        return fs.readdirSync(path.join(unit, 'fingerprint')).some(name => TEST_UNIT.test(name));
      } catch {
        return false;
      }
    });
}

function pruneTarget(target) {
  if (!fs.existsSync(target)) return 0;
  let pruned = GENERATED.reduce((total, name) => total + remove(path.join(target, name)), 0);
  for (const profile of profiles(target, 2)) {
    pruned += testUnits(profile).reduce((total, unit) => total + remove(unit), 0);
  }
  return pruned;
}

module.exports = { pruneTarget };
