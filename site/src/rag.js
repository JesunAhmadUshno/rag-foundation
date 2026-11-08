// In-browser port of src/pipeline.py and src/deep_pipeline.py.
// Same formulas, same tie-breaks (scores descending, then chunk_id), zero scores dropped.
// src/rag.check.mjs asserts that this port reproduces results_deep.json and results_build.json
// exactly, so the build fails if it ever drifts from the Python.

const TOKEN_RE = /[a-z0-9]+/g;
const SENTENCE_RE = /[^.!?]+[.!?]/g;
const cmpId = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function makeTokenizer(stopwords) {
  const stop = new Set(stopwords);
  const stem = (t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('sis') ? t.slice(0, -1) : t);
  return (text) => (text.toLowerCase().match(TOKEN_RE) || []).filter((t) => !stop.has(t)).map(stem);
}

export const splitSentences = (text) => (text.match(SENTENCE_RE) || []).map((s) => s.trim()).filter(Boolean);

export function chunkDocument(docId, text, size, overlap) {
  if (size <= 0) throw new Error('chunk_size must be positive');
  if (overlap < 0 || overlap >= size) throw new Error('overlap must be at least 0 and below chunk_size');
  const words = text.split(/\s+/).filter(Boolean);
  const out = [];
  for (let start = 0, i = 0; start < words.length; start += size - overlap, i++) {
    out.push({ docId, index: i, id: `${docId}-c${i}`, text: words.slice(start, start + size).join(' ') });
    if (start + size >= words.length) break;
  }
  return out;
}

const counter = (tokens) => { const m = new Map(); for (const t of tokens) m.set(t, (m.get(t) || 0) + 1); return m; };
const sortScored = (arr) => arr.sort((a, b) => b.score - a.score || cmpId(a.chunk.id, b.chunk.id));

export function docRanking(chunks) {
  const seen = [];
  for (const c of chunks) if (!seen.includes(c.docId)) seen.push(c.docId);
  return seen;
}

export function evaluateRankings(rankings, expected) {
  const n = expected.length;
  let top1 = 0, in3 = 0, rr = 0;
  rankings.forEach((r, i) => {
    const e = expected[i], k = r.indexOf(e);
    if (r[0] === e) top1++;
    if (k >= 0 && k < 3) in3++;
    if (k >= 0) rr += 1 / (k + 1);
  });
  return { n, top1_accuracy: n ? top1 / n : 0, recall_at_3: n ? in3 / n : 0, mrr: n ? rr / n : 0 };
}

export function evaluateDocPairs(rankings, expectedList) {
  const n = expectedList.length;
  let r3 = 0, r5 = 0, p3 = 0, p5 = 0;
  rankings.forEach((r, i) => {
    const e = expectedList[i];
    const a = e.filter((d) => r.slice(0, 3).includes(d)).length, b = e.filter((d) => r.slice(0, 5).includes(d)).length;
    r3 += a / e.length; r5 += b / e.length;
    if (a === e.length) p3++;
    if (b === e.length) p5++;
  });
  return { doc_recall_at_3: r3 / n, doc_recall_at_5: r5 / n, pair_at_3: p3 / n, pair_at_5: p5 / n };
}

