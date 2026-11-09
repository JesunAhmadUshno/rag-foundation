// Known-answer check for src/stats.js, run by `npm run build`, using the recorded per-question hits.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bootstrapCI, pairedBootstrap, mcnemarExact } from './stats.js';

const deep = JSON.parse(fs.readFileSync(new URL('../../results/results_deep.json', import.meta.url)));
const hits = (cat, mode) => deep.per_question.filter((q) => q.category === cat).map((q) => (q.modes[mode].top1_hit_primary ? 1 : 0));

// The bootstrap mean is the recorded top-1 accuracy, and the CI brackets it.
for (const cat of ['regression', 'paraphrase']) for (const mode of ['hybrid', 'hybrid_rerank', 'rewrite', 'hyde']) {
  const ci = bootstrapCI(hits(cat, mode));
  assert.ok(Math.abs(ci.mean - deep.summary[cat][mode].top1_accuracy) < 1e-12, `${cat} ${mode} mean`);
  assert.ok(ci.lo <= ci.mean && ci.mean <= ci.hi && ci.lo >= 0 && ci.hi <= 1, `${cat} ${mode} ci`);
}
// Seeded, so the same call twice gives the same interval.
assert.deepEqual(bootstrapCI(hits('paraphrase', 'hybrid')), bootstrapCI(hits('paraphrase', 'hybrid')));
// A constant sample has a zero-width interval.
const r = bootstrapCI(hits('paraphrase', 'rewrite'));
assert.equal(r.lo, 1); assert.equal(r.hi, 1);

// Rewrite vs hybrid on paraphrase: recorded top-1 1.000 vs 0.500, so 5 discordant questions, all
// favouring rewrite. Exact two-sided McNemar p = 2 * 0.5^5 = 0.0625.
const m = mcnemarExact(hits('paraphrase', 'rewrite'), hits('paraphrase', 'hybrid'));
assert.deepEqual([m.onlyA, m.onlyB], [5, 0]);
assert.ok(Math.abs(m.p - 0.0625) < 1e-12, `mcnemar p ${m.p}`);
// Hybrid vs rerank on regression: one discordant question (b10-pollen), p = 1.
const m2 = mcnemarExact(hits('regression', 'hybrid'), hits('regression', 'hybrid_rerank'));
assert.deepEqual([m2.onlyA, m2.onlyB, m2.p], [1, 0, 1]);
// A textbook case: 2 vs 10 discordant gives p = 2 * sum_{i<=2} C(12,i) / 2^12 = 0.0385742...
assert.ok(Math.abs(mcnemarExact([...Array(10).fill(1), 0, 0], [...Array(10).fill(0), 1, 1]).p - 158 / 4096) < 1e-12);
const d = pairedBootstrap(hits('paraphrase', 'rewrite'), hits('paraphrase', 'hybrid'));
assert.ok(Math.abs(d.mean - 0.5) < 1e-12 && d.lo > 0 && d.hi <= 1, `paired diff ${JSON.stringify(d)}`);
console.log('stats ok', { mcnemar_rewrite_vs_hybrid: m.p, paired_diff_ci: [d.lo, d.hi] });
