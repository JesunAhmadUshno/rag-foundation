# Paper candidate brief: RAG hybrid search ablation paper

Tracker row: new CANDIDATE row for P05 (publications pipeline tracker)
Project: P05 rag-foundation
Status: CANDIDATE, brief written 2026-11-04
Submission note: submission is Jesun's tap. Nothing is submitted by
this brief, and no venue has been contacted.

## Working title

A hybrid search ablation with a paraphrase study: BM25, TF-IDF
vector, reciprocal rank fusion, reranking, and deterministic query
rewriting on a labelled synthetic corpus

## Abstract draft

Based only on the measured v1.0 results recorded in the repo. Numbers
below are from synthetic corpora and are stated as such.

Retrieval-augmented generation depends on retrieval quality, yet
small RAG stacks are often reported with a single configuration and
no ablation. This work presents an open, dependency-free retrieval
stack and measures each configuration on the same labelled questions
and the same chunking. At Learn level, a TF-IDF retrieval loop with
extractive answers and one citation per sentence scored top-1
accuracy 8 of 8 (1.000) and recall at 3 of 8 of 8 (1.000) on 8
questions over 6 documents and 7 chunks, with 15 unit tests. At Build
level, on 24 questions over a 20-document, 41-chunk synthetic corpus
in 7 topics, top-1 accuracy was 1.000 for BM25 only, vector only
(TF-IDF cosine), and hybrid search (reciprocal rank fusion, k = 60),
and 0.958 for hybrid plus a coverage and F1 reranker, with recall at
3 of 1.000 in all four modes and MRR of 1.000, 1.000, 1.000, and
0.979; the single reranker loss (b10-pollen) is analysed as a
coverage tie decided by F1 precision in favour of a shorter chunk.
At Deep level, on 42 questions (24 regression, 10 paraphrase, 8
multi-hop), deterministic query rewriting raised paraphrase top-1
from 0.500 (hybrid) and 0.300 (hybrid plus rerank) to 1.000, with
recall at 3 and MRR of 1.000, while holding regression top-1 at
1.000. A lexical HyDE simulation scored top-1 0.917 on regression
and 0.500 on paraphrase and did not beat hybrid overall, and
multi-hop retrieval held pair completeness at 1.000, the same as
hybrid, with its second hop placing the second expected document in
its top 3 for 6 of 8 questions. The stack ships with 52 unit tests.
The corpora are synthetic, the vector side is lexical, the HyDE is a
simulation rather than a language model, and the rewriting table is
hand built; the paper claims the ablation discipline and the
rewriting result on these sets, not performance at scale.

## Method outline

1. Corpus and chunking: 20 synthetic documents in 7 topics that
   deliberately share vocabulary, chunked into 41 chunks with the
   Learn configuration (40-word windows, 10-word overlap). A test
   asserts the Build chunker matches the Learn chunker.
2. Retrievers: BM25 with k1 = 1.5 and b = 0.75, with a unit test
   against a hand-computed score; and TF-IDF cosine with smoothed
   IDF, exactly the Learn method.
3. Fusion: reciprocal rank fusion over the two full rankings,
   fused score as the sum of 1 / (60 + rank), checked by a unit
   test on a fixture.
4. Reranker: hybrid top 8 re-scored by query coverage, then token
   F1, then hybrid score. A crafted unit test proves the flip
   mechanism; the measured ablation records its one loss.
5. Query rewriting: a deterministic expansion table keyed on the
   pipeline stemmer output, appended to the question and run through
   the hybrid retriever. Deep modes do not reapply the Build
   reranker.
6. HyDE simulation: a hypothetical document assembled from corpus
   co-occurrence (top 3 co-occurring terms per question term, ranked
   by count times IDF). Named as a lexical simulation in all text.
7. Multi-hop: hop 1 hybrid ranking, bridge terms from the anchor
   document (terms in 2 to 5 documents, top 12), hop 2 hybrid
   ranking on bridge terms, and a conservative union that preserves
   the hop 1 order and only appends.
8. Scoring: rankings collapsed to documents and scored at document
   level (top-1, recall at 3, MRR; pair completeness at 3 and at 5
   for multi-hop). Every question record carries its full trace.

## Results table

Measured 2026-11-04, synthetic corpora only, from the level READMEs
in the repo.

| Level | Set | Modes and top-1 | Recall at 3 | MRR | Tests |
| --- | --- | --- | --- | --- | --- |
| Learn | 8 questions, 6 docs, 7 chunks | TF-IDF 1.000 (8 of 8) | 1.000 | n/a | 15 |
| Build | 24 questions, 20 docs, 41 chunks | BM25 1.000, vector 1.000, hybrid 1.000, hybrid plus rerank 0.958 | 1.000 all modes | 1.000, 1.000, 1.000, 0.979 | 20 (35 total) |
| Deep, paraphrase (10) | Same corpus | Hybrid 0.500, hybrid plus rerank 0.300, rewriting 1.000, HyDE 0.500 | 1.000 with rewriting | 1.000 with rewriting | 17 Deep (52 total) |
| Deep, regression (24) | Same corpus | Rewriting 1.000, HyDE 0.917 | 1.000 | 1.000 rewriting, 0.958 HyDE | 17 Deep (52 total) |
| Deep, multi-hop (8) | Same corpus | Pair completeness at 3 and at 5: 1.000, hybrid and multi-hop alike | n/a | n/a | 17 Deep (52 total) |

Named case: b10-pollen. Hybrid plus rerank ranked bees first; every
Deep mode ranked pollination first. For the rewrite, multi-hop, and
combined modes the recovery is by subtraction (hybrid without the
Build reranker), and the paper must state it that way.

## Venue class note

Per SPEC.md, the paper angle for P05 is a hybrid search ablation
(vector only, BM25 only, hybrid, hybrid plus rerank, one table),
extended at Deep with the rewriting before and after table. Venue
class is a workshop or conference in retrieval or NLP, or a journal
of the AJSE class, per the publications pipeline tracker rules. One
venue at a time. No venue is named as submitted, accepted, or
contacted in this brief. Fees, if any, arise only after acceptance
and remain Jesun's call under the free-only rule.

## Limits the paper must carry

- Synthetic corpora only (6, then 20 documents; 8, 24, then 42
  labelled questions). No scale, latency, or real-corpus claim.
- The vector side is TF-IDF, a lexical sparse vector. No dense
  embeddings and no external model are used.
- The HyDE is a lexical simulation, not an LLM HyDE, and its
  failure modes (unseen vocabulary, sibling confusion) are part of
  the results, not footnotes.
- The rewriting table is hand built for this vocabulary; table
  coverage, not the mechanism, is the stated limit.
- Multi-hop shows no headline gain on this corpus, because hybrid
  already co-retrieves both expected documents. That null result is
  reported as a result.
- Compressed Deep only. The v1.1 backlog (dense embeddings, LLM
  rewriting and HyDE, learned reranking, larger real corpus, chunk
  size study) is future work, named in ROADMAP.md in the repo.

## Submission gate

Submission is Jesun's tap and nothing is submitted. This brief is
the candidate only. The tracker row is added by the batch from the
delivery report for this fan-out cycle.
