# Website project page copy: rag-foundation

Site: jesunahmadushno.com
Status: COPY ONLY, draft for the project page. Dated 2026-11-04.
Nothing on any website was changed by this file.

## Headline

rag-foundation: hybrid retrieval, reranking, and rewriting, measured in the open

## Summary

rag-foundation is an open retrieval-augmented generation (RAG)
project built by Jesun Ahmad Ushno as project P05 in Roadmap v3. It
builds the retrieval stack in three levels: a TF-IDF loop with cited
extractive answers, hybrid search (BM25 plus TF-IDF vector, fused
with reciprocal rank fusion) with reranking and a clean query API,
and query rewriting, a lexical HyDE simulation, and bridge term
multi-hop retrieval. It runs on the Python 3.12 standard library
only, with no dense embedding model, no language model, no API, and
no credential.

Status: v1.0, 2026-11-04. Learn, Build, and compressed Deep are done.
Total tests: 52, all passing at v1.0.

## Results

All results below are measured runs on synthetic corpora, recorded in
the level READMEs in the GitHub repo. They prove the retrieval loop,
the hybrid mechanism, and the rewriting mechanism, not production
quality.

| Level | Set | Headline result | Notes |
| --- | --- | --- | --- |
| Learn | 8 questions, 6 documents, 7 chunks | Top-1 8 of 8 (1.000), recall at 3 8 of 8 (1.000) | 15 tests; extractive answers, one citation per sentence |
| Build | 24 questions, 20 documents, 41 chunks | Top-1 1.000 for BM25, vector, and hybrid; 0.958 for hybrid plus rerank | Recall at 3 1.000 in all modes; MRR 1.000, 1.000, 1.000, 0.979; rerank loss is b10-pollen; 20 tests, 35 total |
| Deep (compressed) | 42 questions (24 regression, 10 paraphrase, 8 multi-hop) | Paraphrase top-1 0.500 hybrid and 0.300 hybrid plus rerank, to 1.000 with rewriting; regression held at 1.000 | HyDE 0.917 regression and 0.500 paraphrase, no overall win; multi-hop pair completeness 1.000, same as hybrid, hop 2 second doc in top 3 for 6 of 8; 17 tests, 52 total |

## Honest limits

- Synthetic corpora only, at every level.
- The vector side is TF-IDF, a lexical sparse vector. There are no
  dense embeddings and no external model in v1.0.
- The HyDE is a lexical simulation, not an LLM, and the rewriting
  table is hand built for this corpus vocabulary.
- The Build reranker measured worse on this set and that result is
  kept in the record.
- Compressed Deep is not the full v2 Deep scope. The remainder is
  the v1.1 backlog in the repo REPORT.md.

## Links

- GitHub repo: https://github.com/JesunAhmadUshno/rag-foundation
- Release v0.1 (Learn): https://github.com/JesunAhmadUshno/rag-foundation/releases/tag/v0.1
- Release v0.5 (Build): https://github.com/JesunAhmadUshno/rag-foundation/releases/tag/v0.5
- Release v1.0 (Learn, Build, compressed Deep): https://github.com/JesunAhmadUshno/rag-foundation/releases/tag/v1.0
- Tutorial: docs/fanout/tutorial.md in the GitHub repo
- Blog post draft: docs/fanout/blog-post.md in the GitHub repo

## License note

Code: Apache-2.0. Tutorials: CC BY 4.0.
