# rag-foundation

Retrieval-augmented generation done right: hybrid search, reranking, cited answers.

Status: LEARN DONE 2026-11-04 (ROADMAP-V3-BATCH, Sprint 1).
Level 1 code runs with 15 passing unit tests and one measured
question run (below). Build and Deep are not started. The Wave 0
scaffold claim is superseded by this line.
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

## Novelty

PROPOSED. See NOVELTY.md. The novelty text is a draft until the Jev claim_check gate passes on it.

## License

Code: Apache-2.0 (see LICENSE). Tutorials: CC BY 4.0. Ruled in D-V3-11, 2026-11-04.
