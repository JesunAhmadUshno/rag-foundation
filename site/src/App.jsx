import { useEffect, useMemo, useState } from 'react';
import reportMd from '../../REPORT.md?raw';
import { repo, deep, build, questions, pipe, C, f3, REPO, blob, CAT_LABEL, expectedOf, topicOf, Recorded } from './common.jsx';
import { vocabOverlap } from './rag.js';
import { mcnemarExact } from './stats.js';
import { Playground, Ablation, Explorer, Cases, Sweep } from './Lab.jsx';

const SECTIONS = [
  ['top', 'Overview', '◎'], ['playground', 'Playground', '⌕'], ['pipeline', 'Pipeline', '⇢'], ['ablation', 'Ablation', '▥'],
  ['explorer', 'Explorer', '☰'], ['cases', 'Case files', '!'], ['sweep', 'Sensitivity', '⚙'], ['corpus', 'Corpus', '▦'], ['limits', 'Limits', '✓'],
];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

function MenuBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  return (
    <div className="menubar" role="banner">
      <span className="apple" aria-hidden="true">◆</span>
      <a className="app" href="#top">RAG Foundation</a>
      <a className="m" href={blob('REPORT.md')}>Report</a>
      <a className="m" href={blob('PROPOSAL.md')}>Proposal</a>
      <a className="m" href={blob('CHANGELOG.md')}>Changelog</a>
      <span className="spacer" />
      <span className="status"><i /> {repo.tests} tests · parity gated</span>
      <a href={REPO}>GitHub ↗</a>
      <span className="clock">{now.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
    </div>
  );
}

function Dock() {
  const [active, setActive] = useState('top');
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return (
    <nav className="dock" aria-label="Sections">
      {SECTIONS.map(([id, label, icon]) => (
        <a key={id} href={`#${id}`} className={active === id ? 'on' : ''} aria-current={active === id ? 'true' : undefined}>
          <span className="ico" aria-hidden="true">{icon}</span><span className="lbl">{label}</span>
        </a>
      ))}
    </nav>
  );
}

export default function App() {
  useReveal();
  const [query, setQuery] = useState(questions.find((q) => q.id === 'p01-condensation').question);
  return (
    <div className="wrap">
      <MenuBar />
      <div className="glow" aria-hidden="true" />
      <Hero />
      <Playground query={query} setQuery={setQuery} />
      <Pipeline query={query} />
      <Ablation />
      <Explorer setQuery={setQuery} />
      <Cases setQuery={setQuery} />
      <Sweep />
      <Corpus />
      <Limits />
      <Dock />
      <footer>
        Code: Apache-2.0. Recorded numbers are read from <code>results_build.json</code> and <code>results_deep.json</code> at build time; the corpus and constants are exported from the Python modules.
        The retrieval runs in your browser, and the build fails unless it reproduces every recorded ranking.
      </footer>
    </div>
  );
}

function Hero() {
  const s = deep.summary;
  return (
    <header className="card hero window" id="top" data-title="rag-foundation — README.md">
      <div className="head">
        <p className="eyebrow">Pure Python standard library · no models, no services</p>
        <Recorded />
      </div>
      <h1>A dependency-free RAG pipeline, <em>measured honestly</em>.</h1>
      <p className="sub">
        Three levels of retrieval over a {deep.documents}-document synthetic corpus: TF-IDF, then BM25 plus TF-IDF fused with reciprocal rank fusion and a reranker,
        then query rewriting, a lexical HyDE simulation and multi-hop. On {deep.category_counts.paraphrase} paraphrase questions, rewriting lifts top-1 from {f3(s.paraphrase.hybrid.top1_accuracy)} (hybrid)
        to {f3(s.paraphrase.rewrite.top1_accuracy)}. The reranker measurably hurt one question, and HyDE and multi-hop showed no gain on a corpus this small.
        The whole pipeline below runs live in your browser.
      </p>
      <div className="actions">
        <a className="btn primary" href="#playground">Try the query playground</a>
        <a className="btn ghost" href="#limits">Read the limits first</a>
        <span className="hint">Reproduce with <code>python3 src/run_deep.py</code></span>
      </div>
      <div className="tiles">
        <div className="tile"><div className="num">{f3(s.paraphrase.rewrite.top1_accuracy)}</div><div className="cap">Paraphrase top-1 with rewriting, up from {f3(s.paraphrase.hybrid.top1_accuracy)} for hybrid (n = {deep.category_counts.paraphrase})</div></div>
        <div className="tile"><div className="num">{f3(s.regression.hybrid_rerank.top1_accuracy)}</div><div className="cap">Regression top-1 with the reranker, against {f3(s.regression.hybrid.top1_accuracy)} without (n = {deep.category_counts.regression})</div></div>
        <div className="tile"><div className="num">{repo.tests}</div><div className="cap">Unit tests across Learn, Build and Deep</div></div>
        <div className="tile"><div className="num">{deep.documents} / {deep.chunks}</div><div className="cap">Documents / chunks in the Build corpus, {deep.questions} labelled questions</div></div>
      </div>
    </header>
  );
}

