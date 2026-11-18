import { MOVEMENTS_DB } from '../../../../src/data/index.js';
import { MOVEMENT_NAME_TOKENS } from '../../../../src/generator/workout-generator.js';

const ids = new Set(MOVEMENTS_DB.map((m) => m.id));
const brokenRefs = [];
const missingTokens = [];

for (const m of MOVEMENTS_DB) {
  if (m.scaleDownId && !ids.has(m.scaleDownId)) {
    brokenRefs.push(`${m.id} -> scaleDownId: ${m.scaleDownId}`);
  }
  for (const fc of m.fallbackCandidates || []) {
    if (!ids.has(fc)) {
      brokenRefs.push(`${m.id} -> fallbackCandidate: ${fc}`);
    }
  }
  if (!MOVEMENT_NAME_TOKENS[m.id]) {
    missingTokens.push(m.id);
  }
}

console.log(`Movements in MOVEMENTS_DB: ${MOVEMENTS_DB.length}`);
console.log(`Broken refs: ${brokenRefs.length}`);
if (brokenRefs.length) console.log(brokenRefs.join('\n'));
console.log(`Missing MOVEMENT_NAME_TOKENS: ${missingTokens.length}`);
if (missingTokens.length) console.log(missingTokens.join('\n'));

if (brokenRefs.length > 0 || missingTokens.length > 0) {
  process.exitCode = 1;
}
