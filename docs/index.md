# rag-foundation

Retrieval-augmented generation done right: hybrid search, reranking, cited answers. A dependency-free RAG system built in three levels with measured results at each level, 52 tests passing.

- Learn: TF-IDF retrieval with extractive, cited answers over a 6-document synthetic corpus. Top-1 accuracy 8 of 8 (1.000), recall at 3 is 8 of 8 (1.000) on 8 hand-labelled questions.
- Build: hybrid search (BM25 plus TF-IDF vector) with RRF fusion and reranking over a 20-document, 41-chunk synthetic corpus. Top-1 accuracy 1.000 for BM25 only, vector only, and hybrid; 0.958 for hybrid plus rerank. Recall at 3 is 1.000 in all four modes.
- Deep (compressed): query rewriting, a lexical HyDE simulation, and multi-hop retrieval, evaluated on 42 labelled questions. On paraphrase questions, top-1 rises from 0.500 with hybrid to 1.000 with query rewriting (combined rewrite top-1 1.000 against hybrid 0.500). Multi-hop pair completeness at 3 and at 5 is 1.000.

Grades on record (of 10,000): Learn 8,700, Build 8,400, Deep 7,700, fan-out set 9,550.

Every number above is already published in this repo (README.md level write-ups) and reproduced by the runners in this repo, checked in CI. The full write-ups are in the level folders: level-1-learn, level-2-build, level-3-deep. The tutorial and blog post are in fanout/.

Releases: https://github.com/JesunAhmadUshno/rag-foundation/releases
