# Retrieval Done Right, Measured Honestly: Building rag-foundation in the Open

By Jesun Ahmad Ushno
Date: 2026-11-04
Status: DRAFT, written fan-out for P05 rag-foundation v1.0. Not posted.

## The problem

A retrieval-augmented generation (RAG) system is only as good as the
passages it retrieves. If retrieval misses, the answer never had the
facts. If retrieval ranks a sibling document first, the answer cites
the wrong source with confidence. And a question written in different
words from the document (a paraphrase) can miss entirely under lexical
search, even when the fact is in the corpus.

This project, P05 in Roadmap v3, builds the retrieval stack in the
open, one level at a time: a TF-IDF loop with cited extractive
answers, then hybrid search (BM25 plus vector) with reranking, then
query rewriting, a lexical HyDE simulation, and multi-hop retrieval.
All code runs with the Python 3.12 standard library only. No dense
embedding model, no vector database, no language model, no API, and
no credential are used anywhere in this repo, and nothing here claims
otherwise.

Repository: https://github.com/JesunAhmadUshno/rag-foundation

## Past, present, future (the dossier, condensed)

Past: framework RAG examples in the LangChain and LlamaIndex tutorial
class already exist. The prior art and the problem history are recorded
in PROPOSAL.md and PROPOSAL.md in the repo. The novelty claim there stays
marked PROPOSED. This post makes no novelty claim beyond the measured
work below.

Present: v1.0 closes three levels on 2026-11-04. Learn built the core
loop small and checkable by eye. Build ran a four mode ablation
(BM25 only, vector only, hybrid, hybrid plus rerank) on the same
questions and the same chunking, and kept the one case where reranking
made the headline number worse. Compressed Deep built the SPEC Deep
scope in lexical form: deterministic query rewriting, a co-occurrence
HyDE simulation, and bridge term multi-hop retrieval, each measured
against the Build baselines on the same corpus.

Future: the rest of the v2 Deep scope is named in REPORT.md in the
repo as the v1.1 backlog. It includes dense embeddings, LLM query
rewriting and HyDE, learned or cross-encoder reranking, a larger real
corpus, a data driven expansion table, and a chunk size study. None of
that is done, and none of it is claimed here.

## Main results claim

At v1.0, on synthetic corpora only: Learn passed 15 tests with top-1 accuracy 8 of 8 (1.000) and recall at 3 of 8 of 8 (1.000) on 6 documents and 7 chunks; Build passed 20 tests (35 tests in total) on 24 questions, with top-1 accuracy 1.000 for BM25 only, vector only (TF-IDF), and hybrid (RRF), and 0.958 for hybrid plus rerank (23 of 24, the reranker demoted b10-pollen to rank 2), recall at 3 of 1.000 in all four modes, and MRR of 1.000, 1.000, 1.000, and 0.979; compressed Deep passed 17 tests (52 tests in total) on 42 questions, with paraphrase top-1 accuracy rising from 0.500 for hybrid and 0.300 for hybrid plus rerank to 1.000 with query rewriting, rewriting keeping regression top-1 at 1.000, HyDE scoring top-1 0.917 on regression and 0.500 on paraphrase with no overall win over hybrid, multi-hop pair completeness at 3 and at 5 of 1.000, the same as hybrid, with hop 2 placing the second expected document in its top 3 for 6 of 8 multi-hop questions, and b10-pollen fixed by subtraction, because every Deep mode ranks pollination first by running hybrid without the Build reranker that had demoted it.

Every number in that claim comes from a run recorded in the level
READMEs in the repo, on synthetic corpora. Read the limits section
below before quoting any of it.

## Results by level

### Level 1, Learn (release v0.1)

The corpus holds 6 short synthetic documents. Chunking at 40 words
with 10 words of overlap makes 7 chunks. The 8 questions were labelled
by hand with their expected source document before any run.

| Measure | Result |
| --- | --- |
| Documents and chunks | 6 documents, 7 chunks |
| Questions | 8 hand labelled |
| Top-1 accuracy | 8 of 8 (1.000) |
| Recall at 3 | 8 of 8 (1.000) |
| Answer check | 8 of 8 sentences judged correct by reading, one citation per sentence |
| Tests | 15 |

