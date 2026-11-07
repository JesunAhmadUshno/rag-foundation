import { useMemo, useState, useDeferredValue, useId } from 'react';
import { repo, deep, build, questions, pipe, C, f3, MODE_LABEL, CAT_LABEL, expectedOf, Range, Recorded, RECORDED } from './common.jsx';
import { createPipeline, runEvaluation, leaveOwnKeysOut, MODES, CATEGORIES } from './rag.js';
import { bootstrapCI, pairedBootstrap, mcnemarExact } from './stats.js';

const byId = Object.fromEntries(deep.per_question.map((q) => [q.id, q]));
const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/* ---------- Query playground ---------- */
export function Playground({ query, setQuery }) {
  const listId = useId();
  const labelled = questions.find((q) => q.question === query);
  const expected = labelled ? expectedOf(labelled) : [];
  const r = useMemo(() => pipe.rankings(query), [query]);
  const ans = useMemo(() => pipe.answer(query, r.stages.hybrid_rerank), [query, r]);
  const bmById = new Map(r.stages.bm25.map((h, i) => [h.chunk.id, [h.score, i + 1]]));
  const vecById = new Map(r.stages.vector.map((h, i) => [h.chunk.id, [h.score, i + 1]]));
  const terms = pipe.tok(query);
  return (
    <section id="playground" className="card window reveal" data-title="query.py — live retrieval">
      <div className="head">
        <div>
          <p className="eyebrow">Query playground</p>
          <h2>Ask the corpus. Watch every mode rank it.</h2>
          <p className="sub">
            This is the repo’s pipeline running in your browser: the same tokeniser, chunker, BM25, TF-IDF cosine, reciprocal rank fusion, reranker,
            rewrite table, lexical HyDE and multi-hop, ported line for line. The build fails unless the port reproduces every ranking in <code>results_deep.json</code>.
          </p>
        </div>
        <Recorded live />
      </div>
      <div className="controls" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }}>
        <div className="field">
          <label htmlFor={listId + 'q'}>Question <span>{terms.length} content terms</span></label>
          <input id={listId + 'q'} type="text" className="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type any question" />
        </div>
        <div className="field">
          <label htmlFor={listId + 's'}>Or pick one of {questions.length} labelled questions</label>
          <select id={listId + 's'} value={labelled?.id || ''} onChange={(e) => setQuery(questions.find((q) => q.id === e.target.value)?.question || query)}>
            <option value="">Custom question</option>
            {CATEGORIES.map((c) => (
              <optgroup key={c} label={CAT_LABEL[c]}>
                {questions.filter((q) => q.category === c).map((q) => <option key={q.id} value={q.id}>{q.id}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      <p className="hint" style={{ marginTop: 0 }}>
        Tokens after stopwords and the trailing-s stem: {terms.length ? terms.map((t, i) => <code key={i} className="chip">{t}</code>) : 'none'}
        {labelled && <> · expected: <b>{expected.join(', ')}</b> ({CAT_LABEL[labelled.category]})</>}
      </p>

      <div className="answer">
        <p className="eyebrow">Extractive answer (Build pipeline, reranked top 3)</p>
        {ans.length ? ans.map((a) => (
          <p key={a.chunkId}>“{a.sentence}” <span className="cite">[{a.docId}:{a.chunkId}]</span> <span className="hint">sentence coverage {f3(a.coverage)}</span></p>
        )) : <p className="hint">No chunk shares a content term with this question, so nothing is returned. Nothing is ever generated.</p>}
      </div>

      <div className="modes">
        {MODES.map((m) => {
          const docs = r.docs[m];
          const rank = expected.length ? docs.indexOf(expected[0]) + 1 : 0;
          return (
            <div className="mode" key={m}>
              <div className="mode-h"><b>{MODE_LABEL[m]}</b>{expected.length > 0 && <span className={`pill ${rank === 1 ? 'good' : rank ? 'warn' : 'bad'}`}>{rank ? `rank ${rank}` : 'absent'}</span>}</div>
              <ol>
                {docs.slice(0, 5).map((d) => <li key={d} className={expected.includes(d) ? 'hit' : ''}>{d}</li>)}
                {!docs.length && <li className="hint">no document scored above zero</li>}
              </ol>
            </div>
          );
        })}
      </div>

      <h3 style={{ marginTop: 20 }}>Per-stage scores for the reranked top chunks</h3>
      <div className="scroll-x">
        <table>
          <thead><tr><th>Final</th><th>Chunk</th><th>BM25 (rank)</th><th>Cosine (rank)</th><th>Fused 1/({C.RRF_K}+r)</th><th>Coverage</th><th>F1</th></tr></thead>
          <tbody>
            {r.stages.hybrid_rerank.slice(0, 6).map((e, i) => {
              const bm = bmById.get(e.chunk.id), ve = vecById.get(e.chunk.id);
              return (
                <tr key={e.chunk.id} className={expected.includes(e.chunk.docId) ? 'row-hit' : ''}>
                  <td>{i + 1}{i >= C.RERANK_DEPTH ? '*' : ''}</td><td className="mono">{e.chunk.id}</td>
                  <td>{bm ? `${bm[0].toFixed(3)} (${bm[1]})` : '–'}</td><td>{ve ? `${ve[0].toFixed(3)} (${ve[1]})` : '–'}</td>
                  <td>{e.score.toFixed(4)}</td><td>{f3(e.coverage)}</td><td>{f3(e.f1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Trace trace={r.trace} />
    </section>
  );
}

function Trace({ trace }) {
  return (
    <div className="grid3" style={{ marginTop: 16 }}>
      <div className="tile">
        <h3>Rewrite</h3>
        <p className="hint">{trace.expansions.length ? trace.expansions.map((e) => <span key={e.token}><code className="chip">{e.token}</code>→ {e.terms.join(', ')} </span>) : 'No expansion key fired, so rewrite equals hybrid.'}</p>
      </div>
      <div className="tile">
        <h3>Hypothetical document</h3>
        <p className="hint mono-s">{trace.hyde_document || 'empty: no query term occurs in the corpus'}</p>
      </div>
      <div className="tile">
        <h3>Multi-hop</h3>
        <p className="hint">Anchor <b>{trace.multihop.anchor_doc || '–'}</b>. Bridge terms: {trace.multihop.bridge_terms.join(', ') || 'none'}.<br />Hop 2 top 5: {trace.multihop.hop2_top_docs.join(', ') || '–'}</p>
      </div>
    </div>
  );
}

/* ---------- Recorded ablation with live uncertainty ---------- */
const perQ = (cat, mode, metric) => deep.per_question.filter((q) => q.category === cat).map((q) => {
  const d = q.modes[mode].ranked_docs, e = q.expected_docs, k = d.indexOf(e[0]);
  if (metric === 'top1_accuracy') return d[0] === e[0] ? 1 : 0;
  if (metric === 'recall_at_3') return k >= 0 && k < 3 ? 1 : 0;
  if (metric === 'mrr') return k >= 0 ? 1 / (k + 1) : 0;
  const n = metric === 'pair_at_3' ? 3 : 5;
  return e.every((x) => d.slice(0, n).includes(x)) ? 1 : 0;
});
const METRICS = { top1_accuracy: 'Top-1', recall_at_3: 'Recall@3', mrr: 'MRR', pair_at_3: 'Pair@3', pair_at_5: 'Pair@5' };

export function Ablation() {
  const [cat, setCat] = useState('paraphrase');
  const [metric, setMetric] = useState('top1_accuracy');
  const metrics = Object.keys(METRICS).filter((m) => cat === 'multihop' || !m.startsWith('pair'));
  const met = metrics.includes(metric) ? metric : 'top1_accuracy';
  const n = deep.category_counts[cat];
  const hits = (c, m) => perQ(c, m, 'top1_accuracy');
  const t1 = mcnemarExact(hits('paraphrase', 'rewrite'), hits('paraphrase', 'hybrid'));
  const d1 = pairedBootstrap(hits('paraphrase', 'rewrite'), hits('paraphrase', 'hybrid'));
  const t2 = mcnemarExact(hits('regression', 'hybrid'), hits('regression', 'hybrid_rerank'));
  const t3 = mcnemarExact(hits('paraphrase', 'hyde'), hits('paraphrase', 'hybrid'));
  const bs = build.summary;
  return (
    <section id="ablation" className="card window reveal" data-title="results_deep.json — ablation">
      <div className="head">
        <div>
          <p className="eyebrow">Ablation tables</p>
          <h2>Rewriting closes the paraphrase gap. The reranker <em>costs</em> a question.</h2>
          <p className="sub">
            Recorded metrics for {MODES.length} modes on {deep.questions} labelled questions over {deep.documents} documents and {deep.chunks} chunks.
            The bars are the repo’s numbers. The 95% intervals are new: a seeded percentile bootstrap over the recorded per-question outcomes, computed here.
            With n = {n}, intervals are wide, and the page says so rather than hiding it.
          </p>
        </div>
        <Recorded />
      </div>
      <div className="actions" style={{ marginTop: 0, marginBottom: 16 }}>
        <div className="seg" role="group" aria-label="Question category">
          {CATEGORIES.map((c) => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>{CAT_LABEL[c]} · {deep.category_counts[c]}</button>)}
        </div>
        <div className="seg" role="group" aria-label="Metric">
          {metrics.map((m) => <button key={m} aria-pressed={met === m} onClick={() => setMetric(m)}>{METRICS[m]}</button>)}
        </div>
      </div>
      <div className="bars">
        {MODES.map((m) => {
          const v = deep.summary[cat][m][met];
          const ci = bootstrapCI(perQ(cat, m, met));
          return (
            <div className="bar-row" key={m}>
              <div className="lab"><span>{MODE_LABEL[m]}</span><b>{f3(v)}</b></div>
              <div className="track">
                <div className="ci" style={{ left: `${ci.lo * 100}%`, width: `${(ci.hi - ci.lo) * 100}%` }} />
                <div className="fill" style={{ width: `${v * 100}%`, background: v === 1 ? 'var(--good)' : v >= 0.75 ? 'var(--primary)' : 'var(--warn)' }} />
              </div>
              <div className="hint">bootstrap 95% CI {f3(ci.lo)} to {f3(ci.hi)}</div>
            </div>
          );
        })}
      </div>
      <h3 style={{ marginTop: 24 }}>Paired tests on the recorded per-question outcomes (top-1)</h3>
      <div className="grid3" style={{ marginTop: 12 }}>
        <div className="tile"><div className="num">p = {t1.p.toFixed(4)}</div><div className="cap">Rewrite vs hybrid, paraphrase (n {deep.category_counts.paraphrase}): {t1.onlyA} wins, {t1.onlyB} losses, exact McNemar. Paired difference {f3(d1.mean)}, bootstrap CI {f3(d1.lo)} to {f3(d1.hi)}. Large, but not significant at 0.05 with this n.</div></div>
        <div className="tile"><div className="num">p = {t2.p.toFixed(4)}</div><div className="cap">Hybrid vs hybrid + rerank, regression (n {deep.category_counts.regression}): {t2.onlyA} question differs (b10-pollen). The loss is real and named, but one question cannot show a rate.</div></div>
        <div className="tile"><div className="num">p = {t3.p.toFixed(4)}</div><div className="cap">HyDE vs hybrid, paraphrase: {t3.onlyA} wins, {t3.onlyB} losses. No evidence the lexical HyDE helps.</div></div>
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        Build ablation in <code>results_build.json</code> ({build.questions} questions): top-1 BM25 {f3(bs.bm25.top1_accuracy)}, vector {f3(bs.vector.top1_accuracy)}, hybrid {f3(bs.hybrid.top1_accuracy)}, hybrid + rerank {f3(bs.hybrid_rerank.top1_accuracy)}; MRR for rerank {f3(bs.hybrid_rerank.mrr)}.
        These are the same {build.questions} questions as the regression category above. Regression and multi-hop sit at the ceiling for most modes, so they cannot separate methods.
      </p>
    </section>
  );
}

/* ---------- Per-question explorer ---------- */
export function Explorer({ setQuery }) {
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState('p01-condensation');
  const rows = deep.per_question.filter((q) => cat === 'all' || q.category === cat);
  const sel = byId[open];
  const selId = useId();
  return (
    <section id="explorer" className="card window reveal" data-title="per_question.tsv — 42 rows">
      <div className="head">
        <div>
          <p className="eyebrow">Per-question explorer</p>
          <h2>Every question, every mode, the rank of the expected document.</h2>
          <p className="sub">Cells show where the expected document landed (multi-hop: both documents). “–” means it was never retrieved. Pick a row to open its recorded trace.</p>
        </div>
        <Recorded />
      </div>
      <div className="controls" style={{ gridTemplateColumns: 'minmax(0, 260px)' }}>
        <div className="field"><label htmlFor={selId}>Category</label>
          <select id={selId} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">All {deep.questions}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c]} ({deep.category_counts[c]})</option>)}
          </select>
        </div>
      </div>
      <div className="scroll-x tall">
        <table className="grid-table">
          <thead><tr><th>Question</th><th>Expected</th>{MODES.map((m) => <th key={m}>{MODE_LABEL[m]}</th>)}</tr></thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.id} className={open === q.id ? 'row-sel' : ''}>
                <td><button className="linkish" onClick={() => setOpen(q.id)} aria-pressed={open === q.id}>{q.id}</button></td>
                <td className="mono">{q.expected_docs.join(', ')}</td>
                {MODES.map((m) => {
                  const ranks = q.modes[m].ranks_of_expected;
                  return <td key={m} className={ranks[0] === 1 ? 'ok' : ranks[0] ? '' : 'no'}>{ranks.map((x) => x ?? '–').join(', ')}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sel && (
        <div className="drawer">
          <div className="head" style={{ marginBottom: 8 }}>
            <div><p className="eyebrow">{sel.id} · {CAT_LABEL[sel.category]}</p><h3>{sel.question}</h3></div>
            <button className="btn ghost" onClick={() => { setQuery(sel.question); go('playground'); }}>Replay live in the playground</button>
          </div>
          <Trace trace={sel.trace} />
          <p className="hint">Combined mode anchor <b>{sel.trace.combined.anchor_doc}</b>, hop 1 top 5: {sel.trace.combined.hop1_top_docs.join(', ')}. Expanded query: “{sel.trace.expanded_query}”</p>
        </div>
      )}
    </section>
  );
}

/* ---------- Case files ---------- */
export function Cases({ setQuery }) {
  const q = (id) => questions.find((x) => x.id === id);
  const b10 = q('b10-pollen');
  const b10r = useMemo(() => pipe.rankings(b10.question, { deep: false }).stages, [b10]);
  const rr = b10r.hybrid_rerank.slice(0, 2);
  const leak = useMemo(() => leaveOwnKeysOut(pipe, questions, questions.filter((x) => x.category === 'paraphrase').map((x) => x.id)), []);
  const leakTop1 = leak.filter((r) => r.without === 1).length;
  const rank = (id, m) => byId[id].modes[m].ranks_of_expected;
  const replay = (id) => { setQuery(q(id).question); go('playground'); };
  const cases = [
    {
      id: 'b10-pollen', t: 'The reranker demotes the right answer',
      d: <>Hybrid ranks <b>{byId['b10-pollen'].modes.hybrid.top1_doc}</b> first; hybrid + rerank ranks <b>{byId['b10-pollen'].modes.hybrid_rerank.top1_doc}</b> first. Live, the two reranked leaders tie on coverage ({f3(rr[0].coverage)} vs {f3(rr[1].coverage)}) and F1 breaks the tie: {rr[0].chunk.id} {f3(rr[0].f1)} against {rr[1].chunk.id} {f3(rr[1].f1)}. A shorter chunk wins on precision, not relevance.</>,
    },
    {
      id: 'p01-condensation', t: 'Absent from every Build ranking', also: 'p03-rumble',
      d: <>For p01 and p03 no Build mode retrieves the expected document at any rank (hybrid: {rank('p01-condensation', 'hybrid')[0] ?? '–'}, {rank('p03-rumble', 'hybrid')[0] ?? '–'}). Rewrite places it at rank {rank('p01-condensation', 'rewrite')[0]} and {rank('p03-rumble', 'rewrite')[0]}. The lexical HyDE cannot: its document for p03 was “{byId['p03-rumble'].trace.hyde_document}”.</>,
    },
    {
      id: 'b06-books-count', t: 'HyDE pulls in a sibling', also: 'b23-loan-weeks',
      d: <>The hypothetical document borrows Northlight events vocabulary, so HyDE ranks <b>{byId['b06-books-count'].modes.hyde.top1_doc}</b> first on b06 and <b>{byId['b23-loan-weeks'].modes.hyde.top1_doc}</b> on b23, with the expected document at rank {rank('b06-books-count', 'hyde')[0]} and {rank('b23-loan-weeks', 'hyde')[0]}.</>,
    },
    {
      id: 'm05-glucose-seeds', t: 'Hop 2 misses the second document', also: 'm08-salmon-waters',
      d: <>On m05 the anchor is {byId['m05-glucose-seeds'].trace.multihop.anchor_doc} and hop 2 returns {byId['m05-glucose-seeds'].trace.multihop.hop2_top_docs.slice(0, 3).join(', ')}: no seed-dispersal. On m08 hop 2 returns {byId['m08-salmon-waters'].trace.multihop.hop2_top_docs.slice(0, 3).join(', ')}. The final ranking still holds both documents because hop 1 had them already.</>,
    },
  ];
  return (
    <section id="cases" className="card window reveal" data-title="b10-pollen.case — failure modes">
      <p className="eyebrow">Case files</p>
      <h2>The failures, kept on the record and replayable.</h2>
      <div className="grid2" style={{ marginTop: 16 }}>
        {cases.map((c) => (
          <div className="tile case" key={c.id}>
            <div className="head" style={{ marginBottom: 6 }}><h3>{c.t}</h3><span className="mono">{c.id}{c.also ? ` · ${c.also}` : ''}</span></div>
            <p className="hint" style={{ margin: 0 }}>{c.d}</p>
            <div className="actions" style={{ marginTop: 10 }}>
              <button className="btn ghost sm" onClick={() => replay(c.id)}>Replay {c.id}</button>
              {c.also && <button className="btn ghost sm" onClick={() => replay(c.also)}>Replay {c.also}</button>}
            </div>
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 24 }}>Leakage probe: how much of the rewrite gain is the table?</h3>
      <p className="sub" style={{ marginTop: 6 }}>
        The expansion table was written alongside the paraphrase questions. For each one, this drops the keys that fire for that question and no other of the {questions.length},
        then reruns rewrite live. Without its own keys, rewrite gets {leakTop1} of {leak.length} paraphrase questions to rank 1, against {leak.filter((r) => r.full === 1).length} with the full table.
        The gain depends on table coverage; it is not evidence of general paraphrase robustness.
      </p>
      <div className="scroll-x" style={{ marginTop: 12 }}>
        <table>
          <thead><tr><th>Question</th><th>Keys fired</th><th>Only this question’s</th><th>Hybrid rank</th><th>Rewrite rank</th><th>Rewrite without own keys</th></tr></thead>
          <tbody>
            {leak.map((r) => (
              <tr key={r.id}><td className="mono">{r.id}</td><td>{r.fired.join(', ')}</td><td>{r.own.length} of {r.fired.length}</td>
                <td className={r.hybrid === 1 ? 'ok' : 'no'}>{r.hybrid ?? '–'}</td><td className={r.full === 1 ? 'ok' : 'no'}>{r.full ?? '–'}</td><td className={r.without === 1 ? 'ok' : 'no'}>{r.without ?? '–'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- Sensitivity lab ---------- */
const DEFAULTS = { chunkSize: C.CHUNK_SIZE, overlap: C.OVERLAP, k1: C.K1, b: C.B, rrfK: C.RRF_K, rerankDepth: C.RERANK_DEPTH };
const SIZES = Array.from({ length: 13 }, (_, i) => 20 + i * 5);

export function Sweep() {
  const [p, setP] = useState(DEFAULTS);
  const dp = useDeferredValue(p);
  const set = (k) => (v) => setP((s) => {
    const n = { ...s, [k]: v };
    if (n.overlap >= n.chunkSize) n.overlap = n.chunkSize - 5;
    return n;
  });
  const res = useMemo(() => { const pp = createPipeline(repo, dp); return { ...runEvaluation(pp, questions), chunks: pp.chunks.length }; }, [dp]);
  const curve = useMemo(() => SIZES.map((s) => {
    const sum = runEvaluation(createPipeline(repo, { ...dp, chunkSize: s, overlap: Math.min(dp.overlap, s - 5) }), questions, ['hybrid', 'hybrid_rerank', 'rewrite']).summary;
    return { s, hybrid: sum.paraphrase.hybrid.top1_accuracy, rerank: sum.paraphrase.hybrid_rerank.top1_accuracy, rewrite: sum.paraphrase.rewrite.top1_accuracy };
  }), [dp.overlap, dp.k1, dp.b, dp.rrfK, dp.rerankDepth]); // eslint-disable-line react-hooks/exhaustive-deps
  const isDefault = Object.keys(DEFAULTS).every((k) => p[k] === DEFAULTS[k]);
  const cols = [['regression', 'top1_accuracy', 'Regression top-1'], ['paraphrase', 'top1_accuracy', 'Paraphrase top-1'], ['paraphrase', 'mrr', 'Paraphrase MRR'], ['multihop', 'pair_at_3', 'Multi-hop pair@3']];
  const W = 460, H = 220, pad = { l: 36, r: 12, t: 12, b: 26 };
  const x = (s) => pad.l + ((s - SIZES[0]) / (SIZES.at(-1) - SIZES[0])) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - v) * (H - pad.t - pad.b);
  const series = [['rewrite', 'var(--good)', 'Rewrite'], ['hybrid', 'var(--primary)', 'Hybrid'], ['rerank', 'var(--warn)', 'Hybrid + rerank']];
  return (
    <section id="sweep" className="card window reveal" data-title="sweep.py — sensitivity lab">
      <div className="head">
        <div>
          <p className="eyebrow">Sensitivity lab</p>
          <h2>The defaults were never varied. <em>Vary them.</em></h2>
          <p className="sub">
            Every slider rebuilds the index and reruns all {questions.length} questions in all {MODES.length} modes, in your browser, on the repo corpus.
            These are new exploratory numbers, not recorded results: the repo’s runs used only the defaults (chunk {C.CHUNK_SIZE} words, overlap {C.OVERLAP}, k1 {C.K1}, b {C.B}, RRF k {C.RRF_K}, rerank depth {C.RERANK_DEPTH}).
            At the defaults, the table equals the recorded run exactly (checked at build time).
          </p>
        </div>
        <span className={`pill ${isDefault ? 'good' : 'info'}`}>● {isDefault ? 'Repo defaults: matches recorded' : 'Live exploration, not a recorded result'}</span>
      </div>
      <div className="controls">
        <Range label="Chunk size (words)" value={p.chunkSize} min={15} max={80} step={5} onChange={set('chunkSize')} show={p.chunkSize} />
        <Range label="Overlap (words)" value={p.overlap} min={0} max={p.chunkSize - 5} step={5} onChange={set('overlap')} show={p.overlap} />
        <Range label="BM25 k1" value={p.k1} min={0.1} max={3} step={0.1} onChange={set('k1')} show={p.k1.toFixed(1)} />
        <Range label="BM25 b" value={p.b} min={0} max={1} step={0.05} onChange={set('b')} show={p.b.toFixed(2)} />
        <Range label="RRF k" value={p.rrfK} min={1} max={120} step={1} onChange={set('rrfK')} show={p.rrfK} />
        <Range label="Rerank depth" value={p.rerankDepth} min={1} max={20} step={1} onChange={set('rerankDepth')} show={p.rerankDepth} />
      </div>
      <div className="actions" style={{ marginTop: 0, marginBottom: 16 }}>
        <button className="btn primary" onClick={() => setP(DEFAULTS)} disabled={isDefault}>Reset to repo defaults</button>
        <span className="hint">{res.chunks} chunks at this setting (recorded run: {deep.chunks}).</span>
      </div>
      <div className="grid2">
        <div className="scroll-x">
          <table>
            <thead><tr><th>Mode</th>{cols.map(([, , l]) => <th key={l}>{l}</th>)}</tr></thead>
            <tbody>
              {MODES.map((m) => (
                <tr key={m}><td>{MODE_LABEL[m]}</td>
                  {cols.map(([c, k, l]) => {
                    const v = res.summary[c][m][k], d = v - deep.summary[c][m][k];
                    return <td key={l}>{f3(v)}{Math.abs(d) > 1e-9 && <small className={d > 0 ? 'ok' : 'no'}> {d > 0 ? '+' : ''}{d.toFixed(3)}</small>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint">Small numbers show the change from the recorded run.</p>
        </div>
        <div>
          <h3>Paraphrase top-1 by chunk size (other sliders as set)</h3>
          <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Paraphrase top-1 accuracy by chunk size for rewrite, hybrid and hybrid plus rerank">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => <g key={t}><line className="axis" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end">{t}</text></g>)}
            <line x1={x(p.chunkSize)} x2={x(p.chunkSize)} y1={pad.t} y2={H - pad.b} stroke="var(--muted)" strokeDasharray="4 4" />
            {series.map(([k, c]) => (
              <g key={k}>
                <polyline fill="none" stroke={c} strokeWidth="2.5" points={curve.map((d) => `${x(d.s)},${y(d[k])}`).join(' ')} />
                {curve.map((d) => <circle key={d.s} cx={x(d.s)} cy={y(d[k])} r="3" fill={c} />)}
              </g>
            ))}
            <text x={pad.l} y={H - 6}>{SIZES[0]} words</text><text x={W - pad.r} y={H - 6} textAnchor="end">{SIZES.at(-1)} words</text>
          </svg>
          <div className="legend">{series.map(([k, c, l]) => <span key={k}><i style={{ background: c }} />{l}</span>)}</div>
          <p className="hint">n = {deep.category_counts.paraphrase} questions, so one question moves a point by {f3(1 / deep.category_counts.paraphrase)}.</p>
        </div>
      </div>
    </section>
  );
}

export { RECORDED };
