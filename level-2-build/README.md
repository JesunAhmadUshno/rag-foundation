# Level 2, Build: rag-foundation

Status: DONE 2026-11-04 (ROADMAP-V3-BATCH, Sprint 1 of the December
Compression Protocol). Evidence: the code in this folder, 20 Build
unit tests in tests/test_build_pipeline.py (35 tests total with
Learn), and the measured ablation recorded below and in
results_build.json, written by the runner. Deep is not started.
Spec for this level: BUILD-SPEC.md in this folder.

## What was built

Hybrid search with reranking and a clean query API, on top of the
Learn pipeline, Python standard library only:

1. Corpus (corpus.py): 20 synthetic documents across 7 topics
   (water, plants, earth, animals, energy, library, weather),
   authored for this level and labelled synthetic. Unlike Learn,
   topics deliberately share vocabulary: water words appear in the
   water, energy, animals, and plants documents; gravity and moon
   appear in both the earth and the tides documents; bees and pollen
   appear in both the plants and the animals documents; the three
   Northlight library documents share the library vocabulary and
   differ only in their facts. Chunking is the Learn approach
   (40-word windows, 10-word overlap), and a test asserts the Build
   chunker produces identical chunks to the Learn chunker. The
   corpus makes 41 chunks.
2. BM25 retriever (pipeline.py): score is the sum over distinct
   query terms of idf(t) * tf * (k1 + 1) / (tf + k1 * (1 - b + b *
   dl / avgdl)), with idf(t) = ln(1 + (N - df + 0.5) / (df + 0.5)),
   k1 = 1.5, b = 0.75. A unit test checks the score against a
   hand-computed value (1.097666 on the tiny example worked in the
   test comments).
3. Vector retriever: TF-IDF cosine, exactly the Learn method (raw
   term counts, smoothed IDF log((1 + N) / (1 + df)) + 1). This is
   the vector side of the hybrid. It is a lexical sparse vector,
   not a dense embedding from a model, and nothing here claims
   otherwise.
4. Hybrid fusion: reciprocal rank fusion over the two full
   rankings, fused(c) = sum of 1 / (60 + rank), ranks 1-based. A
   unit test checks the arithmetic on a fixture (2/61 for a chunk
   ranked first in both lists).
5. Reranker: the hybrid top 8 candidates are re-scored by query
   coverage first (share of distinct query terms the chunk
   contains), then token F1 between the query term set and the
   chunk term set, then the hybrid score, in the style proven in
   the rag-eval-harness Deep level. A unit test crafts a
   wrong-on-top case (a chunk repeating one query term outranks the
   chunk covering all five) and asserts the reranker flips it.
6. Query API: RagPipeline.query(question, top_k=3) returns
   extractive answer sentences with one citation per sentence, plus
   a per-stage score breakdown (bm25, vector, hybrid, reranked,
   with coverage and F1 on the reranked stage). The answer step
   carries the Learn rule (best sentence per chunk by IDF-weighted
   query coverage) with one change: later sentences must reach
   0.50 coverage, up from the Learn 0.30, because sibling documents
   here share topic terms and a 0.30 line admitted a sibling topic
   sentence on the strength of the shared names alone. The first
   demo run showed both that failure and a topic sentence beating
   the answering sentence in the loans document; the loans opening
   sentence was rewritten as a plain desk description, and the
   demo now returns the answering sentence (below). Both fixes
   happened before the recorded run; the ablation numbers are from
   the final code and corpus, re-run after the fixes.

## Run it

```text
python level-2-build/run_build.py
python -m unittest discover -s tests -p "test_build*.py" -v
```

No dependencies. Python 3.12 standard library only.

## Measured results (2026-11-04, Muse VM, Python 3.12.3)

Method: the 24 questions in questions.json were labelled with their
expected source document when the set was authored, before the
ablation was run. All four modes use the SAME questions and the
SAME chunking (41 chunks). Rankings are collapsed to documents
(each doc id once, in first-chunk order) and scored at document
level: top-1 accuracy, recall at 3 (expected doc among the first 3
distinct docs), and MRR (mean reciprocal rank of the expected doc).
The full per-question record, including every mode's ranked doc
list, is in results_build.json, written by the runner.

| Mode | Top-1 accuracy | Recall at 3 | MRR |
| --- | --- | --- | --- |
| BM25 only | 1.000 (24 of 24) | 1.000 | 1.000 |
| Vector only (TF-IDF) | 1.000 (24 of 24) | 1.000 | 1.000 |
| Hybrid (RRF) | 1.000 (24 of 24) | 1.000 | 1.000 |
| Hybrid plus rerank | 0.958 (23 of 24) | 1.000 | 0.979 |

