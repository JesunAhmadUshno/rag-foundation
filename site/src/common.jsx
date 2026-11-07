import { useId } from 'react';
import repo from './data/repo.json';
import deep from '../../level-3-deep/results_deep.json';
import build from '../../level-2-build/results_build.json';
import questions from '../../level-3-deep/questions_deep.json';
import { createPipeline } from './rag.js';

export { repo, deep, build, questions };
export const C = repo.constants;
export const pipe = createPipeline(repo);
export const REPO = 'https://github.com/JesunAhmadUshno/rag-foundation';
export const blob = (p) => `${REPO}/blob/main/${p}`;
export const f3 = (x) => (x == null ? '–' : x.toFixed(3));
export const RECORDED = `recorded ${repo.recorded['level-3-deep'].date}, ${repo.recorded['level-3-deep'].python}`;

export const MODE_LABEL = {
  bm25: 'BM25', vector: 'TF-IDF vector', hybrid: 'Hybrid (RRF)', hybrid_rerank: 'Hybrid + rerank',
  rewrite: 'Rewrite', hyde: 'HyDE (lexical)', multihop: 'Multi-hop', combined: 'Rewrite + multi-hop',
};
export const CAT_LABEL = { regression: 'Regression', paraphrase: 'Paraphrase', multihop: 'Multi-hop' };
export const expectedOf = (q) => q.expected_docs || [q.expected_doc];
export const topicOf = Object.fromEntries(repo.documents.map((d) => [d.id, d.topic]));

export function Range({ label, value, min, max, step, onChange, show }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label} <span>{show}</span></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

export function Recorded({ live }) {
  return live
    ? <span className="pill good">● Live, computed in your browser</span>
    : <span className="pill warn">● Recorded · {RECORDED.replace('recorded ', '')}</span>;
}
