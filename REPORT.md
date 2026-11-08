# Report: rag-foundation

Status: EXPLORATORY, 2026-11-08. Not pre-registered: no plan with
hypotheses and pass lines was committed before the code and the
results (PROPOSAL.md, "Why this repo is not pre-registered"). Every
number below is a recorded run that regenerates byte for byte from the
code and the question sets, but each question set was written in the
same cycle as the method it scores, so none of it is confirmatory. The
confirmatory re-run is planned in PROPOSAL.md as a draft; it is not
locked and has not run.

Scope: this project builds a retrieval-augmented generation (RAG)
system. Judging RAG systems is the job of rag-eval-harness (P06).

## Current state

| Evidence | Result |
| --- | --- |
| Learn run, 8 questions, 6 documents (src/run_rag.py, 2026-11-04) | Top-1 8 of 8, recall at 3 8 of 8; printed by the runner, not saved to a file |
| Build ablation, 24 questions, 20 documents, 41 chunks (results/results_build.json) | Top-1 1.000 for BM25, TF-IDF vector and hybrid; 0.958 for hybrid plus rerank (b10-pollen) |
| Deep evaluation, 42 questions (results/results_deep.json) | Paraphrase top-1 0.500 hybrid to 1.000 with rewriting; HyDE and multi-hop show no gain |
| Uncertainty and leakage (site/src/stats.check.mjs, site/src/rag.check.mjs, from results/results_deep.json) | Paired difference 0.500, 95% bootstrap interval 0.200 to 0.800; exact McNemar p = 0.0625; 6 of 10 paraphrase questions stay at rank 1 without their own expansion keys |
| Tests | 52 unit tests plus the layout test, in CI on Python 3.11 and 3.12 |
| Reproduction | CI re-runs both runners and fails if results/ changes by one byte |

## Questions scored

There were no registered hypotheses, so these are the questions each
stage asked, answered from the recorded runs. Misses are shown. None
of these counts as a confirmatory result.

| Question (post hoc) | Answer on this corpus | Evidence |
| --- | --- | --- |
| Q1. Does hybrid (RRF) beat BM25 or TF-IDF alone? | Cannot tell: all three score 1.000 top-1 on the 24 Build questions (ceiling) | results/results_build.json, summary |
| Q2. Does the coverage and F1 reranker help? | No. It lowers top-1 from 1.000 to 0.958 (one question, b10-pollen; McNemar p = 1) | results/results_build.json; site/src/stats.check.mjs |
| Q3. Does deterministic query rewriting close the paraphrase gap? | On this set, yes: 0.500 to 1.000 top-1 (n = 10), paired interval 0.200 to 0.800, but p = 0.0625 (not significant at 0.05) and most of the gain uses expansion keys written for those questions (6 of 10 without them) | results/results_deep.json; site/src/stats.check.mjs; site/src/rag.check.mjs |
| Q4. Does a lexical HyDE simulation help? | No. Paraphrase top-1 0.500, same as hybrid; regression top-1 drops to 0.917 | results/results_deep.json |
| Q5. Does bridge-term multi-hop help? | Not detectable: hybrid already reaches pair completeness 1.000 at 3, and the conservative union cannot change the top 3 by construction | results/results_deep.json |

## Reproduce

```text
python3 src/run_rag.py
python3 src/run_build.py
python3 src/run_deep.py
git diff --exit-code results/
node site/src/stats.check.mjs
python3 site/export.py && node site/src/rag.check.mjs
```

The first three need only Python 3 (standard library). The last two
need Node 22 (no npm packages for these two scripts).

## Compute, data and versions

- Recorded runs: 2026-11-04, Muse VM (CPU), Python 3.12.3, standard
  library only. No GPU, no model, no network, no paid service.
- CI re-runs every runner on Python 3.11 and 3.12 and checks that
  results/ regenerates unchanged.
- Data: synthetic, written for this project. The Learn corpus is in
  src/rag.py; the Build corpus (20 documents, 41 chunks) is in
  src/corpus.py. Question sets with labels: experiments/questions_build.json
  (24) and experiments/questions_deep.json (42, the 24 Build questions
  plus 10 paraphrase and 8 multi-hop).
- Uncertainty: percentile bootstrap, 4000 resamples, seed 20261104
  (site/src/stats.js); exact two-sided McNemar test.

## Background: Learn (recorded 2026-11-04)

