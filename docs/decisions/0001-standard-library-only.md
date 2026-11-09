# 0001. Standard library only; the vector side is TF-IDF

Date: 2026-11-04 (recorded 2026-11-08). Status: accepted.

Context. The project had to run anywhere, at no cost, with no model,
credential or network call, and every number had to be checkable by
hand.

Decision. The whole pipeline uses the Python standard library only.
The "vector" retriever is TF-IDF cosine, a lexical sparse vector, not
a dense embedding, and no file claims otherwise. HyDE is a lexical
co-occurrence simulation, not a language model.

Consequences. Paraphrase and synonym questions miss in both
retrievers unless rewriting supplies the words; HyDE cannot invent
vocabulary the corpus lacks (p01, p03). Dense embeddings and model
based rewriting and HyDE are future work (REPORT.md, items 1 and 2)
and need an Owner decision on model and cost.
