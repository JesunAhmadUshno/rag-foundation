"""Level 3, Deep: query rewriting, HyDE, and multi-hop retrieval.

Python standard library only. All three mechanisms sit on top of
the Level 2 Build hybrid pipeline (level-2-build/pipeline.py),
which is imported unchanged, so Build behaviour stays reproducible
for before and after comparison.

1. Query rewriting: a deterministic rule based expansion table
   (EXPANSIONS below). Keys are stemmed content tokens exactly as
   the Build tokeniser produces them (for example the question
   word "debris" stems to "debri", "droplets" to "droplet").
   Expansion terms are appended to the question and the expanded
   text runs through the Build hybrid retriever (BM25 plus TF-IDF
   vector, reciprocal rank fusion). Deep modes do not reapply the
   Build reranker: the Build ablation measured it harmful on this
   corpus (b10-pollen), and the runner still reports the reranked
   mode as a baseline column.

2. HyDE: HydeGenerator builds a hypothetical document from corpus
   vocabulary. For each distinct query content term it ranks the
   terms that co-occur with that term in corpus chunks by
   co-occurrence count times IDF and takes the top 3, then joins
   them into one sentence per query term. The retrieval query is
   the question plus this document. This is a lexical simulation
   of HyDE, not an LLM: a query term that never appears in the
   corpus has no co-occurrences, contributes no sentence, and a
   question written entirely in unseen synonyms gets an empty or
   near empty hypothetical document. The README names those cases.

3. Multi-hop retrieval: hop 1 is the hybrid ranking. The anchor
   document is the hop 1 top document. Bridge terms are content
   terms of the anchor document chunks that are not in the query
   and that appear in 2 to 5 distinct documents, sorted by
   distinct document count ascending, then IDF descending, then
   term, top 12. Hop 2 is the hybrid ranking on the bridge terms
   alone. The final document ranking keeps the hop 1 document
   order exactly and appends hop 2 documents not already present,
   in hop 2 order. By construction this cannot move the hop 1
   top 3 at document level; what it can add is documents at ranks
   beyond the hop 1 list, and an inspectable hop trace.

Combined mode is multi-hop with the rewritten query as its base:
its hop 1 is the rewrite ranking.

All rankings are deterministic: every retriever drops zero scores
and breaks ties on chunk_id, the bridge sort is total, and the
expansion table is applied in question token order.
"""

import os
import sys
from collections import Counter

sys.path.insert(
    0,
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "level-2-build",
    ),
)

from pipeline import (  # noqa: E402
    RagPipeline,
    content_tokens,
    doc_ranking,
    rrf_fuse,
)

# Synonym and term expansion table. Keys are stemmed content tokens
# as produced by the Build content_tokens function. Values are
# corpus vocabulary terms for the same concept, written in plain
# form; the pipeline tokeniser stems them on the way in.
EXPANSIONS = {
    "airborne": ["air"],
    "atmosphere": ["air", "sky"],
    "bloom": ["flower"],
    "blossom": ["flower"],
    "byproduct": ["oxygen"],
    "carving": ["shape"],
    "coordinate": ["location"],
    "debri": ["stones", "soil"],
    "discharge": ["spark", "lightning"],
    "droplet": ["condensation", "cloud"],
    "electrical": ["electricity"],
    "emerge": ["surface", "eruption"],
    "emit": ["release"],
    "female": ["stigma"],
    "flash": ["lightning"],
    "gathering": ["happens"],
    "grain": ["pollen"],
    "insect": ["bee"],
    "leafy": ["leaves"],
    "lightweight": ["light"],
    "liquid": ["molten"],
    "manufacturing": ["makes"],
    "moisture": ["water", "vapour"],
    "nourishment": ["food"],
    "organ": ["stigma"],
    "origin": ["focus"],
    "overhead": ["sky"],
    "propagule": ["seed"],
    "rumble": ["thunder"],
    "scattered": ["dispersal", "spreads"],
    "storytelling": ["storytime"],
    "stream": ["river"],
    "subterranean": ["underground"],
    "tremor": ["earthquake", "shaking"],
    "youngster": ["young", "children"],
}

