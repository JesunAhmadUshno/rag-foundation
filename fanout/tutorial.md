# Tutorial: P05 rag-foundation, course module

Module: P05-rag-foundation
By Jesun Ahmad Ushno
Date: 2026-11-04
License for this tutorial: CC BY 4.0. Code in the repo: Apache-2.0.

## What you will do

You will clone the rag-foundation repo, run all three levels, run the
test suite for each level, and read your own results against the
recorded v1.0 numbers. Every command below exists in the repo as
shipped at v1.0 and was run by the author of this module on
2026-11-04 to verify it. The project needs Python 3.12 and uses the
standard library only. No model, no API, and no credential are needed.

All recorded numbers in this module come from synthetic corpora. They
prove the retrieval loop, the hybrid mechanism, and the rewriting
mechanism. They do not prove production quality.

## Step 0: Clone and enter the repo

```text
git clone https://github.com/JesunAhmadUshno/rag-foundation.git
cd rag-foundation
```

## Step 1: Level 1, Learn, the core loop

Read level-1-learn/README.md first. It explains chunking, the TF-IDF
embedding, cosine retrieval, and the coverage based answer step with
one citation per sentence.

Run the Learn question set:

```text
python level-1-learn/run_rag.py
```

Run the Learn tests:

```text
python -m unittest discover -s tests -p "test_learn*.py" -v
```

Read your results:

- Expected corpus line: 7 chunks, from 6 synthetic documents.
- Expected summary: top-1 accuracy 8 of 8 (1.000), recall at 3 is
  8 of 8 (1.000). Each answer sentence is copied from a retrieved
  chunk and carries its citation.
- Expected tests: 15 tests, all passing.

## Step 2: Level 2, Build, hybrid search with reranking

Read level-2-build/README.md and level-2-build/BUILD-SPEC.md. The
pipeline combines BM25 (k1 = 1.5, b = 0.75) and TF-IDF cosine vector
retrieval with reciprocal rank fusion (k = 60), then reranks the
hybrid top 8 by query coverage, then token F1, then hybrid score.
The query API returns extractive answers with a per-stage score
breakdown.

Run the Build ablation:

```text
python level-2-build/run_build.py
```

Run the Build tests:

```text
python -m unittest discover -s tests -p "test_build*.py" -v
```

Read your results:

- Expected summary on 24 labelled questions over 20 documents and
  41 chunks: top-1 accuracy 1.000 for BM25 only, vector only, and
  hybrid, and 0.958 for hybrid plus rerank. Recall at 3 is 1.000 in
  all four modes. MRR is 1.000, 1.000, 1.000, and 0.979.
- Expected one loss: b10-pollen, where hybrid plus rerank ranks bees
  first and pollination second (expected rank 2). Keep this case in
  mind. Deep addresses it.
- The runner writes level-2-build/results_build.json.
- The demo query at the end returns the Northlight loans sentence
  with citation northlight-loans-c0, first at every stage.
- Expected tests: 20 Build tests, all passing.

## Step 3: Level 3, Deep, rewriting, HyDE, and multi-hop

Read level-3-deep/README.md and level-3-deep/DEEP-SPEC.md. This is a
compressed Deep: the full SPEC Deep scope in lexical form
(deterministic query rewriting, a co-occurrence HyDE simulation, and
bridge term multi-hop retrieval). The rest of the v2 Deep scope is
the v1.1 backlog in ROADMAP.md at the repo root.

Run the Deep evaluation:

```text
python level-3-deep/run_deep.py
```

Run the Deep tests:

```text
python -m unittest discover -s tests -p "test_deep*.py" -v
```

Read your results:

- The set holds 42 questions: 24 regression, 10 paraphrase, 8
  multi-hop, over the same corpus and chunking as Build.
- Expected paraphrase top-1: 0.500 hybrid, 0.300 hybrid plus rerank,
  1.000 with query rewriting (recall at 3 and MRR 1.000).
- Expected regression top-1 with rewriting: 1.000 (24 of 24).
- Expected HyDE top-1: 0.917 on regression, 0.500 on paraphrase, with
  no overall win over hybrid.
- Expected multi-hop pair completeness at 3 and at 5: 1.000, the
  same as hybrid. Hop 2 places the second expected document in its
  top 3 for 6 of 8 questions.
- Expected b10-pollen line: every Deep mode ranks pollination first.
  For the rewrite, multi-hop, and combined modes the fix is by
  subtraction: they run hybrid without the Build reranker.
- The runner writes level-3-deep/results_deep.json. It was run twice
  at v1.0 and produced identical results both times.
- Expected tests: 17 Deep tests, all passing.

## Step 4: Run the full test suite

```text
python -m unittest discover -s tests -v
```

Expected: 52 tests in total (15 Learn, 20 Build, 17 Deep), all
passing.

## Step 5: Check your understanding

1. Why did plain sentence cosine pick the wrong sentence on the
   water cycle questions at Learn, and what replaced it? (Answer:
   the short topic sentence repeats the topic words and wins on
   cosine while answering nothing. The answer step uses IDF-weighted
   query coverage instead, so the answering sentences win.)
2. The Build reranker lowered top-1 from 1.000 to 0.958. Which case
   did it lose and why? (Answer: b10-pollen. Coverage tied at 0.667
   and token F1 favoured the shorter bees chunk on precision.)
3. Rewriting takes paraphrase top-1 to 1.000 on this set. What is
   the limit of that result? (Answer: the expansion table is hand
   built for this corpus vocabulary. A synonym that is not a table
   key gets no expansion, and the set is 10 paraphrase questions over
   a 20-document synthetic corpus.)

## Limits to keep with the numbers

- Synthetic corpora only, at every level.
- The vector side is TF-IDF, a lexical sparse vector, not a dense
  embedding. No external model is used anywhere in this repo.
- The HyDE here is a lexical simulation, not an LLM.
- The answer step is extractive, so it cannot combine facts across
  chunks into a new sentence.
