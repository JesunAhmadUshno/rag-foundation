# LinkedIn post draft: P05 rag-foundation v1.0

Status: DRAFT NOT POSTED
Date drafted: 2026-11-04
Author: Jesun Ahmad Ushno
Rule for this platform: the link goes in the first comment, not in the
post body. The first comment line is at the end of this file.

## Post body

RAG answers are only as good as what retrieval puts in front of them.
So I built the retrieval stack in the open, and measured every mode
on the same questions.

rag-foundation v1.0 is done: Learn, Build, and a compressed Deep,
Python standard library only. No embedding model, no LLM, no API.

Learn: a TF-IDF loop with cited extractive answers. 8 of 8 top-1 and
8 of 8 recall at 3, on 6 documents and 7 chunks. Small by design, so
every result can be checked by eye. 15 tests.

Build: hybrid search, BM25 plus TF-IDF vector with reciprocal rank
fusion, plus a reranker. On 24 questions: top-1 1.000 for BM25,
vector, and hybrid. Hybrid plus rerank scored 0.958, and I kept that
in the record. The reranker lost one case, b10-pollen, on an F1
precision tie break that favoured the shorter wrong chunk.

Deep (compressed): query rewriting, a lexical HyDE simulation, and
multi-hop retrieval, on 42 questions. Paraphrase top-1 went from
0.500 (hybrid) and 0.300 (hybrid plus rerank) to 1.000 with
rewriting, and regression stayed at 1.000. HyDE scored 0.917 on
regression and 0.500 on paraphrase, with no overall win, and I am
reporting it that way. Multi-hop pair completeness was 1.000, the
same as hybrid, with hop 2 finding the second document in its top 3
for 6 of 8 questions. 52 tests in total.

The honest limits, in the post and not in a footnote: synthetic
corpora only (20 documents, 41 chunks at Build and Deep), the vector
side is TF-IDF and not a dense embedding, the HyDE is a lexical
simulation and not an LLM, and the rewriting table is hand built for
this vocabulary. The 1.000 scores prove the mechanisms on this set,
not retrieval quality at scale. The rest of the Deep scope is named
as the v1.1 backlog in the repo, not claimed as done.

If you build RAG systems: what breaks first for you, paraphrase,
ranking, or multi-hop questions?

## First comment (post this as the first comment, per the standing rule)

Repo, releases v0.1, v0.5, and v1.0, and the full tutorial: https://github.com/JesunAhmadUshno/rag-foundation