The section below is the Learn write-up as it stood, moved here from
level-1-learn/README.md. Paths are updated to the new layout.

Status: DONE 2026-11-04 (ROADMAP-V3-BATCH, Sprint 1 of the December
Compression Protocol). Evidence: the code (now in src/), 15 unit
tests in tests/test_learn_rag.py, and the measured run recorded
below. Build and Deep are not started.

### The idea in one paragraph

A retrieval-augmented generation system answers a question from
documents instead of from memory: split the documents into chunks,
turn each chunk into a vector, retrieve the chunks closest to the
question, and compose the answer from those chunks with a citation
for every claim. This level builds that whole loop small and in the
open, with the Python standard library only: no embeddings model, no
vector database, no language model. The answer step is extractive,
so every answer sentence is a sentence copied word for word from a
retrieved chunk, and every sentence carries its source.

### The pipeline in rag.py

1. Chunk. chunk_document splits a document into word windows
   (default 40 words, 10 words of overlap, step 30). Overlap keeps a
   fact that straddles a boundary present in at least one chunk.
   Chunk ids look like library-c1: document id plus chunk index.
2. Embed. Each chunk becomes a TF-IDF vector, a dict of term to
   weight. Term frequency is the raw count. IDF is smoothed:
   idf(t) = log((1 + N) / (1 + df(t))) + 1 over the chunk set, so a
   term in every chunk weighs 1.0 and a rarer term weighs more.
   Terms are content tokens: lowercase words and numbers, stopwords
   removed, with a crude trailing-s stem (plants and plant match;
   words ending in sis are protected, so photosynthesis survives).
3. Retrieve. The question is embedded with the corpus IDF and
   chunks are ranked by cosine similarity. Zero scores are dropped,
   ties break on chunk id, so the ranking is deterministic.
4. Answer. From each retrieved chunk, the sentence with the highest
   IDF-weighted query coverage is picked: the share of the
   question's total IDF weight that the sentence's terms carry.
   Later sentences must reach 0.30 coverage or they are dropped.
   The result is the picked sentences plus one citation per
   sentence, as (doc id, chunk id).

