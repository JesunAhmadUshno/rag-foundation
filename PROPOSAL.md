# Proposal: rag-foundation (P05)

Status: NOT LOCKED. This repo is not pre-registered. Part 1 below is a
draft plan for a confirmatory re-run; it becomes the lock only when the
Owner sets its pass lines and it is tagged proposal-v1 before any of
its runs. Part 2 keeps the original plans as they were written.

Scope: P05 builds a RAG system. P06 (rag-eval-harness) judges one.

## Why this repo is not pre-registered

Git history (2026-11-04):

- 045259b, Wave 0 scaffold: SPEC.md, DOSSIER.md and NOVELTY.md came
  before any code, but they name scope and acceptance criteria only.
  There are no hypotheses, pass lines or analysis plan.
- 4586b2a (Build) and 31c8b68 (Deep): BUILD-SPEC.md and DEEP-SPEC.md
  were committed in the same commits as the code and results they
  describe.

So no plan with pass lines existed before a result. The recorded
results are exploratory (REPORT.md), and the verdict is capped at
Functional until a locked confirmatory cycle runs.

## Part 1. Confirmatory re-run (draft, not locked)

Question. On a public retrieval benchmark and a paraphrase set written
by someone who never saw the expansion table, does deterministic query
rewriting still beat hybrid BM25 plus TF-IDF retrieval at top-1?

Prior work: BM25 (Robertson and Zaragoza 2009); reciprocal rank fusion
(Cormack, Clarke and Buettcher 2009); HyDE (Gao et al. 2022); BEIR
(Thakur et al. 2021). The design comes from the 2026-11-07 review
(REPORT.md, "Remaining gaps and exactly what each needs").

Design, as drafted:

- Data: BEIR SciFact (public; about 5k documents, 300 test queries),
  plus a held-out paraphrase set of at least 30 questions written by a
  second author after the expansion table is frozen at a named commit.
- Modes: the eight recorded modes (BM25, TF-IDF vector, hybrid,
  hybrid plus rerank, rewrite, HyDE, multi-hop, combined), plus a
  standard BM25 baseline (rank_bm25) on the same chunks. A small open
  dense retriever is an optional arm.
- Metrics: top-1, recall at 3, MRR; nDCG at 10 on SciFact. Every
  headline number with a seeded bootstrap 95% interval; paired modes
  compared with an exact McNemar test.
- Ablations: rewrite without the reranker (as now), rewrite with each
  question's own keys removed (the leakage probe), chunk size 20 to 80.
- Compute: CPU only, standard library plus rank_bm25; no paid API.

Hypotheses and pass lines: NOT SET. They are the Owner's call and are
written here, then tagged, before any confirmatory run. Every trial is
reported; only the registered ones count.

## Part 2. Original plans (2026-11-04), kept as written

The files below were folded in from SPEC.md, level-2-build/BUILD-SPEC.md,
level-3-deep/DEEP-SPEC.md, NOVELTY.md and DOSSIER.md. Headings are
demoted one level and paths updated to the new layout; nothing else
changed.

### SPEC: rag-foundation (P05)

Phase skill: spec-driven-development (house engineering pipeline).
Status: Wave 0 scaffold spec, from Roadmap v2 text and the v3 decision pack. Scope and acceptance criteria below are the v2 section text, kept as the source of truth until the project's wave opens its own spec pass.

Fleet node: BlackBoxV2. Wave: Wave 2.
Hiring evidence: 3 of 5 (RAG named in 4/56, required at Apple and Mistral FDE) [confirmed, fleet and scoring pass 2026-11-04, or the decision pack for P23 to P29].

#### Project section text (Roadmap v2, or the v3 candidate text for P23 to P29)

rag-foundation: KEEP

Subject: retrieval-augmented generation. v1 levels carry over: chunk, embed, retrieve, answer with citations; hybrid search (BM25 plus vector) with reranking and a clean query API; Deep adds query rewriting, HyDE, and multi-hop retrieval.
Fan-out: Book chapter "Retrieval Done Right". Paper angle: a hybrid search ablation (vector only, BM25 only, hybrid, hybrid plus rerank, one table). Course module: P05-rag-foundation.

#### Acceptance criteria (scaffold level)

- Learn closes when the level-1-learn code runs, its README teaches the idea, and a fresh-eyes reader can follow it.
- Build closes when the system runs end to end, tests pass, and one benchmark or result table with method is in the README.
- Deep closes when the Deep scope in the section text is done, the failure modes are written, and the dossier is updated to ship state.
- No level closes on a claim. Evidence only: code, tests, numbers, links.

### Build Spec: rag-foundation Level 2

#### Objective
Close Build per PROPOSAL.md acceptance: the system runs end to end, tests
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

#### Assumptions
- Python standard library only. No external model, API, credential,
  or spend. No dense embeddings at this level; that limit is stated
  in the README, not hidden.
- The corpus and question set are synthetic and labelled as synthetic.
  They prove the hybrid mechanism end to end, not production quality.
- The answer step stays extractive, carrying the Learn citation
  discipline: one citation per sentence, sentences copied word for
  word from retrieved chunks.

#### Commands
- Test: python -m unittest discover -s tests -p "test_build*.py" -v
- Run: python src/run_build.py
- Full: python -m unittest discover -s tests -v

#### Boundaries
- Always: stdlib only, deterministic rankings (ties break on chunk
  id), hand-checkable formulas with constants stated, results
  recorded exactly as measured.
