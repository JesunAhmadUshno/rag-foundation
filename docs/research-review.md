# Research review: rag-foundation v1.0

Reviewed 2026-11-07 against a doctoral-level rubric for empirical
information-retrieval work. Grades: A (meets the bar), B (minor gaps),
C (material gaps), D (missing). Recorded numbers come from
`level-2-build/results_build.json` and `level-3-deep/results_deep.json`.
Numbers marked *new* were computed during this review by the browser
port in `site/src/` (the parity gate in `site/src/rag.check.mjs` proves
it reproduces every recorded ranking first). Reproduce them with
`cd site && npm ci && npm run build`, which prints them, or in the
dashboard's Sensitivity lab and leakage probe.

## Summary

The engineering is clean and honest: a dependency-free pipeline, 52
fast unit tests, committed results that the runners reproduce byte for
byte, and named failure cases. The research claim is narrow, and the
repo mostly says so. The main weaknesses are external validity (20
synthetic documents), a rewrite table authored next to the questions
it is scored on, and no uncertainty on n = 10 and n = 8 subsets. This
review fixes the cheap gaps (uncertainty, paired tests, a leakage
probe, a sensitivity sweep, a JS/Python parity gate) and names the
compute and data each remaining gap needs.

## Rubric

| Criterion | Grade | Evidence and gap |
| --- | --- | --- |
| Research question | B | Clear per level (does hybrid beat single retrievers; do rewrite, HyDE and multi-hop close the paraphrase and multi-hop gaps). Not phrased as a falsifiable hypothesis before the runs. |
| Hypotheses | C | No pre-stated hypotheses or decision thresholds. The Deep question set and the expansion table were written in the same cycle. |
| Method | B | Fully specified and deterministic: 40-word chunks with 10-word overlap, BM25 (k1 1.5, b 0.75), TF-IDF cosine, RRF k 60, rerank depth 8, extractive answers. Same chunking and questions across modes. |
| Baselines | C | BM25, TF-IDF and hybrid are internal baselines. No standard implementation (Pyserini, rank_bm25), no dense retriever, no framework baseline. NOVELTY.md says "no measurement yet". |
| Statistics and uncertainty | C, was D | Recorded results are point estimates on n = 24 / 10 / 8. *Fixed now:* seeded percentile bootstrap 95% CIs per mode and metric, exact McNemar tests and a paired bootstrap, computed from the recorded per-question outcomes. |
| Reproducibility | A | Stdlib only, runners regenerate the committed JSON exactly, CI runs them on Python 3.11 and 3.12. *Added:* the dashboard build fails if the JS port drifts from the recorded rankings, traces or summaries. |
| Threats to validity | C, was C- | Failure cases written up (b10-pollen, p01/p03, HyDE siblings, m05/m08). *Added:* leakage probe, ceiling-effect note, sensitivity sweep. |
| Related work | D | DOSSIER.md surveys the area, but nothing is measured against prior work and NOVELTY.md is an unfilled draft. |
| Limitations | B | The level READMEs state the synthetic corpus, the lexical-only HyDE and the compressed Deep scope plainly. Missing: small-n, leakage and single-annotator labels. The dashboard's Limits window now lists them. |
| Engineering rigour | A | 52 unit tests in under a second, ruff in CI, small modules, no network or model calls, deterministic tie-breaks. |

## What the cheap upgrades found

1. **Uncertainty (new).** Paraphrase top-1, bootstrap 95% CI: hybrid
   0.500 (0.200 to 0.800), hybrid + rerank 0.300 (0.000 to 0.600),
   rewrite 1.000 (1.000 to 1.000, a degenerate interval because every
   outcome is a hit), HyDE 0.500 (0.200 to 0.800).
2. **Paired tests (new).** Rewrite vs hybrid on paraphrase: 5
   discordant questions, all favouring rewrite, exact two-sided
   McNemar p = 0.0625. The effect is large but **not significant at
   0.05** with n = 10. Hybrid vs hybrid + rerank on regression: 1
   discordant question (b10-pollen), p = 1. HyDE vs hybrid on
   paraphrase: 1 won, 1 lost, p = 1. The README's "rewriting is the
   measured win" is correct as a description of this set, not as a
   significance claim.
