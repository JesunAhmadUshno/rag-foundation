# Level 1, Learn: rag-foundation

Status: DONE 2026-11-04 (ROADMAP-V3-BATCH, Sprint 1 of the December
Compression Protocol). Evidence: the code in this folder, 15 unit
tests in tests/test_learn_rag.py, and the measured run recorded
below. Build and Deep are not started.

## The idea in one paragraph

A retrieval-augmented generation system answers a question from
documents instead of from memory: split the documents into chunks,
turn each chunk into a vector, retrieve the chunks closest to the
question, and compose the answer from those chunks with a citation
for every claim. This level builds that whole loop small and in the
open, with the Python standard library only: no embeddings model, no
vector database, no language model. The answer step is extractive,
so every answer sentence is a sentence copied word for word from a
retrieved chunk, and every sentence carries its source.

## The pipeline in rag.py

1. Chunk. chunk_document splits a document into word windows
   (default 40 words, 10 words of overlap, step 30). Overlap keeps a
   fact that straddles a boundary present in at least one chunk.
   Chunk ids look like library-c1: document id plus chunk index.
2. Embed. Each chunk becomes a TF-IDF vector, a dict of term to
   weight. Term frequency is the raw count. IDF is smoothed:
   idf(t) = log((1 + N) / (1 + df(t))) + 1 over the chunk set, so a
   term in every chunk weighs 1.0 and a rarer term weighs more.
   Terms are content tokens: lowercase words and numbers, stopwords
   removed, with a crude trailing-s stem (plants and plant match;
   words ending in sis are protected, so photosynthesis survives).
3. Retrieve. The question is embedded with the corpus IDF and
   chunks are ranked by cosine similarity. Zero scores are dropped,
   ties break on chunk id, so the ranking is deterministic.
4. Answer. From each retrieved chunk, the sentence with the highest
   IDF-weighted query coverage is picked: the share of the
   question's total IDF weight that the sentence's terms carry.
   Later sentences must reach 0.30 coverage or they are dropped.
   The result is the picked sentences plus one citation per
   sentence, as (doc id, chunk id).

Why coverage, not cosine, for the sentence step: on the water cycle
questions, plain sentence cosine tied or won for the short topic
sentence ("The water cycle moves water between the earth and the
sky") because it is short and repeats the topic words, even though
it answers nothing. Coverage rewards covering more of the question,
so the condensation and evaporation sentences win. That failure and
its fix are locked in by a regression test
(test_answer_picks_the_answering_sentence).

## Run it

```text
python level-1-learn/run_rag.py
python -m unittest discover -s tests -p "test_learn*.py" -v
```

No dependencies. Python 3.12 standard library only.

## Measured results (2026-11-04, Muse VM, Python 3.12.3)

The corpus (in rag.py) holds 6 short synthetic documents (about 40
words each: photosynthesis, water cycle, gravity, bees, volcanoes,
a fictional library). Chunking at 40 words with 10 words of overlap
makes 7 chunks; only the library document splits, into two
overlapping chunks. The 8 questions in run_rag.py were labelled by
hand with their expected source document before any run.

| Question | Expected doc | Top-1 doc | Top-1 score | Expected in top 3 | Answer sentence |
| --- | --- | --- | --- | --- | --- |
| q01-absorb | photosynthesis | photosynthesis | 0.575 | yes | Plants absorb carbon dioxide from the air and water from the soil. |
| q02-clouds | water-cycle | water-cycle | 0.489 | yes | Water vapour cools, condensation forms clouds, and precipitation falls as rain or snow before collecting again. |
| q03-newton | gravity | gravity | 0.517 | yes | Isaac Newton described gravity as a universal attraction between masses. |
| q04-bees | bees | bees | 0.647 | yes | Bees communicate the location of flowers by performing a waggle dance inside the hive. |
| q05-magma | volcanoes | volcanoes | 0.501 | yes | Magma becomes lava when it reaches the surface during an eruption. |
| q06-books | library | library | 0.473 | yes | Members can borrow up to ten books for three weeks. |
| q07-oxygen | photosynthesis | photosynthesis | 0.575 | yes | Inside leaves, sunlight powers a chemical change that makes glucose, and plants release oxygen into the air. |
| q08-evaporation | water-cycle | water-cycle | 0.489 | yes | Heat from the sun causes evaporation from oceans, lakes, and rivers. |

Summary: top-1 accuracy 8 of 8 (1.000), recall at 3 is 8 of 8
(1.000). Answer correctness was judged by reading each returned
sentence against the corpus: 8 of 8 sentences state the fact the
question asked for, and 8 of 8 answers carry exactly one citation
per sentence.

Read the numbers honestly: 8 of 8 on 8 questions over 6 tiny
documents with almost no vocabulary overlap between topics proves
the loop works end to end, not that retrieval is good. The topics
were chosen so a human can check every result by eye. Harder
corpora, where documents share vocabulary and questions paraphrase
the text, are exactly where this lexical method weakens, and they
arrive at Build level.

## Limits, stated plainly

- The TF-IDF embedding is lexical: it misses paraphrase and synonym.
  A question that says "release" matches "releases" only through
  the crude stem, and a question in entirely different words from
  the document scores zero and gets no answer. Dense embeddings are
  Build level work in SPEC.md, next to hybrid search (BM25 plus
  vector) and reranking.
- The corpus is 6 synthetic documents and 7 chunks. No claim about
  scale, latency, or real-world accuracy is made or implied.
- The answer is extractive: it can only repeat corpus sentences, so
  it cannot combine facts across chunks into a new sentence, and a
  question whose answer spans two chunks gets at most the best
  sentence of each. Generative answering is Build level work.
- One chunk size (40 words, overlap 10) is used throughout. The
  chunk size trade-off (small chunks retrieve precisely, large
  chunks carry context) is measured at Build and Deep, not here.
- The run executed on the Muse VM (CPU), not the assigned
  BlackBoxV2 fleet node. Nothing at this size needs the fleet node;
  it matters from Build, where the corpus and the models grow.

## Next

Level 2, Build: hybrid search (BM25 plus vector) with reranking and
a clean query API per SPEC.md, over a larger corpus, with the same
citation discipline carried through the generative answer step.
