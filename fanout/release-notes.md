# Release notes draft: rag-foundation

Status: DRAFT notes for releases that already exist. Dated 2026-11-04.
These notes summarise the existing GitHub releases. No new release is
created by this file.

Releases verified with gh release list on 2026-11-04:
v0.1, v0.5, and v1.0, at the URLs below.

## v0.1, Learn: TF-IDF RAG with cited extractive answers

URL: https://github.com/JesunAhmadUshno/rag-foundation/releases/tag/v0.1

- Core loop built with the Python standard library only: chunking
  (40-word windows, 10-word overlap), TF-IDF vectors with smoothed
  IDF, cosine retrieval, and extractive answers chosen by IDF-weighted
  query coverage, with one citation per sentence.
- Corpus: 6 short synthetic documents, 7 chunks.
- Measured run: 8 hand labelled questions, top-1 accuracy 8 of 8
  (1.000), recall at 3 of 8 of 8 (1.000), 8 of 8 answer sentences
  judged correct by reading.
- Tests: 15 unit tests in tests/test_learn_rag.py.
- Limits carried in the release: lexical retrieval only, tiny
  synthetic corpus, extractive answers only.

## v0.5, Build: hybrid search with reranking

URL: https://github.com/JesunAhmadUshno/rag-foundation/releases/tag/v0.5

- Hybrid search on the Learn pipeline: BM25 (k1 = 1.5, b = 0.75)
  plus TF-IDF cosine vector retrieval, fused with reciprocal rank
  fusion (k = 60), with a coverage and F1 reranker over the hybrid
  top 8, and a clean query API with a per-stage score breakdown.
- Corpus: 20 synthetic documents in 7 topics, 41 chunks, with topics
  that deliberately share vocabulary.
- Measured ablation on 24 labelled questions, same questions and
  chunking in all modes: top-1 accuracy 1.000 for BM25 only, vector
  only, and hybrid, and 0.958 for hybrid plus rerank (23 of 24);
  recall at 3 of 1.000 in all four modes; MRR 1.000, 1.000, 1.000,
  and 0.979. The reranker loss is b10-pollen (bees ranked first,
  pollination second), kept in the record with its cause.
- Tests: 20 Build unit tests, 35 in total with Learn.
- Limits carried in the release: the vector side is TF-IDF, not a
  dense embedding; synthetic corpus only; extractive answers only.

## v1.0, Deep: query rewriting, lexical HyDE, multi-hop retrieval

URL: https://github.com/JesunAhmadUshno/rag-foundation/releases/tag/v1.0

- Compressed Deep under the December Compression Protocol: the full
  SPEC Deep scope in lexical form, built on the Build hybrid
  pipeline, imported unchanged.
- Query rewriting: a deterministic expansion table keyed on stemmer
  output. On 10 paraphrase questions, top-1 rises from 0.500 (hybrid)
  and 0.300 (hybrid plus rerank) to 1.000, with recall at 3 and MRR
  of 1.000; regression top-1 held at 1.000 (24 of 24).
- HyDE: a lexical simulation from corpus co-occurrence, not an LLM.
  Top-1 0.917 on regression and 0.500 on paraphrase, with no overall
  win over hybrid, reported as such with its failure modes.
- Multi-hop: bridge terms from the hop 1 anchor document, hop 2 on
  bridge terms, conservative union. Pair completeness at 3 and at 5
  is 1.000, the same as hybrid; hop 2 placed the second expected
  document in its top 3 for 6 of 8 questions.
- b10-pollen: every Deep mode ranks pollination first. For the
  rewrite, multi-hop, and combined modes the fix is by subtraction
  (hybrid without the Build reranker).
- Evaluation set: 42 labelled questions (24 regression, 10
  paraphrase, 8 multi-hop) over the same 20-document, 41-chunk
  corpus. Full traces are in level-3-deep/results_deep.json.
- Tests: 17 Deep unit tests, 52 in total with Learn and Build.
- The rest of the v2 Deep scope is the v1.1 backlog in ROADMAP.md.
  It is not part of v1.0 and is not claimed by these notes.