// repo: the object written by site/export.py. opts override the Python defaults.
export function createPipeline(repo, opts = {}) {
  const C = repo.constants;
  const o = {
    chunkSize: C.CHUNK_SIZE, overlap: C.OVERLAP, k1: C.K1, b: C.B, rrfK: C.RRF_K, rerankDepth: C.RERANK_DEPTH,
    expansions: repo.expansions, ...opts,
  };
  const tok = makeTokenizer(repo.stopwords);
  const chunks = repo.documents.flatMap((d) => chunkDocument(d.id, d.text, o.chunkSize, o.overlap));
  const toks = chunks.map((c) => tok(c.text));
  const tfs = toks.map(counter);
  const tokSets = toks.map((t) => new Set(t));
  const N = chunks.length;
  const df = new Map();
  for (const s of tokSets) for (const t of s) df.set(t, (df.get(t) || 0) + 1);
  const avgdl = toks.reduce((s, t) => s + t.length, 0) / N;
  const bm25Idf = new Map([...df].map(([t, c]) => [t, Math.log(1 + (N - c + 0.5) / (c + 0.5))]));
  const idf = new Map([...df].map(([t, c]) => [t, Math.log((1 + N) / (1 + c)) + 1]));
  const tfidf = (tokens) => { const v = new Map(); for (const [t, c] of counter(tokens)) if (idf.has(t)) v.set(t, c * idf.get(t)); return v; };
  const norm = (v) => { let s = 0; for (const x of v.values()) s += x * x; return Math.sqrt(s); };
  const vecs = toks.map(tfidf);
  const norms = vecs.map(norm);

  function bm25(query) {
    const q = [...new Set(tok(query))];
    const out = [];
    chunks.forEach((chunk, i) => {
      const dl = toks[i].length;
      if (!dl) return;
      let score = 0;
      for (const t of q) {
        const f = tfs[i].get(t);
        if (!f) continue;
        score += (bm25Idf.get(t) || 0) * f * (o.k1 + 1) / (f + o.k1 * (1 - o.b + o.b * dl / avgdl));
      }
      if (score > 0) out.push({ chunk, score });
    });
    return sortScored(out);
  }

  function vector(query) {
    const qv = tfidf(tok(query)), qn = norm(qv);
    const out = [];
    if (!qv.size || !qn) return out;
    chunks.forEach((chunk, i) => {
      if (!norms[i]) return;
      let dot = 0;
      for (const [t, x] of qv) { const y = vecs[i].get(t); if (y !== undefined) dot += x * y; }
      const score = dot / (qn * norms[i]);
      if (score > 0) out.push({ chunk, score });
    });
    return sortScored(out);
  }

  function rrf(rankings) {
    const fused = new Map();
    for (const r of rankings) r.forEach(({ chunk }, i) => {
      const e = fused.get(chunk.id) || { chunk, score: 0 };
      e.score += 1 / (o.rrfK + i + 1);
      fused.set(chunk.id, e);
    });
    return sortScored([...fused.values()]);
  }

  function coverageF1(query, text) {
    const q = new Set(tok(query)), p = new Set(tok(text));
    if (!q.size || !p.size) return [0, 0];
    let shared = 0;
    for (const t of q) if (p.has(t)) shared++;
    if (!shared) return [0, 0];
    const cov = shared / q.size, prec = shared / p.size;
    return [cov, (2 * prec * cov) / (prec + cov)];
  }

  function rerank(query, hits) {
    const deco = hits.map(({ chunk, score }, i) => { const [coverage, f1] = coverageF1(query, chunk.text); return { chunk, score, coverage, f1, order: i }; });
    const head = deco.slice(0, o.rerankDepth).sort((a, b) => b.coverage - a.coverage || b.f1 - a.f1 || b.score - a.score || a.order - b.order);
    return head.concat(deco.slice(o.rerankDepth));
  }

  const hybrid = (q) => rrf([bm25(q), vector(q)]);

  function rewrite(question, exp = o.expansions) {
    const expansions = [], extra = [];
    for (const t of tok(question)) if (Object.hasOwn(exp, t) && exp[t].length) { expansions.push({ token: t, terms: [...exp[t]] }); extra.push(...exp[t]); }
    return { expanded: extra.length ? `${question} ${extra.join(' ')}` : question, expansions };
  }

  function hyde(question) {
    const terms = [...new Set(tok(question))], qs = new Set(terms);
    const sentences = [];
    for (const term of terms) {
      const co = new Map();
      for (const s of tokSets) if (s.has(term)) for (const other of s) if (!qs.has(other)) co.set(other, (co.get(other) || 0) + 1);
      if (!co.size) continue;
      const ranked = [...co].map(([t, c]) => [t, c * (idf.has(t) ? idf.get(t) : 1)]).sort((a, b) => b[1] - a[1] || cmpId(a[0], b[0]));
      sentences.push(`${term} ${ranked.slice(0, C.HYDE_TERMS_PER_TERM).map((x) => x[0]).join(' ')}`);
    }
    return sentences.length ? `${sentences.join('. ')}.` : '';
  }

  const termDocs = new Map(), anchorTokens = new Map();
  chunks.forEach((c, i) => {
    for (const t of tokSets[i]) { if (!termDocs.has(t)) termDocs.set(t, new Set()); termDocs.get(t).add(c.docId); }
    if (!anchorTokens.has(c.docId)) anchorTokens.set(c.docId, new Set());
    for (const t of tokSets[i]) anchorTokens.get(c.docId).add(t);
  });

  function bridgeTerms(anchor, baseQuery) {
    const q = new Set(tok(baseQuery));
    const cand = [];
    for (const t of anchorTokens.get(anchor) || []) {
      if (q.has(t)) continue;
      const n = termDocs.get(t)?.size || 0;
      if (n >= C.BRIDGE_MIN_DOCS && n <= C.BRIDGE_MAX_DOCS) cand.push([t, n, idf.has(t) ? idf.get(t) : 1]);
    }
    cand.sort((a, b) => a[1] - b[1] || b[2] - a[2] || cmpId(a[0], b[0]));
    return cand.slice(0, C.BRIDGE_TERMS).map((x) => x[0]);
  }

  function multihop(baseQuery) {
    const hop1 = docRanking(hybrid(baseQuery).map((h) => h.chunk));
    const trace = { anchor_doc: hop1[0] ?? null, bridge_terms: [], hop1_top_docs: hop1.slice(0, 5), hop2_top_docs: [] };
    if (!hop1.length) return [[], trace];
    const bridge = bridgeTerms(hop1[0], baseQuery);
    trace.bridge_terms = bridge;
    if (!bridge.length) return [hop1, trace];
    const hop2 = docRanking(hybrid(bridge.join(' ')).map((h) => h.chunk));
    trace.hop2_top_docs = hop2.slice(0, 5);
    const final = [...hop1];
    for (const d of hop2) if (!final.includes(d)) final.push(d);
    return [final, trace];
  }

  // All eight modes for one question, with chunk-level stages for the playground.
  function rankings(question, { deep = true } = {}) {
    const sB = bm25(question), sV = vector(question), sH = rrf([sB, sV]), sR = rerank(question, sH);
    const docs = {
      bm25: docRanking(sB.map((h) => h.chunk)), vector: docRanking(sV.map((h) => h.chunk)),
      hybrid: docRanking(sH.map((h) => h.chunk)), hybrid_rerank: docRanking(sR.map((h) => h.chunk)),
    };
    const stages = { bm25: sB, vector: sV, hybrid: sH, hybrid_rerank: sR };
    if (!deep) return { docs, stages };
    const { expanded, expansions } = rewrite(question);
    const sW = hybrid(expanded);
    const hydeDoc = hyde(question);
    const sY = hybrid(hydeDoc ? `${question} ${hydeDoc}` : question);
    const [mh, mhTrace] = multihop(question), [cb, cbTrace] = multihop(expanded);
    Object.assign(docs, { rewrite: docRanking(sW.map((h) => h.chunk)), hyde: docRanking(sY.map((h) => h.chunk)), multihop: mh, combined: cb });
    Object.assign(stages, { rewrite: sW, hyde: sY });
    return { docs, stages, trace: { expansions, expanded_query: expanded, hyde_document: hydeDoc, multihop: mhTrace, combined: cbTrace } };
  }

  // The Build answer step (RagPipeline.query): extractive sentences from the reranked top 3.
  function answer(question, ranked, topK = 3, maxSentences = 2) {
    const qTerms = new Set(tok(question).filter((t) => idf.has(t)));
    let qw = 0;
    for (const t of qTerms) qw += idf.get(t);
    const picked = [];
    for (const e of ranked.slice(0, topK)) {
      let best = null, bestCov = 0;
      for (const s of splitSentences(e.chunk.text)) {
        const st = new Set(tok(s));
        let w = 0;
        for (const t of qTerms) if (st.has(t)) w += idf.get(t);
        const cov = qw ? w / qw : 0;
        if (cov > bestCov) { bestCov = cov; best = s; }
      }
      if (best === null) continue;
      if (picked.length && bestCov < C.MIN_SECOND_COVERAGE) continue;
      picked.push({ sentence: best, docId: e.chunk.docId, chunkId: e.chunk.id, coverage: bestCov });
      if (picked.length >= maxSentences) break;
    }
    return picked;
  }

  return { chunks, tok, idf, opts: o, bm25, vector, hybrid, rerank, rewrite, hyde, bridgeTerms, multihop, rankings, answer };
}

