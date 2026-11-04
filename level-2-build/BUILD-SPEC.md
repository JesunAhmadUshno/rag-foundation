# Build Spec: rag-foundation Level 2

## Objective
Close Build per SPEC.md acceptance: the system runs end to end, tests
pass, and one benchmark table with method is in the README. Build adds
hybrid search on top of the Learn TF-IDF pipeline:
1. A larger synthetic corpus (20 documents, 7 topics, deliberate
   vocabulary overlap between topics) chunked with the Learn approach
   (40-word windows, 10-word overlap).
2. Two retrievers over the same chunks: BM25 (k1 = 1.5, b = 0.75) and
   a vector retriever. The vector side is TF-IDF cosine, exactly as in
   Learn. It is not a dense embedding model, and no file claims it is.
3. Hybrid fusion of the two rankings by reciprocal rank fusion
   (k = 60), then a reranker that re-scores the hybrid top candidates
   by query coverage, then token F1, then the hybrid score, in the
   style proven in the rag-eval-harness Deep level.
4. A clean query API: RagPipeline.query(question, top_k) returns
   extractive answer sentences with one citation per sentence, plus a
   per-stage score breakdown (bm25, vector, hybrid, reranked).
5. An ablation on one labelled question set (24 questions, expected
   doc ids labelled before the run): BM25 only, vector only, hybrid,
   hybrid plus rerank, same questions and same chunking for all modes,
   reporting top-1 accuracy, recall at 3, and MRR per mode.

## Assumptions
- Python standard library only. No external model, API, credential,
  or spend. No dense embeddings at this level; that limit is stated
  in the README, not hidden.
- The corpus and question set are synthetic and labelled as synthetic.
  They prove the hybrid mechanism end to end, not production quality.
- The answer step stays extractive, carrying the Learn citation
  discipline: one citation per sentence, sentences copied word for
  word from retrieved chunks.

## Commands
- Test: python -m unittest discover -s tests -p "test_build*.py" -v
- Run: python level-2-build/run_build.py
- Full: python -m unittest discover -s tests -v

## Boundaries
- Always: stdlib only, deterministic rankings (ties break on chunk
  id), hand-checkable formulas with constants stated, results
  recorded exactly as measured.
- Never: an external call, a new credential, a claim that TF-IDF is a
  dense embedding, a tuned-after-the-fact question set presented as
  labelled in advance, or a grade for a scaffold.

## Success criteria
- BM25 score matches a hand-computed value on a tiny example.
- Fusion arithmetic matches the stated RRF formula on a fixture.
- The reranker flips a crafted wrong-on-top case in tests.
- Every answer sentence from the API carries a citation, the result
  is deterministic across repeated calls, and every answer sentence
  appears verbatim in the corpus.
- The ablation runner writes results_build.json with per-mode
  top-1 accuracy, recall at 3, and MRR, plus the per-question table.
- At least 12 Build tests pass; Learn tests still pass.
