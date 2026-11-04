# Deep Spec: rag-foundation Level 3 (compressed Deep)

## Objective
Close Deep in compressed form per the December Compression Protocol:
the Deep scope in SPEC.md (query rewriting, HyDE, and multi-hop
retrieval) built properly on the Level 2 hybrid pipeline, tested,
and benchmarked with measured before and after numbers, with the
failure modes written. The rest of the v2 Deep scope (dense
embeddings, LLM based rewriting and HyDE, learned reranking, larger
real corpora, chunk size study) is named as the v1.1 backlog in
ROADMAP.md at the repo root, not silently dropped.

## What Deep adds
1. Query rewriting (deep_pipeline.py, EXPANSIONS): a deterministic
   rule based expansion table. Each content token of the question
   (Build tokenisation, with its trailing s stem) is looked up in
   the table and its expansion terms are appended to the query.
   The expanded query runs through the Build hybrid retriever
   (BM25 plus TF-IDF vector, reciprocal rank fusion). The Build
   reranker is NOT reapplied in Deep modes: the Build ablation
   measured it harmful on this corpus (it demoted b10-pollen), and
   Deep reports the reranked mode as a baseline column so the
   comparison stays visible.
2. HyDE (HydeGenerator): a deterministic hypothetical document
   built from corpus vocabulary. For each distinct query content
   term, the generator takes the terms that co-occur with it in
   corpus chunks, ranked by co-occurrence count times IDF, top 3
   per term, and assembles them into sentences. The retrieval
   query is the original question plus the hypothetical document.
   This is a lexical simulation of HyDE, not an LLM: it cannot
   invent vocabulary that is not in the corpus, and the README
   names the cases where that limit bites.
3. Multi-hop retrieval (DeepPipeline.multihop_ranking): hop 1 is
   the hybrid ranking. The anchor is the top hop 1 document.
   Bridge terms are content terms from the anchor document chunks
   that are not in the query and that appear in 2 to 5 distinct
   documents (linking terms, not anchor only jargon), sorted by
   distinct document count, then IDF, then term, top 12. Hop 2 is
   the hybrid ranking on the bridge terms alone. The final
   document ranking is a conservative union: the hop 1 document
   order is kept exactly, and hop 2 documents not already in it
   are appended in hop 2 order. By construction this mode cannot
   move the hop 1 top 3 at document level; its measured value, if
   any, is in recall at 5, pair completeness at 5, and the hop
   trace (anchor, bridge terms, hop 2 top documents), all recorded
   per question in results_deep.json.
4. Combined mode: multi-hop run on the rewritten query. Its hop 1
   is the rewrite ranking, so its single document metrics follow
   the rewrite mode, with the same hop 2 union and trace.
5. Evaluation (questions_deep.json, run_deep.py): 42 questions
   labelled before the Deep run. 24 regression questions carried
   from Build with ids unchanged, 10 paraphrase and synonym
   questions whose wording replaces corpus terms with synonyms,
   and 8 multi-hop questions whose expected answer needs two
   documents (expected_docs, two per question). Modes reported:
   the four Build modes (bm25, vector, hybrid, hybrid_rerank) and
   four Deep modes (rewrite, hyde, multihop, combined). Single
   document categories report top-1, recall at 3, and MRR. The
   multi-hop category also reports document recall at 3 and at 5
   and pair completeness at 3 and at 5 (both expected documents
   inside the first 3 or 5 documents). b10-pollen is a regression
   question and is also reported explicitly in the README.

## Commands
- Test: python -m unittest discover -s tests -p "test_deep*.py" -v
- Run: python level-3-deep/run_deep.py
- Full: python -m unittest discover -s tests -v

## Boundaries
- Always: Python 3.12 standard library only, no network, no spend,
  deterministic (same run twice gives identical results), numbers
  recorded exactly as measured, Build behaviour unchanged and
  reproducible through the Build pipeline for before and after.
- Never: a claim that the TF-IDF vector is a dense embedding, that
  the HyDE simulation is an LLM, a forced win on b10-pollen, or a
  grade for a scaffold.

## Success criteria
- Each mechanism is asserted in unit tests on hand computed or
  crafted cases, including a crafted multi-hop corpus where hop 2
  retrieves a document the hop 1 top 3 misses.
- The Deep question set is labelled before the run and the runner
  writes results_deep.json from the run, never hand typed.
- b10-pollen is reported with its actual outcome per Deep mode.
- Full test discovery passes, including the Learn and Build tests.
