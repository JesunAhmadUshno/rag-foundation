# SPEC: rag-foundation (P05)

Phase skill: spec-driven-development (house engineering pipeline).
Status: Wave 0 scaffold spec, from Roadmap v2 text and the v3 decision pack. Scope and acceptance criteria below are the v2 section text, kept as the source of truth until the project's wave opens its own spec pass.

Fleet node: BlackBoxV2. Wave: Wave 2.
Hiring evidence: 3 of 5 (RAG named in 4/56, required at Apple and Mistral FDE) [confirmed, fleet and scoring pass 2026-11-04, or the decision pack for P23 to P29].

## Project section text (Roadmap v2, or the v3 candidate text for P23 to P29)

rag-foundation: KEEP

Subject: retrieval-augmented generation. v1 levels carry over: chunk, embed, retrieve, answer with citations; hybrid search (BM25 plus vector) with reranking and a clean query API; Deep adds query rewriting, HyDE, and multi-hop retrieval.
Fan-out: Book chapter "Retrieval Done Right". Paper angle: a hybrid search ablation (vector only, BM25 only, hybrid, hybrid plus rerank, one table). Course module: P05-rag-foundation.

## Acceptance criteria (scaffold level)

- Learn closes when the level-1-learn code runs, its README teaches the idea, and a fresh-eyes reader can follow it.
- Build closes when the system runs end to end, tests pass, and one benchmark or result table with method is in the README.
- Deep closes when the Deep scope in the section text is done, the failure modes are written, and the dossier is updated to ship state.
- No level closes on a claim. Evidence only: code, tests, numbers, links.