/* ---------- Pipeline explainer with a live trace ---------- */
function Pipeline({ query }) {
  const r = useMemo(() => pipe.rankings(query, { deep: false }), [query]);
  const ans = useMemo(() => pipe.answer(query, r.stages.hybrid_rerank), [query, r]);
  const terms = pipe.tok(query);
  const top = (list) => list[0]?.chunk.id ?? 'none';
  const nodes = [
    { x: 6, y: 70, t: 'Chunk', s: `${C.CHUNK_SIZE} words, overlap ${C.OVERLAP}`, live: `${pipe.chunks.length} chunks` },
    { x: 154, y: 70, t: 'Tokenise', s: 'stopwords, -s stem', live: `${terms.length} query terms` },
    { x: 302, y: 15, t: 'BM25', s: `k1 ${C.K1}, b ${C.B}`, live: `${r.stages.bm25.length} hits · ${top(r.stages.bm25)}` },
    { x: 302, y: 125, t: 'TF-IDF cosine', s: 'vector side', live: `${r.stages.vector.length} hits · ${top(r.stages.vector)}` },
    { x: 450, y: 70, t: 'RRF fuse', s: `1 / (${C.RRF_K} + rank)`, live: `${r.stages.hybrid.length} fused · ${top(r.stages.hybrid)}` },
    { x: 598, y: 70, t: 'Rerank', s: `coverage, F1, top ${C.RERANK_DEPTH}`, live: top(r.stages.hybrid_rerank) },
    { x: 746, y: 70, t: 'Answer', s: `2nd line ≥ ${C.MIN_SECOND_COVERAGE.toFixed(2)}`, live: ans.length ? `${ans.length} sentence${ans.length > 1 ? 's' : ''} · ${ans[0].chunkId}` : 'nothing returned' },
  ];
  const W = 880, H = 200, bw = 128, bh = 62;
  const edges = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4], [4, 5], [5, 6]];
  return (
    <section id="pipeline" className="card window reveal" data-title="pipeline.md — Build pipeline">
      <div className="head">
        <div>
          <p className="eyebrow">Pipeline explainer</p>
          <h2>Seven steps, every constant exported from the Python.</h2>
          <p className="sub">
            Each box shows the repo constant it uses and, in blue, what happened to the playground’s current question.
            Deep modes sit in front of this pipeline: rewrite expands the query, HyDE replaces it with a hypothetical document, multi-hop runs it twice.
          </p>
        </div>
        <Recorded live />
      </div>
      <div className="scroll-x">
        <svg className="chart flow" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Build pipeline flow: chunk, tokenise, BM25 and TF-IDF, reciprocal rank fusion, rerank, extractive answer, with a live trace for the current query">
          <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)" /></marker></defs>
          {edges.map(([a, b]) => {
            const A = nodes[a], B = nodes[b];
            return <line key={`${a}-${b}`} x1={A.x + bw} y1={A.y + bh / 2} x2={B.x - 2} y2={B.y + bh / 2} stroke="var(--muted)" strokeOpacity=".6" markerEnd="url(#arr)" />;
          })}
          {nodes.map((n) => (
            <g key={n.t} transform={`translate(${n.x} ${n.y})`}>
              <rect width={bw} height={bh} rx="10" fill="var(--surface-strong)" stroke="var(--border)" />
              <text x="10" y="19" className="t">{n.t}</text>
              <text x="10" y="35">{n.s}</text>
              <text x="10" y="52" className="live">{n.live.length > 19 ? n.live.slice(0, 18) + '…' : n.live}</text>
            </g>
          ))}
        </svg>
      </div>
      <p className="hint">Question: “{query}”{r.stages.hybrid_rerank.length === 0 && ' · no chunk shares a term, so every stage is empty.'}</p>
    </section>
  );
}