BRIDGE_MAX_DOCS = 5
BRIDGE_MIN_DOCS = 2
BRIDGE_TERMS = 12
HYDE_TERMS_PER_TERM = 3


def rewrite_query(question):
    """Expand a question with the EXPANSIONS table.

    Returns (expanded_text, expansions) where expansions is a list
    of (token, [expansion terms]) in question token order, one
    entry per question token that hit the table. The original
    question text is kept intact at the front of the expanded
    text, so an expansion can only add terms, never remove any.
    """
    expansions = []
    extra = []
    for token in content_tokens(question):
        terms = EXPANSIONS.get(token)
        if terms:
            expansions.append((token, list(terms)))
            extra.extend(terms)
    expanded = question if not extra else question + " " + " ".join(extra)
    return expanded, expansions


class HydeGenerator:
    """Deterministic hypothetical documents from corpus vocabulary.

    Built from the chunk token sets of a fixed chunk list and the
    TF-IDF IDF table of the Build vector retriever. See the module
    docstring for the method and its stated limit.
    """

    def __init__(self, chunks, idf):
        self.chunk_token_sets = [set(content_tokens(c.text)) for c in chunks]
        self.idf = idf

    def generate(self, question):
        """Return the hypothetical document text for a question.

        One sentence per distinct query content term that occurs
        in the corpus: the term followed by its top co-occurring
        terms. Terms absent from the corpus contribute nothing.
        When nothing contributes, the result is the empty string.
        """
        query_terms = list(dict.fromkeys(content_tokens(question)))
        query_set = set(query_terms)
        sentences = []
        for term in query_terms:
            co_counts = Counter()
            for token_set in self.chunk_token_sets:
                if term in token_set:
                    for other in token_set:
                        if other not in query_set:
                            co_counts[other] += 1
            if not co_counts:
                continue
            ranked = sorted(
                co_counts.items(),
                key=lambda kv: (-(kv[1] * self.idf.get(kv[0], 1.0)), kv[0]),
            )
            top = [t for t, _ in ranked[:HYDE_TERMS_PER_TERM]]
            sentences.append(term + " " + " ".join(top))
        return ". ".join(sentences) + "." if sentences else ""


def evaluate_doc_pairs(ranked_docs_per_question, expected_docs_list):
    """Multi-hop metrics over document rankings.

    Returns document recall at 3 and at 5 (the mean share of the
    expected documents found inside the first 3 or 5 documents)
    and pair completeness at 3 and at 5 (the share of questions
    where every expected document is inside the first 3 or 5).
    """
    n = len(expected_docs_list)
    if n == 0:
        return {
            "n": 0,
            "doc_recall_at_3": 0.0,
            "doc_recall_at_5": 0.0,
            "pair_at_3": 0.0,
            "pair_at_5": 0.0,
        }
    recall3 = 0.0
    recall5 = 0.0
    pair3 = 0
    pair5 = 0
    for ranking, expected in zip(ranked_docs_per_question, expected_docs_list):
        expected = list(expected)
        recall3 += len([d for d in expected if d in ranking[:3]]) / len(expected)
        recall5 += len([d for d in expected if d in ranking[:5]]) / len(expected)
        if all(d in ranking[:3] for d in expected):
            pair3 += 1
        if all(d in ranking[:5] for d in expected):
            pair5 += 1
    return {
        "n": n,
        "doc_recall_at_3": recall3 / n,
        "doc_recall_at_5": recall5 / n,
        "pair_at_3": pair3 / n,
        "pair_at_5": pair5 / n,
    }