export const MODES = ['bm25', 'vector', 'hybrid', 'hybrid_rerank', 'rewrite', 'hyde', 'multihop', 'combined'];
export const CATEGORIES = ['regression', 'paraphrase', 'multihop'];

// The run_deep.py evaluation: per-question rankings and per-category summaries.
export function runEvaluation(pipe, questions, modes = MODES) {
  const deep = modes.some((m) => !['bm25', 'vector', 'hybrid', 'hybrid_rerank'].includes(m));
  const per = questions.map((q) => {
    const { docs } = pipe.rankings(q.question, { deep });
    return { id: q.id, category: q.category, expected: q.expected_docs || [q.expected_doc], docs };
  });
  const summary = {};
  for (const cat of CATEGORIES) {
    const items = per.filter((r) => r.category === cat);
    summary[cat] = {};
    for (const m of modes) {
      const e = evaluateRankings(items.map((r) => r.docs[m]), items.map((r) => r.expected[0]));
      summary[cat][m] = cat === 'multihop' ? (delete e.n, { ...e, ...evaluateDocPairs(items.map((r) => r.docs[m]), items.map((r) => r.expected)) }) : e;
    }
  }
  return { per, summary };
}

// Leakage probe: for each question, drop the EXPANSIONS keys that fire for that question and for
// no other question in the set, then rerun rewrite. Shows how much of the gain is table coverage.
export function leaveOwnKeysOut(pipe, questions, ids) {
  const fired = new Map(questions.map((q) => [q.id, pipe.rewrite(q.question).expansions.map((e) => e.token)]));
  return ids.map((id) => {
    const q = questions.find((x) => x.id === id);
    const mine = fired.get(id);
    const own = mine.filter((k) => ![...fired].some(([other, ks]) => other !== id && ks.includes(k)));
    const exp = { ...pipe.opts.expansions };
    for (const k of own) delete exp[k];
    const expected = q.expected_docs ? q.expected_docs[0] : q.expected_doc;
    const rankOf = (text) => { const d = docRanking(pipe.hybrid(text).map((h) => h.chunk)); const k = d.indexOf(expected); return k < 0 ? null : k + 1; };
    return { id, expected, fired: mine, own, full: rankOf(pipe.rewrite(q.question).expanded), without: rankOf(pipe.rewrite(q.question, exp).expanded), hybrid: rankOf(q.question) };
  });
}

// Shared stemmed vocabulary between every pair of documents.
export function vocabOverlap(pipe, documents) {
  const sets = documents.map((d) => new Set(pipe.tok(d.text)));
  return sets.map((a) => sets.map((b) => { let n = 0; for (const t of a) if (b.has(t)) n++; return n; }));
}
