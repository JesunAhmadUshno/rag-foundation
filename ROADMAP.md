# ROADMAP: rag-foundation v1.1 backlog

v1.0 (2026-11-04) closes Learn, Build, and compressed Deep.
Compressed Deep delivered the full SPEC Deep scope in lexical
form (deterministic query rewriting, a co-occurrence HyDE
simulation, and bridge term multi-hop retrieval), measured on a
42 question set with the failure modes written. The items below
are the rest of the v2 Deep scope, named here as the v1.1
backlog. None of them is done, and none is claimed.

## v1.1 backlog

1. Dense embeddings: replace or augment the TF-IDF vector side
   with a real dense embedding model, run the same 42 question
   evaluation plus the Build ablation, and report whether the
   paraphrase gap that rewriting closes lexically also closes
   semantically. Needs a free local model route; no spend and no
   new credential is created by this project on its own.
2. LLM query rewriting and HyDE: generate rewrites and
   hypothetical documents with a real model behind the same
   interfaces used at v1.0, and measure them against the
   deterministic table and the lexical simulation on the same
   set, including the p01 and p03 cases the simulation cannot
   reach. Needs a credential decision from Jesun.
3. Learned or cross-encoder reranking: the Build reranker is a
   measured loss on this corpus (b10-pollen) and Deep modes
   bypass it. A learned reranker should be compared on the same
   discipline, with b10 as a named regression case that must
   stay fixed.
4. Larger real corpus: move beyond the 20 synthetic documents to
   a larger corpus with real documents and a question set in the
   hundreds, where multi-hop retrieval can show a ranking gain
   or fail honestly, and where recall ceilings bind. Re-run all
   Deep modes and re-baseline from that run.
5. Data driven expansion table: grow or replace the hand built
   EXPANSIONS table from query logs or a synonym resource, with
   the same stemmed key discipline and a test per added family,
   so table coverage stops being the rewriting limit.
6. Chunk size study: the 40 word, 10 word overlap configuration
   is inherited from Learn and was never varied. Measure the
   Deep modes across chunk sizes on the same question set.
7. Workshop paper submission: the Build ablation plus the Deep
   before and after tables are the paper angle named in SPEC.md
   (a hybrid search ablation). Submission itself is Jesun's tap
   and is not part of any automated run.

## Standing rules for v1.1 work

- The Build pipeline stays importable and unchanged in behaviour
  unless a change is itself measured before and after on the
  Deep question set.
- b10-pollen stays a named regression case in every future run:
  any mode that ranks bees first on it is reported as a
  regression, not averaged away.
- Every new number in a README comes from a run executed in that
  cycle. Nothing is carried forward as if it were freshly
  measured.
