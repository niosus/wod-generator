#!/usr/bin/env node
/**
 * Generates Shields.io endpoint JSON files for CI-driven README badges:
 * - kinematics.json (pass/fail count from validate_kinematics.js --json)
 * - movements.json  (MOVEMENTS_DB count)
 * - benchmarks.json (CLASSICAL_BENCHMARKS count)
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CLASSICAL_BENCHMARKS } from '../../src/data/benchmarks.js';

const outDir = resolve(process.argv[2] || 'badges-out');
mkdirSync(outDir, { recursive: true });

let audit;
try {
  const stdout = execFileSync('node', ['validate_kinematics.js', '--json'], {
    encoding: 'utf8'
  });
  audit = JSON.parse(stdout);
} catch (err) {
  if (err.stdout) {
    audit = JSON.parse(err.stdout);
  } else {
    throw err;
  }
}

const benchmarksCount = Array.isArray(CLASSICAL_BENCHMARKS)
  ? CLASSICAL_BENCHMARKS.length
  : 0;

const badges = {
  'kinematics.json': {
    schemaVersion: 1,
    label: 'Kinematics Audit',
    message: audit.ok
      ? `${audit.passed}/${audit.total} Passing`
      : `${audit.passed}/${audit.total} Failing`,
    color: audit.ok ? '38bdf8' : 'ef4444',
    labelColor: '09090b',
    isError: !audit.ok
  },
  'movements.json': {
    schemaVersion: 1,
    label: 'Movements',
    message: `${audit.movements} Animated`,
    color: '0ea5e9',
    labelColor: '09090b'
  },
  'benchmarks.json': {
    schemaVersion: 1,
    label: 'Benchmarks',
    message: `${benchmarksCount} Classics`,
    color: '0284c7',
    labelColor: '09090b'
  }
};

for (const [filename, payload] of Object.entries(badges)) {
  writeFileSync(resolve(outDir, filename), JSON.stringify(payload, null, 2) + '\n');
}

console.log(`Generated badge JSONs in ${outDir}:`, Object.fromEntries(
  Object.entries(badges).map(([k, v]) => [k, v.message])
));