- Never: an external call, a new credential, a claim that TF-IDF is a
  dense embedding, a tuned-after-the-fact question set presented as
  labelled in advance, or a grade for a scaffold.

#### Success criteria
- BM25 score matches a hand-computed value on a tiny example.
- Fusion arithmetic matches the stated RRF formula on a fixture.
- The reranker flips a crafted wrong-on-top case in tests.
- Every answer sentence from the API carries a citation, the result
  is deterministic across repeated calls, and every answer sentence
  appears verbatim in the corpus.
- The ablation runner writes results_build.json with per-mode
  top-1 accuracy, recall at 3, and MRR, plus the per-question table.
- At least 12 Build tests pass; Learn tests still pass.

### Deep Spec: rag-foundation Level 3 (compressed Deep)

#### Objective
Close Deep in compressed form per the December Compression Protocol:
the Deep scope in PROPOSAL.md (query rewriting, HyDE, and multi-hop
retrieval) built properly on the Level 2 hybrid pipeline, tested,
and benchmarked with measured before and after numbers, with the
failure modes written. The rest of the v2 Deep scope (dense
embeddings, LLM based rewriting and HyDE, learned reranking, larger
real corpora, chunk size study) is named as the v1.1 backlog in
REPORT.md at the repo root, not silently dropped.

#### What Deep adds
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

#### Commands
- Test: python -m unittest discover -s tests -p "test_deep*.py" -v
- Run: python src/run_deep.py
- Full: python -m unittest discover -s tests -v

#### Boundaries
- Always: Python 3.12 standard library only, no network, no spend,
  deterministic (same run twice gives identical results), numbers
  recorded exactly as measured, Build behaviour unchanged and
  reproducible through the Build pipeline for before and after.
- Never: a claim that the TF-IDF vector is a dense embedding, that
  the HyDE simulation is an LLM, a forced win on b10-pollen, or a
  grade for a scaffold.

#### Success criteria
- Each mechanism is asserted in unit tests on hand computed or
  crafted cases, including a crafted multi-hop corpus where hop 2
  retrieves a document the hop 1 top 3 misses.
- The Deep question set is labelled before the run and the runner
  writes results_deep.json from the run, never hand typed.
- b10-pollen is reported with its actual outcome per Deep mode.
- Full test discovery passes, including the Learn and Build tests.

### NOVELTY: rag-foundation (P05)

Status: DRAFT, PROPOSED. Not verified. This text does not move into any public post, paper, or profile until the Jev claim_check gate passes on the exact text.

#### Proposed claim

Against framework RAG examples (LangChain and LlamaIndex tutorials): this project aims to differ in the way its PROPOSAL.md section text defines (a from-zero or self-hosted build, measured in public, on a named home fleet, with the failure modes written down). The exact difference is stated at the project's wave, after the prior art is re-read.

#### Prior art table

| Prior art | What it does | What this project does differently | Measured difference |
| --- | --- | --- | --- |
| framework RAG examples (LangChain and LlamaIndex tutorials) | See PROPOSAL.md, Past | PROPOSED, see the claim above | NO MEASUREMENT YET |

#### Honest size

If the novelty proves small, this file will say so and name the real value instead (a cleaner reproduction, a better benchmark, a first public dataset). No novelty is invented to fill this section.

### DOSSIER: rag-foundation (P05) v1, 2026-11-04

Written under the documentation and publishing standard (past, present, future). Updated at ship time.

#### Past

Prior art for this project is named in PROPOSAL.md (framework RAG examples (LangChain and LlamaIndex tutorials)). The history of the problem, the key papers and systems, and what was tried before are recorded in the Roadmap v2 section text in PROPOSAL.md and will be expanded with dated sources at the project's wave, before Build opens.

#### Present

Current demand evidence: hiring value 3 of 5 (RAG named in 4/56, required at Apple and Mistral FDE) [confirmed, fleet and scoring pass 2026-11-04; for P23 to P29, the decision pack 2026-11-04]. The Round 3 research (2026-11-04) found the market centre at post-training, evals, environments, and inference depth [confirmed as the research finding; the report is at ~/workspace/research_notes/roadmap-v3-revaluation-research-20261104-0949/report.md]. Tools and versions are pinned at Build time, not in this v1.
Update 2026-11-04 (ship state, v1.0): Learn, Build, and compressed Deep are done. Ship state is a dependency-free RAG pipeline over a 20-document, 41-chunk synthetic corpus: TF-IDF retrieval with cited extractive answers (Learn), hybrid BM25 plus TF-IDF search with RRF fusion, reranking, and a query API (Build), and query rewriting, a lexical HyDE simulation, and bridge term multi-hop retrieval (Deep), all measured on 42 labelled questions in results/results_deep.json. The measured Deep result is that deterministic rewriting closes the paraphrase gap on this vocabulary (top-1 0.500 to 1.000 on the paraphrase set, regression held at 1.000) while the HyDE simulation and multi-hop show no headline gain over hybrid on this corpus, with their failure modes written in REPORT.md. 52 unit tests pass in total. The v1.1 backlog (dense embeddings, LLM rewriting and HyDE, learned reranking, larger real corpus) is in REPORT.md at the repo root.

#### Future

Open problems and the project's next steps sit in the Deep level scope in PROPOSAL.md. Any forecast about this field is [unverified] unless a dated primary source is added here at the wave update.
