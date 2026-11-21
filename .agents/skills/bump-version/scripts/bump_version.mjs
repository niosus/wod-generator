import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const pkgPath = path.join(repoRoot, 'package.json');
const lockPath = path.join(repoRoot, 'package-lock.json');

const mode = process.argv[2] || 'patch';
const dryRun = process.argv.includes('--dry-run');

function computeNextVersion(current, spec) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!match) {
    throw new Error(`Unsupported current version format: "${current}"`);
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  if (spec === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (spec === 'minor') return `${major}.${minor + 1}.0`;
  if (spec === 'major') return `${major + 1}.0.0`;
  if (/^\d+\.\d+\.\d+$/.test(spec)) return spec;

  throw new Error(
    `Invalid version argument "${spec}". Use patch, minor, major, or an explicit X.Y.Z version.`
  );
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version;
const nextVersion = computeNextVersion(currentVersion, mode);

if (!dryRun) {
  pkg.version = nextVersion;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    lock.version = nextVersion;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = nextVersion;
    }
    fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  }
}

console.log(`${dryRun ? '[dry-run] ' : ''}Version: ${currentVersion} -> ${nextVersion}`);