| Question | Expected doc | BM25 top-1 | Vector top-1 | Hybrid top-1 | Rerank top-1 | Expected rank, reranked |
| --- | --- | --- | --- | --- | --- | --- |
| b01-absorb | photosynthesis | photosynthesis | photosynthesis | photosynthesis | photosynthesis | 1 |
| b02-clouds | water-cycle | water-cycle | water-cycle | water-cycle | water-cycle | 1 |
| b03-newton | gravity | gravity | gravity | gravity | gravity | 1 |
| b04-bees-dance | bees | bees | bees | bees | bees | 1 |
| b05-magma | volcanoes | volcanoes | volcanoes | volcanoes | volcanoes | 1 |
| b06-books-count | northlight-loans | northlight-loans | northlight-loans | northlight-loans | northlight-loans | 1 |
| b07-oxygen | photosynthesis | photosynthesis | photosynthesis | photosynthesis | photosynthesis | 1 |
| b08-evaporation | water-cycle | water-cycle | water-cycle | water-cycle | water-cycle | 1 |
| b09-tide | ocean-tides | ocean-tides | ocean-tides | ocean-tides | ocean-tides | 1 |
| b10-pollen | pollination | pollination | pollination | pollination | bees | 2 |
| b11-light-seeds | seed-dispersal | seed-dispersal | seed-dispersal | seed-dispersal | seed-dispersal | 1 |
| b12-epicentre | earthquakes | earthquakes | earthquakes | earthquakes | earthquakes | 1 |
| b13-photovoltaic | solar-power | solar-power | solar-power | solar-power | solar-power | 1 |
| b14-turbine-blades | wind-power | wind-power | wind-power | wind-power | wind-power | 1 |
| b15-hydro-gates | hydro-power | hydro-power | hydro-power | hydro-power | hydro-power | 1 |
| b16-close-time | northlight-hours | northlight-hours | northlight-hours | northlight-hours | northlight-hours | 1 |
| b17-storytime | northlight-events | northlight-events | northlight-events | northlight-events | northlight-events | 1 |
| b18-navigate | bird-migration | bird-migration | bird-migration | bird-migration | bird-migration | 1 |
| b19-salmon-eggs | salmon-run | salmon-run | salmon-run | salmon-run | salmon-run | 1 |
| b20-thunder | storms | storms | storms | storms | storms | 1 |
| b21-seasons-tilt | seasons | seasons | seasons | seasons | seasons | 1 |
| b22-valleys | rivers-and-lakes | rivers-and-lakes | rivers-and-lakes | rivers-and-lakes | rivers-and-lakes | 1 |
| b23-loan-weeks | northlight-loans | northlight-loans | northlight-loans | northlight-loans | northlight-loans | 1 |
| b24-bees-collect | bees | bees | bees | bees | bees | 1 |

Read the numbers honestly, in both directions:

- Three modes at 1.000 on 24 questions over 20 short documents
  proves the hybrid mechanism runs end to end, not that retrieval
  is solved. The questions use corpus vocabulary; paraphrase and
  synonym questions would expose the lexical limit both retrievers
  share, and no such question is in the set.
- The reranker made the headline number worse, not better, and
  that is kept in the record. Its one loss is b10-pollen: coverage
  tied at 0.667 between the bees chunk bees-c1 and the pollination
  chunk pollination-c0, and F1 decided for bees (0.320 against
  0.296) because the bees chunk is shorter, so its precision is
  higher. Hybrid alone had pollination first. On this set the
  reranker is a mechanism proven by its unit test, not a measured
  win; telling those apart is the point of the ablation.
- Demo query (from the runner): "How many books can members borrow
  from the Northlight library?" returns the single sentence
  "Members can borrow up to ten books for three weeks and renew
  each loan once online." with citation northlight-loans-c0, after
  the per-stage breakdown shows loans first at every stage.

Summary claim: Level 2 Build of rag-foundation, 2026-11-04: a
dependency-free hybrid search pipeline (BM25 k1=1.5 b=0.75 plus
TF-IDF cosine vector retrieval, reciprocal rank fusion k=60,
coverage and F1 reranking, extractive answers with one citation
per sentence) over a 20-document, 41-chunk synthetic corpus in 7
topics scored, on 24 labelled questions, top-1 accuracy 1.000 for
BM25 only, vector only, and hybrid, and 0.958 for hybrid plus
rerank, with recall at 3 1.000 in all four modes and MRR 1.000,
1.000, 1.000, and 0.979. 20 Build unit tests pass, 35 tests total
with Learn.

## Limits, stated plainly

- The vector side is TF-IDF, a lexical sparse vector. There are no
  dense embeddings and no external model at this level, so
  paraphrase and synonym still miss, in both retrievers. Dense
  embeddings are not in the SPEC Build scope; the Deep scope is
  query rewriting, HyDE, and multi-hop retrieval.
- The corpus is 20 synthetic documents and the question set is 24
  labelled questions written against it. No claim about scale,
  latency, or real-world accuracy is made or implied.
- The reranker did not improve the measured ranking on this set
  (see the b10 note above). Its value here is a tested mechanism
  and a named failure mode: F1 precision rewards short chunks when
  coverage ties.
- The answer is extractive: it can only repeat corpus sentences,
  and a question whose answer spans two chunks gets at most the
  best sentence of each of the top chunks.
- One chunk size (40 words, overlap 10) is used throughout, the
  Learn configuration. The chunk size trade-off is Deep level work.
- The run executed on the Muse VM (CPU), not the assigned
  BlackBoxV2 fleet node. Nothing at this size needs the fleet node.

## Next

Level 3, Deep: query rewriting, HyDE, and multi-hop retrieval per
SPEC.md, with the failure modes written, including the reranker
F1-precision failure recorded above.