class DeepPipeline:
    """Deep modes over the Build pipeline on the same corpus.

    rankings(question) returns document rankings for the four
    Build modes and the four Deep modes, plus a trace dict with
    the rewrite expansions, the hypothetical document, and the
    multi-hop traces for the multihop and combined modes.
    """

    def __init__(self, documents, chunk_size=40, overlap=10):
        self.pipeline = RagPipeline(documents, chunk_size, overlap)
        self.chunks = self.pipeline.chunks
        self.hyde = HydeGenerator(self.chunks, self.pipeline.vector.idf)
        term_docs = {}
        for chunk in self.chunks:
            for term in set(content_tokens(chunk.text)):
                term_docs.setdefault(term, set()).add(chunk.doc_id)
        self.term_docs = term_docs
        self.anchor_tokens = {}
        for chunk in self.chunks:
            self.anchor_tokens.setdefault(chunk.doc_id, set()).update(
                content_tokens(chunk.text)
            )

    def hybrid_ranking(self, query_text):
        """Build hybrid chunk ranking (BM25 plus vector, RRF)."""
        return rrf_fuse(
            [
                self.pipeline.bm25.retrieve(query_text),
                self.pipeline.vector.retrieve(query_text),
            ]
        )

    def bridge_terms(self, anchor_doc, base_query):
        """Linking terms of the anchor document, per the spec."""
        query_terms = set(content_tokens(base_query))
        idf = self.pipeline.vector.idf
        candidates = []
        for term in self.anchor_tokens.get(anchor_doc, set()) - query_terms:
            doc_count = len(self.term_docs.get(term, set()))
            if BRIDGE_MIN_DOCS <= doc_count <= BRIDGE_MAX_DOCS:
                candidates.append((term, doc_count, idf.get(term, 1.0)))
        candidates.sort(key=lambda item: (item[1], -item[2], item[0]))
        return [term for term, _, _ in candidates[:BRIDGE_TERMS]]

    def multihop_ranking(self, base_query):
        """Multi-hop over a base query text.

        Returns (final_doc_ranking, trace) where the final ranking
        is the hop 1 document order with hop 2 only documents
        appended, and the trace carries the anchor document, the
        bridge terms, and the top 5 documents of each hop.
        """
        hop1 = self.hybrid_ranking(base_query)
        hop1_docs = doc_ranking([c for c, _ in hop1])
        trace = {
            "anchor_doc": hop1_docs[0] if hop1_docs else None,
            "bridge_terms": [],
            "hop1_top_docs": hop1_docs[:5],
            "hop2_top_docs": [],
        }
        if not hop1_docs:
            return [], trace
        bridge = self.bridge_terms(hop1_docs[0], base_query)
        trace["bridge_terms"] = bridge
        if not bridge:
            return hop1_docs, trace
        hop2 = self.hybrid_ranking(" ".join(bridge))
        hop2_docs = doc_ranking([c for c, _ in hop2])
        trace["hop2_top_docs"] = hop2_docs[:5]
        final = list(hop1_docs)
        for doc_id in hop2_docs:
            if doc_id not in final:
                final.append(doc_id)
        return final, trace

    def rankings(self, question):
        """All mode document rankings for one question, plus trace."""
        stages = self.pipeline.rankings(question)
        build = {
            "bm25": doc_ranking([c for c, _ in stages["bm25"]]),
            "vector": doc_ranking([c for c, _ in stages["vector"]]),
            "hybrid": doc_ranking([c for c, _ in stages["hybrid"]]),
            "hybrid_rerank": doc_ranking(
                [e["chunk"] for e in stages["reranked"]]
            ),
        }
        expanded, expansions = rewrite_query(question)
        rewrite_docs = doc_ranking(
            [c for c, _ in self.hybrid_ranking(expanded)]
        )
        hyde_text = self.hyde.generate(question)
        hyde_query = question if not hyde_text else question + " " + hyde_text
        hyde_docs = doc_ranking(
            [c for c, _ in self.hybrid_ranking(hyde_query)]
        )
        multihop_docs, multihop_trace = self.multihop_ranking(question)
        combined_docs, combined_trace = self.multihop_ranking(expanded)
        docs = {
            **build,
            "rewrite": rewrite_docs,
            "hyde": hyde_docs,
            "multihop": multihop_docs,
            "combined": combined_docs,
        }
        trace = {
            "expansions": [
                {"token": token, "terms": terms}
                for token, terms in expansions
            ],
            "expanded_query": expanded,
            "hyde_document": hyde_text,
            "multihop": multihop_trace,
            "combined": combined_trace,
        }
        return docs, trace


def build_deep_pipeline(chunk_size=40, overlap=10):
    """Build the Deep pipeline over the Build corpus."""
    from corpus import DOCUMENTS

    return DeepPipeline(DOCUMENTS, chunk_size, overlap)