3. **Leakage probe (new).** For each paraphrase question, removing the
   expansion keys that fire for that question alone and rerunning
   rewrite: 6 of 10 still reach rank 1, against 10 of 10 with the full
   table and 5 of 10 for hybrid. Most of the 0.500 to 1.000 gain
   depends on keys written for those exact questions. This is the
   strongest threat to the rewrite result.
4. **Sensitivity (new, exploratory).** The defaults were never varied
   (ROADMAP item 6). Varying chunk size (overlap 10, other defaults),
   paraphrase hybrid top-1 moves between 0.400 and 0.600 (20, 30, 40,
   50, 60 and 80 words give 0.4, 0.4, 0.5, 0.4, 0.5, 0.6); rewrite
   stays at 1.000 throughout. The one-question reranker loss on regression
   (top-1 0.958, b10-pollen at the default) appears at 30 to 50 words
   and disappears at 20, 60 and 80. RRF k from 1 to 120 does not change paraphrase hybrid top-1 or
   regression rerank top-1. These are exploratory, one corpus, no
   correction for the number of settings tried, and they are not
   recorded results.
5. **Ceiling effects.** Regression and multi-hop sit at 1.000 for most
   modes, so they cannot rank methods. Multi-hop's conservative union
   cannot change the top 3 by construction, so "no multi-hop gain" is
   a property of the design as much as a finding.

## Remaining gaps and exactly what each needs

| Gap | What closes it | Compute and data |
| --- | --- | --- |
| External validity | Rerun all 8 modes on a public benchmark (BEIR SciFact, about 5k docs and 300 test queries; or NFCorpus) | CPU only, minutes with the stdlib pipeline; free public data download; no GPU |
| Rewrite leakage | A held-out paraphrase set of 30+ questions written by someone who has not seen EXPANSIONS, with the table frozen first | Human time (a second author), no compute |
| Statistical power | At least 50 paraphrase and 50 multi-hop questions so a 0.2 top-1 difference is testable; report McNemar and bootstrap CIs | Question authoring; CPU seconds |
| Standard baselines | rank_bm25 or Pyserini BM25 on the same chunks and questions | `pip install rank_bm25` (pure Python) or a JVM for Pyserini; CPU minutes |
| Dense retrieval (ROADMAP 1) | A small open embedding model (e.g. all-MiniLM-L6-v2) in place of or fused with TF-IDF | CPU is enough for 41 chunks; about 100 MB model download; GPU only for a large corpus |
| LLM rewrite and HyDE (ROADMAP 2) | A local open model behind the existing interfaces, on p01 and p03 especially | A local GPU or a paid API; needs the owner's credential and cost decision |
| Learned reranker (ROADMAP 3) | A cross-encoder (e.g. ms-marco-MiniLM-L-6-v2) with b10-pollen as a regression case | CPU feasible at this size; about 90 MB model |
| Answer quality | Exact match / token F1 against written reference answers, plus a second annotator and agreement (Cohen's kappa) on retrieval labels | Human labelling time; CPU seconds |
| Hyperparameter study | Record the sweep (chunk size, k1, b, RRF k, rerank depth) as a committed result on the larger set, with a held-out split for choosing settings | CPU minutes |
| Related work and novelty | Fill NOVELTY.md with a measured comparison to the baselines above and cite BM25, RRF (Cormack et al. 2009), HyDE (Gao et al. 2022) | Reading time; no compute |
| Latency and scale | Time indexing and queries at 10^3 to 10^5 chunks | CPU minutes; synthetic or BEIR text |

## Verdict

As engineering, ready to show. As research, a well-documented pilot on
a toy corpus: the rewrite gain is real on this set but not significant
at n = 10 and largely tied to the hand-built table, the reranker loss
is one question, and HyDE and multi-hop show no effect that this set
could detect. The next result worth having is the same eight modes on
a public benchmark with a held-out paraphrase set.