Read honestly: 8 of 8 on 6 tiny documents with almost no shared
vocabulary proves the loop works end to end, not that retrieval is
good. Harder corpora arrive at Build and Deep.

### Level 2, Build (release v0.5)

The corpus grows to 20 synthetic documents in 7 topics and 41 chunks,
with topics that deliberately share vocabulary. All four modes use
the same 24 labelled questions and the same chunking. Rankings are
collapsed to documents and scored at document level.

| Mode | Top-1 accuracy | Recall at 3 | MRR |
| --- | --- | --- | --- |
| BM25 only | 1.000 (24 of 24) | 1.000 | 1.000 |
| Vector only (TF-IDF) | 1.000 (24 of 24) | 1.000 | 1.000 |
| Hybrid (RRF) | 1.000 (24 of 24) | 1.000 | 1.000 |
| Hybrid plus rerank | 0.958 (23 of 24) | 1.000 | 0.979 |

The reranker loss is b10-pollen. Coverage tied at 0.667 between the
bees chunk and the pollination chunk, and token F1 decided for bees
because the bees chunk is shorter, so its precision is higher. Hybrid
alone had pollination first. On this set the reranker is a mechanism
proven by its unit test, not a measured win.

Tests: 20 Build tests, 35 in total with Learn.

### Level 3, Deep, compressed (release v1.0)

The Deep set holds 42 labelled questions over the same corpus and
chunking: 24 regression (the Build questions), 10 paraphrase, and 8
multi-hop with two expected documents each.

| Category | Finding |
| --- | --- |
| Paraphrase, top-1 | 0.500 hybrid, 0.300 hybrid plus rerank, 1.000 with rewriting; recall at 3 and MRR 1.000 with rewriting |
| Regression, top-1 with rewriting | 1.000 (24 of 24), held |
| HyDE (lexical simulation) | Top-1 0.917 regression, 0.500 paraphrase; no overall win over hybrid (single document top-1 0.794 against 0.853 for hybrid) |
| Multi-hop | Pair completeness at 3 and at 5 is 1.000, the same as hybrid; hop 2 placed the second expected document in its top 3 for 6 of 8 questions from bridge terms alone |
| b10-pollen | Every Deep mode ranks pollination first; the rewrite, multi-hop, and combined modes recover it by subtraction (hybrid without the Build reranker), and HyDE recovers it by a different route |

Two paraphrase questions are absent from every Build ranking at any
rank, and rewriting retrieves each at rank 1. That is the measured
win of this level. HyDE and multi-hop are kept as tested mechanisms
with named failure modes, not as improvements, because the numbers
do not support an improvement claim on this corpus.

Tests: 17 Deep tests, 52 in total with Learn and Build.

## Honest limits

- Synthetic corpora only. Learn uses 6 documents and 7 chunks; Build
  and Deep use 20 documents and 41 chunks, with 24, then 42, labelled
  questions written against that corpus. No claim about scale,
  latency, or real-world accuracy is made or implied.
- The vector side is TF-IDF, a lexical sparse vector. There are no
  dense embeddings and no external model at any level in v1.0, so
  paraphrase handling here is a hand built expansion table, not
  semantic search.
- The HyDE in this repo is a lexical simulation built from corpus
  co-occurrence, not an LLM. It cannot invent vocabulary the corpus
  does not contain, and two paraphrase cases show exactly that limit.
- The rewriting table is hand built and covers this corpus
  vocabulary. A synonym that is not a table key gets no expansion.
- The answer step is extractive at Learn and Build: it can only
  repeat corpus sentences, with one citation per sentence.
- The reranker measured at Build made the headline number worse on
  this set (0.958 against 1.000). That result is kept, not averaged
  away, and Deep modes do not reapply it.
- Compressed Deep is not the full v2 Deep scope. The remainder is
  the named v1.1 backlog in REPORT.md.
- The runs executed on the Muse VM, not the assigned BlackBoxV2 node.

## Where to go next

- Tutorial: docs/fanout/tutorial.md in the repo, a step-by-step module
  that runs all three levels and the full test suite.
- Releases: v0.1 (Learn), v0.5 (Build), v1.0 (Learn, Build, compressed
  Deep) on the GitHub repo linked above.
- Book chapter: "Retrieval Done Right" per PROPOSAL.md, drafted as part
  of the fan-out set.
- License: code Apache-2.0, tutorials CC BY 4.0.
