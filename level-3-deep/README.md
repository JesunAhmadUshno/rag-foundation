# Level 3, Deep: rag-foundation

Status: DONE 2026-11-04 (ROADMAP-V3-BATCH, Sprint 1), as a COMPRESSED
Deep under the December Compression Protocol. Compressed means: the
Deep scope in SPEC.md (query rewriting, HyDE, and multi-hop
retrieval) was built, tested, and benchmarked in full, and the rest
of the v2 Deep scope is named as the v1.1 backlog in ROADMAP.md at
the repo root. It is not the full v2 Deep scope, and this README
does not claim it is.
Spec for this level: DEEP-SPEC.md in this folder.

## What was built

All three mechanisms sit on the Level 2 hybrid pipeline, imported
unchanged (level-2-build/pipeline.py), Python standard library only:

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

## Run it

```text
python level-3-deep/run_deep.py
python -m unittest discover -s tests -p "test_deep*.py" -v
```

No dependencies. Python 3.12 standard library only. The runner was
run twice and produced identical results_deep.json both times.

## Measured results (2026-11-04, Muse VM, Python 3.12.3)

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
metrics are defined in DEEP-SPEC.md.

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
  corpus (ROADMAP.md item 4).

## The b10-pollen case

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

## Failure modes

Query rewriting:
- The table is hand built and covers this corpus vocabulary. A
  synonym that is not a table key gets no expansion and the
  question behaves exactly like the Build modes. Table coverage,
  not the mechanism, is the limit, and growing the table from
  data is ROADMAP.md item 5.
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

## Limits, stated plainly

- Compressed Deep, by the protocol named above. The full v2 Deep
  scope is not done; its remainder is ROADMAP.md (dense
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