/* ---------- Corpus browser with a live vocabulary-overlap heatmap ---------- */
function Corpus() {
  const docs = repo.documents;
  const m = useMemo(() => vocabOverlap(pipe, docs), [docs]);
  const [sel, setSel] = useState([0, 1]);
  const off = m.flatMap((row, i) => row.map((v, j) => (i < j ? { i, j, v } : null)).filter(Boolean));
  const max = Math.max(...off.map((o) => o.v));
  const topPairs = [...off].sort((a, b) => b.v - a.v).slice(0, 5);
  const cell = 22, L = 150, T = 8, W = L + docs.length * cell + 4, H = T + docs.length * cell + 4;
  const [i, j] = sel;
  const shared = useMemo(() => { const b = new Set(pipe.tok(docs[j].text)); return [...new Set(pipe.tok(docs[i].text))].filter((t) => b.has(t)); }, [i, j, docs]);
  const qCount = (id) => questions.filter((q) => expectedOf(q).includes(id)).length;
  return (
    <section id="corpus" className="card window reveal" data-title="corpus.py — 20 documents">
      <div className="head">
        <div>
          <p className="eyebrow">Corpus browser</p>
          <h2>Siblings share vocabulary. That is the test.</h2>
          <p className="sub">
            Each cell counts the stemmed content terms two documents share, computed live with the repo tokeniser (and checked against Python at build time).
            Documents in the same topic overlap most, which is why the questions are hard to answer from keywords alone. Click a cell to see the shared terms.
          </p>
        </div>
        <Recorded live />
      </div>
      <div className="grid2 corpus-grid">
        <div className="scroll-x">
          <svg className="chart heat" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Vocabulary overlap heatmap between the ${docs.length} corpus documents`}>
            {docs.map((d, r) => <text key={d.id} x={L - 6} y={T + r * cell + cell / 2 + 4} textAnchor="end" className={r === i || r === j ? 'on' : ''}>{d.id}</text>)}
            {m.map((row, r) => row.map((v, c) => (
              <rect key={`${r}-${c}`} x={L + c * cell} y={T + r * cell} width={cell - 2} height={cell - 2} rx="3"
                fill={r === c ? 'var(--grid)' : 'var(--primary)'} fillOpacity={r === c ? 1 : 0.08 + 0.92 * (v / max)}
                stroke={(r === i && c === j) || (r === j && c === i) ? 'var(--text)' : 'none'} strokeWidth="2"
                onClick={() => r !== c && setSel([r, c])} style={{ cursor: r === c ? 'default' : 'pointer' }}>
                <title>{`${docs[r].id} × ${docs[c].id}: ${r === c ? 'same document' : `${v} shared terms`}`}</title>
              </rect>
            )))}
          </svg>
        </div>
        <div>
          <div className="tile">
            <h3>{docs[i].id} × {docs[j].id}</h3>
            <p className="hint" style={{ margin: '4px 0 8px' }}>{topicOf[docs[i].id]} / {topicOf[docs[j].id]} · {m[i][j]} shared terms</p>
            <p style={{ margin: 0 }}>{shared.map((t) => <code key={t} className="chip">{t}</code>)}</p>
          </div>
          <h3 style={{ marginTop: 16 }}>Most-overlapping pairs</h3>
          <div className="scroll-x">
            <table>
              <thead><tr><th>Pair</th><th>Shared</th></tr></thead>
              <tbody>{topPairs.map((p) => (
                <tr key={`${p.i}-${p.j}`}><td><button className="linkish" onClick={() => setSel([p.i, p.j])}>{docs[p.i].id} × {docs[p.j].id}</button></td><td>{p.v}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="hint">Questions that target {docs[i].id}: {qCount(docs[i].id)}; {docs[j].id}: {qCount(docs[j].id)}.</p>
        </div>
      </div>
      <details className="docs-list">
        <summary>Read all {docs.length} documents</summary>
        <div className="grid2" style={{ marginTop: 12 }}>
          {docs.map((d) => <div className="tile" key={d.id}><h3 className="mono">{d.id} <span className="pill info">{d.topic}</span></h3><p className="hint" style={{ margin: '6px 0 0' }}>{d.text}</p></div>)}
        </div>
      </details>
    </section>
  );
}

/* ---------- Limits and roadmap, read from the repo text ---------- */
const listItems = (md) => md.split('\n').reduce((acc, line) => {
  const n = line.match(/^(\d+\.|-)\s+(.*)/);
  if (n) acc.push(n[2]); else if (/^\s{2,}\S/.test(line) && acc.length) acc[acc.length - 1] += ' ' + line.trim();
  return acc;
}, []);
const section = (md, start, end) => md.slice(md.indexOf(start) + start.length, end ? md.indexOf(end, md.indexOf(start)) : undefined);
const backlog = listItems(section(reportMd, '## v1.1 backlog', '## Standing rules'));
const limits = listItems(section(reportMd, '### Deep limits, stated plainly', 'Summary claim:'))
  .filter((l) => !/VM|fleet node/i.test(l)); // drops a note about which machine ran the job; not a research limit

function Limits() {
  const hits = (m) => deep.per_question.filter((q) => q.category === 'paraphrase').map((q) => (q.modes[m].top1_hit_primary ? 1 : 0));
  const mcP = mcnemarExact(hits('rewrite'), hits('hybrid')).p;
  const added = [
    `No statistical power: n = ${deep.category_counts.paraphrase} paraphrase and n = ${deep.category_counts.multihop} multi-hop questions. Rewrite vs hybrid has an exact McNemar p of ${mcP.toFixed(4)}, above 0.05 (see the ablation window).`,
    'The expansion table was written alongside the paraphrase questions, and there is no held-out paraphrase set. The leakage probe above shows the gain depends on table coverage.',
    `Ceiling effects: regression and multi-hop are at 1.000 for most modes, so those sets cannot rank the methods. Multi-hop's conservative union cannot change the top 3 by construction.`,
    'Answers are judged by reading. There is no answer-level metric and a single author labelled every question.',
  ];
  return (
    <section id="limits" className="card window reveal" data-title="REPORT.md — limits and backlog">
      <p className="eyebrow">Limits and roadmap</p>
      <h2>What this does <em>not</em> show.</h2>
      <div className="grid2" style={{ marginTop: 16 }}>
        <div>
          <h3>Limits stated in the repo</h3>
          <ul className="plain">{limits.map((l, k) => <li key={k}>{l}</li>)}</ul>
          <h3 style={{ marginTop: 16 }}>Threats found by this review</h3>
          <ul className="plain">{added.map((l, k) => <li key={k}>{l}</li>)}</ul>
        </div>
        <div>
          <h3>v1.1 backlog (none of it done or claimed)</h3>
          <ol className="steps" style={{ marginTop: 12 }}>
            {backlog.map((b, k) => {
              const [t, ...rest] = b.split(': ');
              return <li key={k}><span className="n">{k + 1}</span><div><b>{t}</b><div className="hint">{rest.join(': ')}</div></div></li>;
            })}
          </ol>
        </div>
      </div>
      <div className="docs" style={{ marginTop: 20 }}>
        {[['REPORT.md', 'Report', `Build ablation on ${build.questions} questions; Deep on ${deep.questions}, failure modes, review findings, backlog`],
          ['PROPOSAL.md', 'Proposal', 'Original scope and specs; confirmatory plan (draft, not locked)'], ['CHANGELOG.md', 'Changelog', 'What changed and when']]
          .map(([p, t, d]) => <a key={p} href={blob(p)}><b>{t}</b><small>{d}</small></a>)}
      </div>
      <p className="hint" style={{ marginTop: 16 }}>Categories: {Object.entries(deep.category_counts).map(([c, n]) => `${CAT_LABEL[c]} ${n}`).join(' · ')}.</p>
    </section>
  );
}
