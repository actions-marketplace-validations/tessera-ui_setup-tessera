const fs = require('node:fs');
const path = require('node:path');

// Tessera packaging rewrites these target subdirectories on every build.
const GENERATED = ['packages', 'xcode'];
const HASHED = /^(.+)-[0-9a-f]{16}$/;
const EXECUTABLE = process.platform === 'win32' ? '.exe' : '';

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

function profiles(directory, depth) {
  if (fs.existsSync(path.join(directory, '.fingerprint')) && fs.existsSync(path.join(directory, 'deps'))) {
    return [directory];
  }
  if (depth === 0) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(entry => profiles(path.join(directory, entry.name), depth - 1));
}

function testExecutables(profile) {
  const uplifted = new Map(fs.readdirSync(profile, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => [entry.name.replaceAll('-', '_'), fs.statSync(path.join(profile, entry.name)).size]));
  const deps = path.join(profile, 'deps');
  return fs.readdirSync(deps, { withFileTypes: true }).flatMap(entry => {
    if (!entry.isFile() || path.extname(entry.name) !== EXECUTABLE) return [];
    const stem = entry.name.slice(0, entry.name.length - EXECUTABLE.length);
    const crate = HASHED.exec(stem)?.[1];
    if (!crate) return [];
    const stat = fs.statSync(path.join(deps, entry.name));
    if (!EXECUTABLE && !(stat.mode & 0o111)) return [];
    // Binary targets are uplifted beside `deps`; test harnesses never are.
    if (uplifted.get(crate + EXECUTABLE) === stat.size) return [];
    return [entry.name, `${stem}.pdb`, `${stem}.dSYM`].map(name => path.join(deps, name));
  });
}

function pruneTarget(target) {
  if (!fs.existsSync(target)) return 0;
  let pruned = GENERATED.reduce((total, name) => total + remove(path.join(target, name)), 0);
  for (const profile of profiles(target, 2)) {
    pruned += testExecutables(profile).reduce((total, entry) => total + remove(entry), 0);
  }
  return pruned;
}

module.exports = { pruneTarget };