Why coverage, not cosine, for the sentence step: on the water cycle
questions, plain sentence cosine tied or won for the short topic
sentence ("The water cycle moves water between the earth and the
sky") because it is short and repeats the topic words, even though
it answers nothing. Coverage rewards covering more of the question,
so the condensation and evaporation sentences win. That failure and
its fix are locked in by a regression test
(test_answer_picks_the_answering_sentence).

### Run it

```text
python src/run_rag.py
python -m unittest discover -s tests -p "test_learn*.py" -v
```

No dependencies. Python 3.12 standard library only.

### Learn: measured results (2026-11-04, Muse VM, Python 3.12.3)

The corpus (in rag.py) holds 6 short synthetic documents (about 40
words each: photosynthesis, water cycle, gravity, bees, volcanoes,
a fictional library). Chunking at 40 words with 10 words of overlap
makes 7 chunks; only the library document splits, into two
overlapping chunks. The 8 questions in run_rag.py were labelled by
hand with their expected source document before any run.

| Question | Expected doc | Top-1 doc | Top-1 score | Expected in top 3 | Answer sentence |
| --- | --- | --- | --- | --- | --- |
| q01-absorb | photosynthesis | photosynthesis | 0.575 | yes | Plants absorb carbon dioxide from the air and water from the soil. |
| q02-clouds | water-cycle | water-cycle | 0.489 | yes | Water vapour cools, condensation forms clouds, and precipitation falls as rain or snow before collecting again. |
| q03-newton | gravity | gravity | 0.517 | yes | Isaac Newton described gravity as a universal attraction between masses. |
| q04-bees | bees | bees | 0.647 | yes | Bees communicate the location of flowers by performing a waggle dance inside the hive. |
| q05-magma | volcanoes | volcanoes | 0.501 | yes | Magma becomes lava when it reaches the surface during an eruption. |
| q06-books | library | library | 0.473 | yes | Members can borrow up to ten books for three weeks. |
| q07-oxygen | photosynthesis | photosynthesis | 0.575 | yes | Inside leaves, sunlight powers a chemical change that makes glucose, and plants release oxygen into the air. |
| q08-evaporation | water-cycle | water-cycle | 0.489 | yes | Heat from the sun causes evaporation from oceans, lakes, and rivers. |

Summary: top-1 accuracy 8 of 8 (1.000), recall at 3 is 8 of 8
(1.000). Answer correctness was judged by reading each returned
sentence against the corpus: 8 of 8 sentences state the fact the
question asked for, and 8 of 8 answers carry exactly one citation
per sentence.

Read the numbers honestly: 8 of 8 on 8 questions over 6 tiny
documents with almost no vocabulary overlap between topics proves
the loop works end to end, not that retrieval is good. The topics
were chosen so a human can check every result by eye. Harder
corpora, where documents share vocabulary and questions paraphrase
the text, are exactly where this lexical method weakens, and they
arrive at Build level.

### Limits, stated plainly

- The TF-IDF embedding is lexical: it misses paraphrase and synonym.
  A question that says "release" matches "releases" only through
  the crude stem, and a question in entirely different words from
  the document scores zero and gets no answer. Dense embeddings are
  Build level work in PROPOSAL.md, next to hybrid search (BM25 plus
  vector) and reranking.
- The corpus is 6 synthetic documents and 7 chunks. No claim about
  scale, latency, or real-world accuracy is made or implied.
- The answer is extractive: it can only repeat corpus sentences, so
  it cannot combine facts across chunks into a new sentence, and a
  question whose answer spans two chunks gets at most the best
  sentence of each. Generative answering is Build level work.
- One chunk size (40 words, overlap 10) is used throughout. The
  chunk size trade-off (small chunks retrieve precisely, large
  chunks carry context) is measured at Build and Deep, not here.
- The run executed on the Muse VM (CPU), not the assigned
  BlackBoxV2 fleet node. Nothing at this size needs the fleet node;
  it matters from Build, where the corpus and the models grow.

### Next

Level 2, Build: hybrid search (BM25 plus vector) with reranking and
a clean query API per PROPOSAL.md, over a larger corpus, with the same
citation discipline carried through the generative answer step.

## Method and results: Build (recorded 2026-11-04)

Moved from level-2-build/README.md; the Build spec is in PROPOSAL.md.

Status: DONE 2026-11-04 (ROADMAP-V3-BATCH, Sprint 1 of the December
Compression Protocol). Evidence: the code (now in src/), 20 Build
unit tests in tests/test_build_pipeline.py (35 tests total with
Learn), and the measured ablation recorded below and in
results_build.json, written by the runner. Deep is not started.
Spec for this level: PROPOSAL.md.

### What was built

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

### Run it

```text
python src/run_build.py
python -m unittest discover -s tests -p "test_build*.py" -v
```

No dependencies. Python 3.12 standard library only.

### Build: measured results (2026-11-04, Muse VM, Python 3.12.3)

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

### Limits, stated plainly

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

### Next

Level 3, Deep: query rewriting, HyDE, and multi-hop retrieval per
PROPOSAL.md, with the failure modes written, including the reranker
F1-precision failure recorded above.

## Method and results: Deep (recorded 2026-11-04)

Moved from level-3-deep/README.md; the Deep spec is in PROPOSAL.md.

Status: DONE 2026-11-04 (ROADMAP-V3-BATCH, Sprint 1), as a COMPRESSED
Deep under the December Compression Protocol. Compressed means: the
Deep scope in PROPOSAL.md (query rewriting, HyDE, and multi-hop
retrieval) was built, tested, and benchmarked in full, and the rest
of the v2 Deep scope is named as the v1.1 backlog in Future work below.
It is not the full v2 Deep scope, and this section
does not claim it is.
Spec for this level: PROPOSAL.md.

### What was built

All three mechanisms sit on the Level 2 hybrid pipeline, imported
unchanged (src/pipeline.py), Python standard library only:

1. Query rewriting (deep_pipeline.py, EXPANSIONS): a deterministic
   rule based expansion table, keyed on the Build tokeniser stems
   (the question word "debris" stems to "debri", "droplets" to
   "droplet"). Expansion terms for each question token are appended
   to the question, and the expanded text runs through the Build
   hybrid retriever (BM25 plus TF-IDF vector, RRF fusion). Deep
   modes do not reapply the Build reranker, because the Build
   ablation measured it harmful on this corpus (b10-pollen, below);
   the reranked mode stays in every table as a baseline column.
2. HyDE (HydeGenerator): a deterministic hypothetical document
   built from corpus vocabulary. For each distinct question term,
   terms that co-occur with it in corpus chunks are ranked by
   co-occurrence count times IDF, top 3 per term, and assembled
   into sentences. The retrieval query is the question plus the
   hypothetical document. This is a lexical simulation of HyDE,
   not an LLM, and its main limit is measured below.
3. Multi-hop retrieval (DeepPipeline.multihop_ranking): hop 1 is
   the hybrid ranking and its top document is the anchor. Bridge
   terms are anchor document terms that are not in the question
   and that appear in 2 to 5 distinct documents, sorted by
   distinct document count, then IDF, then term, top 12. Hop 2 is
   the hybrid ranking on the bridge terms alone. The final
   document ranking is a conservative union: the hop 1 document
   order is kept exactly and hop 2 only documents are appended.
   A combined mode runs the same multi-hop on the rewritten query.
   Every question record in results_deep.json carries the trace:
   expansions, hypothetical document, anchor, bridge terms, and
   the top 5 documents of each hop.

### Run it

```text
python src/run_deep.py
python -m unittest discover -s tests -p "test_deep*.py" -v
```

No dependencies. Python 3.12 standard library only. The runner was
run twice and produced identical results_deep.json both times.

### Deep: measured results (2026-11-04, Muse VM, Python 3.12.3)

Method: the 42 questions in questions_deep.json were labelled with
their expected document or documents when the set was authored,
before the Deep run. The 24 Build questions are carried in as the
regression category with ids unchanged. The paraphrase category is
10 questions whose wording replaces corpus terms with synonyms.
The multi-hop category is 8 questions whose expected answer needs
two documents. All modes use the same corpus (20 documents, 41
chunks) and the same chunking. Rankings are collapsed to documents
and scored at document level. For the multi-hop category, top-1
and MRR are scored on the first expected document, and the pair
metrics are defined in PROPOSAL.md.

Regression (24 questions):

| Mode | Top-1 | Recall at 3 | MRR |
| --- | --- | --- | --- |
| BM25 only | 1.000 | 1.000 | 1.000 |
| Vector only (TF-IDF) | 1.000 | 1.000 | 1.000 |
| Hybrid (RRF) | 1.000 | 1.000 | 1.000 |
| Hybrid plus rerank | 0.958 | 1.000 | 0.979 |
| Deep rewrite | 1.000 | 1.000 | 1.000 |
| Deep HyDE | 0.917 | 1.000 | 0.958 |
| Deep multi-hop | 1.000 | 1.000 | 1.000 |
| Deep combined | 1.000 | 1.000 | 1.000 |

Paraphrase (10 questions):

| Mode | Top-1 | Recall at 3 | MRR |
| --- | --- | --- | --- |
| BM25 only | 0.400 | 0.800 | 0.567 |
| Vector only (TF-IDF) | 0.500 | 0.800 | 0.600 |
| Hybrid (RRF) | 0.500 | 0.800 | 0.600 |
| Hybrid plus rerank | 0.300 | 0.800 | 0.550 |
| Deep rewrite | 1.000 | 1.000 | 1.000 |
| Deep HyDE | 0.500 | 0.700 | 0.608 |
| Deep multi-hop | 0.500 | 0.800 | 0.607 |
| Deep combined | 1.000 | 1.000 | 1.000 |

Multi-hop (8 questions, 2 expected documents each):

| Mode | Top-1 (first doc) | Doc recall at 3 | Doc recall at 5 | Pair at 3 | Pair at 5 |
| --- | --- | --- | --- | --- | --- |
| BM25 only | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| Vector only (TF-IDF) | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| Hybrid (RRF) | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| Hybrid plus rerank | 0.875 | 0.938 | 1.000 | 0.875 | 1.000 |
| Deep rewrite | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| Deep HyDE | 0.875 | 1.000 | 1.000 | 1.000 | 1.000 |
| Deep multi-hop | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| Deep combined | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |

Paraphrase per-question summary (expected rank of the expected
document; a dash means the document was absent from the ranking):

| Question | Expected | Hybrid rank | Rerank rank | Rewrite rank | HyDE rank | Combined rank |
| --- | --- | --- | --- | --- | --- | --- |
| p01-condensation | water-cycle | - | - | 1 | - | 1 |
| p02-molten | volcanoes | 3 | 2 | 1 | 4 | 1 |
| p03-rumble | storms | - | - | 1 | - | 1 |
| p04-tremor-spot | earthquakes | 3 | 2 | 1 | 3 | 1 |
| p05-storytelling | northlight-events | 3 | 2 | 1 | 1 | 1 |
| p06-byproduct | photosynthesis | 1 | 2 | 1 | 2 | 1 |
| p07-propagules | seed-dispersal | 1 | 1 | 1 | 1 | 1 |
| p08-stigma | pollination | 1 | 1 | 1 | 1 | 1 |
| p09-debris | rivers-and-lakes | 1 | 2 | 1 | 1 | 1 |
| p10-blossom-location | bees | 1 | 1 | 1 | 1 | 1 |

Multi-hop per-question summary (ranks of the two expected
documents, hybrid then multi-hop, and whether hop 2 placed the
second expected document in its top 3):

| Question | Expected docs | Hybrid ranks | Multi-hop ranks | Hop 2 finds second doc in top 3 |
| --- | --- | --- | --- | --- |
| m01-waggle-process | bees, pollination | 1, 2 | 1, 2 | yes |
| m02-newton-coasts | gravity, ocean-tides | 1, 2 | 1, 2 | yes |
| m03-loans-hours | northlight-loans, northlight-hours | 1, 3 | 1, 3 | yes |
| m04-pollen-seeds | pollination, seed-dispersal | 1, 3 | 1, 3 | yes |
| m05-glucose-seeds | photosynthesis, seed-dispersal | 1, 2 | 1, 2 | no |
| m06-cells-gates | solar-power, hydro-power | 1, 2 | 1, 2 | yes |
| m07-navigate-cycle | bird-migration, seasons | 1, 2 | 1, 2 | yes |
| m08-salmon-waters | salmon-run, rivers-and-lakes | 1, 2 | 1, 2 | no |

Read the numbers honestly:

- Rewriting is the measured win of this level. On the paraphrase
  set it takes top-1 from 0.500 (hybrid) and 0.300 (hybrid plus
  rerank) to 1.000, and it keeps the regression set at 1.000.
  Two paraphrase questions (p01, p03) are absent from every Build
  ranking entirely: no Build mode retrieves the expected document
  at any rank, and rewriting retrieves it at rank 1.
- HyDE is not a win on this corpus. It fixes no paraphrase
  question that hybrid missed at rank 1 except p05 (which hybrid
  had at rank 3), it demotes two regression questions (below),
  and its single document top-1 over regression plus paraphrase
  is 0.794 against 0.853 for hybrid. It is kept as a tested
  mechanism with named failure modes, not as an improvement.
- Multi-hop shows no headline gain on this corpus, and that is
  stated plainly: the hybrid already co-retrieves both expected
  documents inside its top 3 for all 8 multi-hop questions, so
  pair completeness is 1.000 before and after. The mechanism is
  proven where it can be proven here: hop 2 placed the second
  expected document in its top 3 for 6 of 8 questions from bridge
  terms alone, and a crafted unit test corpus, where the target
  document shares no query term and is absent from the hop 1
  ranking entirely, shows hop 2 retrieving it and the union
  carrying it. On a corpus this small, that is the honest
  evidence available; a ranking gain claim would need a larger
  corpus (Future work item 4).

### The b10-pollen case

b10-pollen ("What carries pollen from flower to flower so
pollination can happen?", expected pollination) is the named
Build regression case: hybrid plus rerank ranked bees first and
pollination second. In the Deep run, every Deep mode ranked
pollination first, so on this set Deep does fix the case, with
the mechanism stated exactly:

- The rewrite table adds no expansion terms for this question
  (its trace expansions list is empty). The rewrite, multi-hop,
  and combined modes recover pollination because they run the
  hybrid fusion without the Build reranker whose coverage tie
  and F1 precision rule demoted it at Build. The fix is
  subtractive, not a rewriting win, and it is not reported as one.
- The HyDE mode recovers it by a different route: its
  hypothetical document for this question contains the
  pollination terms "fertilisation" and "stigma", which are in
  the pollination chunks and not in the bees chunks.

### Failure modes

Query rewriting:
- The table is hand built and covers this corpus vocabulary. A
  synonym that is not a table key gets no expansion and the
  question behaves exactly like the Build modes. Table coverage,
  not the mechanism, is the limit, and growing the table from
  data is Future work item 5.
- Keys must match the Build stemmer output exactly (for example
  "debri" for "debris"). A key written in unstemmed form would
  silently never fire; a unit test pins the stemmed keys for
  "droplets" and "debris".

HyDE (lexical simulation):
- Unseen vocabulary is fatal, by construction. For
  p01-condensation the hypothetical document was "become magma
  molten reache. gather feed they bear." and water-cycle stayed
  absent; for p03-rumble it was "after coconut eating floating."
  and storms stayed absent. An LLM HyDE could invent the missing
  vocabulary; this simulation cannot, and does not claim to.
- Sibling confusion: on b06-books-count and b23-loan-weeks the
  hypothetical document pulled in Northlight events vocabulary
  and demoted northlight-loans to rank 2 behind
  northlight-events, the only two regression questions any Deep
  mode lost at rank 1.
- Co-occurrence also surfaces stemmed noise (the b10 document
  includes "carrie", "bodie", "axi"), which adds broad terms that
  help nothing. The IDF weighting limits this; it does not
  remove it.

Multi-hop:
- Bridge terms are neighbours of the anchor, not a guarantee of
  the target. On m05 the anchor is photosynthesis and its bridge
  terms contain no seed link (seed and wind are question terms
  and are excluded), so hop 2 missed seed-dispersal in its top 3.
  On m08 the linking term river appears in 4 documents and fell
  below the 12 term cut behind 2 and 3 document terms, and hop 2
  missed rivers-and-lakes in its top 3.
- The conservative union cannot improve top-1 or recall at 3 by
  construction; it only appends. That choice was made so the
  mode can never repeat the Build reranker pattern of a Deep
  step making the headline number worse, and its cost is that
  any gain shows only at rank 5 and beyond, or on corpora where
  hop 1 misses a document entirely.

### Deep limits, stated plainly

- Compressed Deep, by the protocol named above. The full v2 Deep
  scope is not done; its remainder is Future work below (dense
  embeddings, LLM rewriting and HyDE, learned reranking, larger
  real corpus, chunk size study, workshop paper submission).
- The corpus is the Build corpus: 20 synthetic documents, 41
  chunks, and the question set is 42 labelled questions written
  against it. Top-1 of 1.000 for rewriting on 34 single document
  questions proves the expansion mechanism on this vocabulary,
  not retrieval quality at scale or on real text.
- The HyDE here is a lexical simulation. No LLM, no dense
  embedding, and no external model is used anywhere in this repo.
- The run executed on the Muse VM (CPU), not the assigned
  BlackBoxV2 fleet node. Nothing at this size needs the fleet node.

Summary claim: Level 3 Deep of rag-foundation, 2026-11-04, compressed Deep: query rewriting (deterministic synonym expansion), a lexical HyDE simulation (co-occurrence hypothetical documents from corpus vocabulary, not an LLM), and multi-hop retrieval (bridge terms from the hop 1 anchor document, hop 2 on bridge terms, conservative union) were built on the Level 2 hybrid pipeline over the same 20-document, 41-chunk synthetic corpus and measured on 42 labelled questions (24 regression, 10 paraphrase, 8 multi-hop). On paraphrase questions, top-1 accuracy rose from 0.500 hybrid (0.300 hybrid plus rerank) to 1.000 with rewriting, with recall at 3 1.000 and MRR 1.000; on regression questions rewriting kept top-1 at 1.000 (24 of 24). HyDE scored top-1 0.917 on regression and 0.500 on paraphrase and did not beat hybrid overall. Multi-hop pair completeness at 3 and at 5 was 1.000, the same as hybrid, with the hop 2 ranking placing the second expected document in its top 3 for 6 of 8 multi-hop questions. For b10-pollen, hybrid plus rerank ranked bees first and every Deep mode ranked pollination first. 17 Deep unit tests pass, 52 tests total with Learn and Build.

## Review findings (2026-11-07)

Moved from docs/research-review.md. The review's letter grades are
internal and are not published here; the evidence column is kept.

Reviewed 2026-11-07 against a doctoral-level rubric for empirical
information-retrieval work.
Recorded numbers come from
`results/results_build.json` and `results/results_deep.json`.
Numbers marked *new* were computed during this review by the browser
port in `site/src/` (the parity gate in `site/src/rag.check.mjs` proves
it reproduces every recorded ranking first). Reproduce them with
`cd site && npm ci && npm run build`, which prints them, or in the
dashboard's Sensitivity lab and leakage probe.

### Summary

The engineering is clean and honest: a dependency-free pipeline, 52
fast unit tests, committed results that the runners reproduce byte for
byte, and named failure cases. The research claim is narrow, and the
repo mostly says so. The main weaknesses are external validity (20
synthetic documents), a rewrite table authored next to the questions
it is scored on, and no uncertainty on n = 10 and n = 8 subsets. This
review fixes the cheap gaps (uncertainty, paired tests, a leakage
probe, a sensitivity sweep, a JS/Python parity gate) and names the
compute and data each remaining gap needs.

### Rubric

| Criterion | Evidence and gap |
| --- | --- |
| Research question | Clear per level (does hybrid beat single retrievers; do rewrite, HyDE and multi-hop close the paraphrase and multi-hop gaps). Not phrased as a falsifiable hypothesis before the runs. |
| Hypotheses | No pre-stated hypotheses or decision thresholds. The Deep question set and the expansion table were written in the same cycle. |
| Method | Fully specified and deterministic: 40-word chunks with 10-word overlap, BM25 (k1 1.5, b 0.75), TF-IDF cosine, RRF k 60, rerank depth 8, extractive answers. Same chunking and questions across modes. |
| Baselines | BM25, TF-IDF and hybrid are internal baselines. No standard implementation (Pyserini, rank_bm25), no dense retriever, no framework baseline. PROPOSAL.md says "no measurement yet". |
| Statistics and uncertainty | Recorded results are point estimates on n = 24 / 10 / 8. *Fixed now:* seeded percentile bootstrap 95% CIs per mode and metric, exact McNemar tests and a paired bootstrap, computed from the recorded per-question outcomes. |
| Reproducibility | Stdlib only, runners regenerate the committed JSON exactly, CI runs them on Python 3.11 and 3.12. *Added:* the dashboard build fails if the JS port drifts from the recorded rankings, traces or summaries. |
| Threats to validity | Failure cases written up (b10-pollen, p01/p03, HyDE siblings, m05/m08). *Added:* leakage probe, ceiling-effect note, sensitivity sweep. |
| Related work | PROPOSAL.md surveys the area, but nothing is measured against prior work and PROPOSAL.md is an unfilled draft. |
| Limitations | The level READMEs state the synthetic corpus, the lexical-only HyDE and the compressed Deep scope plainly. Missing: small-n, leakage and single-annotator labels. The dashboard's Limits window now lists them. |
| Engineering rigour | 52 unit tests in under a second, ruff in CI, small modules, no network or model calls, deterministic tie-breaks. |

### What the cheap upgrades found

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
   (Future work item 6). Varying chunk size (overlap 10, other defaults),
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

### Remaining gaps and exactly what each needs

| Gap | What closes it | Compute and data |
| --- | --- |
| External validity | Rerun all 8 modes on a public benchmark (BEIR SciFact, about 5k docs and 300 test queries; or NFCorpus) | CPU only, minutes with the stdlib pipeline; free public data download; no GPU |
| Rewrite leakage | A held-out paraphrase set of 30+ questions written by someone who has not seen EXPANSIONS, with the table frozen first | Human time (a second author), no compute |
| Statistical power | At least 50 paraphrase and 50 multi-hop questions so a 0.2 top-1 difference is testable; report McNemar and bootstrap CIs | Question authoring; CPU seconds |
| Standard baselines | rank_bm25 or Pyserini BM25 on the same chunks and questions | `pip install rank_bm25` (pure Python) or a JVM for Pyserini; CPU minutes |
| Dense retrieval (Future work item 1) | A small open embedding model (e.g. all-MiniLM-L6-v2) in place of or fused with TF-IDF | CPU is enough for 41 chunks; about 100 MB model download; GPU only for a large corpus |
| LLM rewrite and HyDE (Future work item 2) | A local open model behind the existing interfaces, on p01 and p03 especially | A local GPU or a paid API; needs the owner's credential and cost decision |
| Learned reranker (Future work item 3) | A cross-encoder (e.g. ms-marco-MiniLM-L-6-v2) with b10-pollen as a regression case | CPU feasible at this size; about 90 MB model |
| Answer quality | Exact match / token F1 against written reference answers, plus a second annotator and agreement (Cohen's kappa) on retrieval labels | Human labelling time; CPU seconds |
| Hyperparameter study | Record the sweep (chunk size, k1, b, RRF k, rerank depth) as a committed result on the larger set, with a held-out split for choosing settings | CPU minutes |
| Related work and novelty | Fill PROPOSAL.md with a measured comparison to the baselines above and cite BM25, RRF (Cormack et al. 2009), HyDE (Gao et al. 2022) | Reading time; no compute |
| Latency and scale | Time indexing and queries at 10^3 to 10^5 chunks | CPU minutes; synthetic or BEIR text |

### Reviewer's conclusion

As engineering, ready to show. As research, a well-documented pilot on
a toy corpus: the rewrite gain is real on this set but not significant
at n = 10 and largely tied to the hand-built table, the reranker loss
is one question, and HyDE and multi-hop show no effect that this set
could detect. The next result worth having is the same eight modes on
a public benchmark with a held-out paraphrase set.

## Threats to validity

All are stated in the sections above; in short:

- External validity: 20 synthetic documents and 42 questions, one
  author, one corpus. Nothing here is a claim about real text or scale.
- Leakage: the rewrite expansion table was written next to the
  paraphrase questions it is scored on (Review findings, item 3).
- Power: n = 10 paraphrase and n = 8 multi-hop questions; the rewrite
  gain is not significant at 0.05.
- Ceiling: regression and multi-hop sit at 1.000 for most modes, so
  they cannot rank methods.
- No pre-registration: questions and methods were written in the same
  cycle as the runs.

## Future work

Moved from ROADMAP.md (v1.0, 2026-11-04). v1.0 closed Learn, Build,
and compressed Deep: the SPEC Deep scope in lexical form (deterministic
query rewriting, a co-occurrence HyDE simulation, and bridge term
multi-hop retrieval), measured on a 42 question set with the failure
modes written. The items below are the rest of the v2 Deep scope. None
of them is done, and none is claimed. The confirmatory re-run in
PROPOSAL.md draws on items 1 to 4.

## v1.1 backlog

1. Dense embeddings: replace or augment the TF-IDF vector side
   with a real dense embedding model, run the same 42 question
   evaluation plus the Build ablation, and report whether the
   paraphrase gap that rewriting closes lexically also closes
   semantically. Needs a free local model route; no spend and no
   new credential is created by this project on its own.
2. LLM query rewriting and HyDE: generate rewrites and
   hypothetical documents with a real model behind the same
   interfaces used at v1.0, and measure them against the
   deterministic table and the lexical simulation on the same
   set, including the p01 and p03 cases the simulation cannot
   reach. Needs a credential decision from Jesun.
3. Learned or cross-encoder reranking: the Build reranker is a
   measured loss on this corpus (b10-pollen) and Deep modes
   bypass it. A learned reranker should be compared on the same
   discipline, with b10 as a named regression case that must
   stay fixed.
4. Larger real corpus: move beyond the 20 synthetic documents to
   a larger corpus with real documents and a question set in the
   hundreds, where multi-hop retrieval can show a ranking gain
   or fail honestly, and where recall ceilings bind. Re-run all
   Deep modes and re-baseline from that run.
5. Data driven expansion table: grow or replace the hand built
   EXPANSIONS table from query logs or a synonym resource, with
   the same stemmed key discipline and a test per added family,
   so table coverage stops being the rewriting limit.
6. Chunk size study: the 40 word, 10 word overlap configuration
   is inherited from Learn and was never varied. Measure the
   Deep modes across chunk sizes on the same question set.
7. Workshop paper submission: the Build ablation plus the Deep
   before and after tables are the paper angle named in PROPOSAL.md
   (a hybrid search ablation). Submission itself is Jesun's tap
   and is not part of any automated run.

## Standing rules for v1.1 work

- The Build pipeline stays importable and unchanged in behaviour
  unless a change is itself measured before and after on the
  Deep question set.
- b10-pollen stays a named regression case in every future run:
  any mode that ranks bees first on it is reported as a
  regression, not averaged away.
- Every new number in a README comes from a run executed in that
  cycle. Nothing is carried forward as if it were freshly
  measured.

## Conclusion

As engineering, the pipeline runs end to end, is deterministic, and
its recorded results regenerate exactly in CI. As research it is an
exploratory pilot on a toy corpus: rewriting is the only mechanism
with a measured gain, that gain is not significant at n = 10 and is
largely tied to the hand-built table, the reranker loss is one
question, and HyDE and multi-hop show no effect this set could detect.
The next result worth having is the confirmatory re-run in
PROPOSAL.md: the same modes on a public benchmark with a held-out
paraphrase set, under a plan locked before it runs.
