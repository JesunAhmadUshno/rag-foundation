# rag-foundation

Retrieval-augmented generation done right: hybrid search, reranking, cited answers.

Status: LEARN DONE, BUILD DONE, and DEEP DONE 2026-11-04
(ROADMAP-V3-BATCH, Sprint 1), Deep as a compressed Deep under the
December Compression Protocol. Level 1 code runs with 15 passing
unit tests and one measured question run (below). Level 2 code
runs with 20 Build unit tests (35 total) and one measured
ablation run (below). Level 3 code runs with 17 Deep unit tests
(52 total) and one measured Deep evaluation run (below). The
rest of the v2 Deep scope is the v1.1 backlog in ROADMAP.md.
The Wave 0 scaffold claim is superseded by this line.
Project: P05. Fleet node: BlackBoxV2. Wave: Wave 2.

## Start here

1. Read SPEC.md for scope and acceptance criteria.
2. Read DOSSIER.md for the past, present, and future of this problem (v1).
3. Read NOVELTY.md for the proposed novelty (DRAFT, pending the Jev claim_check gate).
4. Start at level-1-learn/README.md, then level-2-build, then level-3-deep.

## Level map

- Level 1, Learn: the core idea, built small and clean, with a teaching path.
- Level 2, Build: a real working system other people can run.
- Level 3, Deep: benchmarks, optimization, evaluation, hard cases.

## Benchmarks

| Test | Result |
| --- | --- |
| Level 1 question run, 8 hand-labelled questions over a 6-document synthetic corpus (7 chunks, TF-IDF retrieval, extractive answers with citations; method: level-1-learn/README.md), 2026-11-04 | Top-1 accuracy 8 of 8 (1.000), recall at 3 is 8 of 8 (1.000). All 8 returned answer sentences judged correct against the corpus by reading, each with its citation. |
| Level 2 ablation, 24 labelled questions over a 20-document, 41-chunk synthetic corpus in 7 topics, same questions and chunking in all modes (method: level-2-build/README.md), 2026-11-04 | Top-1 accuracy 1.000 for BM25 only, vector only (TF-IDF), and hybrid (RRF); 0.958 for hybrid plus rerank (23 of 24, the reranker demoted b10-pollen to rank 2). Recall at 3 is 1.000 in all four modes; MRR 1.000, 1.000, 1.000, and 0.979. |
| Level 3 Deep evaluation, 42 labelled questions (24 regression, 10 paraphrase, 8 multi-hop) over the same corpus and chunking, Build modes against Deep modes (method: level-3-deep/README.md), 2026-11-04 | On paraphrase questions, top-1 rises from 0.500 hybrid (0.300 hybrid plus rerank) to 1.000 with query rewriting, recall at 3 and MRR 1.000; rewriting keeps regression top-1 at 1.000 (24 of 24). HyDE (lexical simulation) scores top-1 0.917 regression and 0.500 paraphrase and does not beat hybrid overall. Multi-hop pair completeness at 3 and at 5 is 1.000, the same as hybrid, with hop 2 placing the second expected document in its top 3 for 6 of 8 questions. On b10-pollen every Deep mode ranks pollination first where hybrid plus rerank ranked bees first. |

## Fan-out

Written fan-out set for v1.0, dated 2026-11-04, in fanout/:
blog post (fanout/blog-post.md), step-by-step tutorial
(fanout/tutorial.md), website page copy (fanout/website-page.md),
LinkedIn post draft, not posted (fanout/linkedin-post.md), paper
candidate brief for the hybrid search ablation, nothing submitted
(fanout/paper-candidate.md), and draft release notes for v0.1, v0.5,
and v1.0 (fanout/release-notes.md). Channel outcomes and per-piece
publicity grades are logged in PUBLICITY.md at the repo root.

## Novelty

PROPOSED. See NOVELTY.md. The novelty text is a draft until the Jev claim_check gate passes on it.

## License

Code: Apache-2.0 (see LICENSE). Tutorials: CC BY 4.0. Ruled in D-V3-11, 2026-11-04.
