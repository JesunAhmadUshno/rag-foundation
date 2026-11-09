// Parity gate, run by `npm run build`: the in-browser port must reproduce the repo's
// recorded results exactly (every mode's ranked_docs, traces and summary metrics).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createPipeline, runEvaluation, MODES, vocabOverlap, leaveOwnKeysOut } from './rag.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const repo = read('./data/repo.json');
const deep = read('../../results/results_deep.json');
const build = read('../../results/results_build.json');
const questions = read('../../experiments/questions_deep.json');

const pipe = createPipeline(repo);
assert.equal(pipe.chunks.length, deep.chunks, 'chunk count');
assert.equal(repo.documents.length, deep.documents, 'document count');

const { per, summary } = runEvaluation(pipe, questions);
for (const row of deep.per_question) {
  const mine = per.find((r) => r.id === row.id);
  for (const m of MODES) assert.deepEqual(mine.docs[m], row.modes[m].ranked_docs, `${row.id} ${m} ranked_docs`);
  const { trace } = pipe.rankings(row.question);
  assert.deepEqual(trace, row.trace, `${row.id} trace`);
}
for (const cat of Object.keys(summary)) for (const m of MODES) {
  const want = { ...deep.summary[cat][m] }, got = summary[cat][m];
  for (const k of Object.keys(want)) assert.ok(Math.abs(got[k] - want[k]) < 1e-12, `${cat} ${m} ${k}: ${got[k]} vs ${want[k]}`);
}
for (const row of build.per_question) {
  const { docs } = pipe.rankings(questions.find((q) => q.id === row.id).question, { deep: false });
  for (const m of ['bm25', 'vector', 'hybrid', 'hybrid_rerank']) assert.deepEqual(docs[m], row[m].ranked_docs, `build ${row.id} ${m}`);
}
// The Build demo query printed by `python src/run_build.py` (answer, citation and stage scores).
const dq = 'How many books can members borrow from the Northlight library?';
const ds = pipe.rankings(dq, { deep: false }).stages;
const demo = pipe.answer(dq, ds.hybrid_rerank);
assert.equal(demo.map((d) => d.sentence).join(' '), 'Members can borrow up to ten books for three weeks and renew each loan once online.');
assert.equal(demo[0].chunkId, 'northlight-loans-c0');
assert.deepEqual(ds.bm25.slice(0, 3).map((h) => [h.chunk.id, h.score.toFixed(4)]), [['northlight-loans-c0', '10.2225'], ['northlight-events-c0', '7.1687'], ['northlight-hours-c0', '6.3257']]);
assert.deepEqual(ds.vector.slice(0, 3).map((h) => h.score.toFixed(4)), ['0.3095', '0.2376', '0.1921']);

// Vocabulary overlap heatmap: must equal the same count made with the Python tokeniser.
const py = JSON.parse(execFileSync('python3', ['-c', `
import json, sys; sys.path.insert(0, 'src')
from corpus import DOCUMENTS; from pipeline import content_tokens
s = [set(content_tokens(d["text"])) for d in DOCUMENTS]
print(json.dumps([[len(a & b) for b in s] for a in s]))`], { cwd: new URL('../..', import.meta.url) }).toString());
assert.deepEqual(vocabOverlap(pipe, repo.documents), py, 'vocab overlap');

// Leakage probe: with the full table every paraphrase question is rank 1 (as recorded), and the
// hybrid column equals the recorded hybrid rank.
const para = questions.filter((q) => q.category === 'paraphrase').map((q) => q.id);
const probe = leaveOwnKeysOut(pipe, questions, para);
console.log(`leakage probe: rewrite without own keys reaches rank 1 on ${probe.filter((r) => r.without === 1).length} of ${probe.length} paraphrase questions`);
for (const r of probe) {
  const rec = deep.per_question.find((q) => q.id === r.id).modes;
  assert.equal(r.full, rec.rewrite.ranks_of_expected[0], `${r.id} full`);
  assert.equal(r.hybrid, rec.hybrid.ranks_of_expected[0], `${r.id} hybrid`);
}

// Sensitivity lab at the repo defaults is the recorded run (checked above); a changed setting must
// still produce valid metrics.
const alt = runEvaluation(createPipeline(repo, { chunkSize: 60, overlap: 15, k1: 1.2, b: 0.5, rrfK: 20, rerankDepth: 4 }), questions);
for (const cat of Object.keys(alt.summary)) for (const m of MODES) for (const v of Object.values(alt.summary[cat][m])) assert.ok(v >= 0 && v <= alt.per.length);
console.log(`rag parity ok: ${deep.per_question.length} questions x ${MODES.length} modes, ${build.per_question.length} build questions, traces and summaries match`);
