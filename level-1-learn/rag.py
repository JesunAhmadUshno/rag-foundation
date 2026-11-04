"""Level 1, Learn: a tiny retrieval-augmented generation pipeline.

Python standard library only. No embeddings model, no vector database,
no language model. Every step is in the open so a reader can check it
by hand:

1. Chunk: split each document into word windows with overlap.
2. Embed: turn each chunk into a TF-IDF vector (a dict of term to
   weight). IDF uses the smoothed formula
   idf(t) = log((1 + N) / (1 + df(t))) + 1, where N is the number of
   chunks and df(t) is the number of chunks containing term t.
   Term frequency is the raw count of the term in the chunk.
3. Retrieve: rank chunks by cosine similarity between the query
   TF-IDF vector (built with the corpus IDF) and each chunk vector.
4. Answer: extractive only. Sentences are taken word for word from
   the retrieved chunks, scored by how many query content tokens
   they share, and every returned sentence carries a citation
   (doc id plus chunk id). Nothing is generated, so nothing can be
   invented at this level, and every claim can be traced.

Content tokens means lowercase words and numbers with stopwords
removed (the, a, is, and similar), the same convention as the
sibling rag-eval-harness project.
"""

import math
import re
from collections import Counter

STOPWORDS = frozenset(
    "a an the is are was were be been of to in on for and or as at by "
    "it its this that these those from with without into over under "
    "how what where when who why do does did can could during which "
    "each".split()
)

TOKEN_RE = re.compile(r"[a-z0-9]+")
SENTENCE_RE = re.compile(r"[^.!?]+[.!?]")


def _stem(token):
    """Crude singular stem: drop a trailing s when the token is longer
    than 3 characters and does not end in ss. Releases and release map
    to the same term; so do plants and plant. Crude by design, and a
    named limit in the README: it is not a real stemmer."""
    if (
        len(token) > 3
        and token.endswith("s")
        and not token.endswith("ss")
        and not token.endswith("sis")
    ):
        return token[:-1]
    return token


def content_tokens(text):
    """Lowercase word and number tokens, stopwords removed, lightly
    stemmed, order kept."""
    return [_stem(t) for t in TOKEN_RE.findall(text.lower()) if t not in STOPWORDS]


def all_tokens(text):
    """Lowercase word and number tokens, stopwords kept, order kept."""
    return TOKEN_RE.findall(text.lower())


def split_sentences(text):
    """Split text into sentences, keeping the ending punctuation."""
    parts = [p.strip() for p in SENTENCE_RE.findall(text)]
    return [p for p in parts if p]


class Chunk:
    """One chunk of one document. chunk_id looks like photosynthesis-c0."""

    def __init__(self, doc_id, index, text):
        self.doc_id = doc_id
        self.index = index
        self.chunk_id = f"{doc_id}-c{index}"
        self.text = text

    def __repr__(self):
        return f"Chunk({self.chunk_id!r})"


def chunk_document(doc_id, text, chunk_size=40, overlap=10):
    """Split one document into word windows with overlap.

    Words are whitespace separated tokens of the original text, so
    chunk boundaries are word boundaries a reader can count. The step
    is chunk_size minus overlap. The final partial window is kept.
    Raises ValueError when overlap is not smaller than chunk_size.
    """
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be at least 0 and below chunk_size")
    words = text.split()
    if not words:
        return []
    step = chunk_size - overlap
    chunks = []
    start = 0
    index = 0
    while start < len(words):
        window = words[start:start + chunk_size]
        chunks.append(Chunk(doc_id, index, " ".join(window)))
        index += 1
        if start + chunk_size >= len(words):
            break
        start += step
    return chunks


def chunk_corpus(documents, chunk_size=40, overlap=10):
    """Chunk every document in a list of (doc_id, text) pairs."""
    chunks = []
    for doc_id, text in documents:
        chunks.extend(chunk_document(doc_id, text, chunk_size, overlap))
    return chunks


def compute_idf(chunks_tokens):
    """Smoothed IDF for a list of token lists. Returns a dict.

    idf(t) = log((1 + N) / (1 + df(t))) + 1, natural log.
    A term in every chunk gets idf 1.0. A term in one of two chunks
    gets log(3 / 2) + 1 = 1.405465 (6 dp).
    """
    n = len(chunks_tokens)
    df = Counter()
    for tokens in chunks_tokens:
        for term in set(tokens):
            df[term] += 1
    return {term: math.log((1 + n) / (1 + count)) + 1.0 for term, count in df.items()}


def tfidf_vector(tokens, idf):
    """TF-IDF vector as a dict: raw term count times IDF.

    Terms missing from the IDF table (unseen query terms) are skipped:
    they occur in no chunk, so they can contribute no similarity.
    """
    counts = Counter(tokens)
    return {t: c * idf[t] for t, c in counts.items() if t in idf}


def cosine_similarity(vec_a, vec_b):
    """Cosine similarity between two sparse dict vectors. 0.0 to 1.0
    for the non-negative TF-IDF vectors used here. Empty or zero
    vectors score 0.0."""
    if not vec_a or not vec_b:
        return 0.0
    shared = set(vec_a) & set(vec_b)
    dot = sum(vec_a[t] * vec_b[t] for t in shared)
    norm_a = math.sqrt(sum(v * v for v in vec_a.values()))
    norm_b = math.sqrt(sum(v * v for v in vec_b.values()))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


class Retriever:
    """TF-IDF retrieval over a fixed list of chunks."""

    def __init__(self, chunks):
        self.chunks = list(chunks)
        token_lists = [content_tokens(c.text) for c in self.chunks]
        self.idf = compute_idf(token_lists)
        self.vectors = [tfidf_vector(tokens, self.idf) for tokens in token_lists]

    def retrieve(self, query, top_k=3):
        """Return up to top_k (chunk, score) pairs, best first.

        Ties break on chunk_id so the ranking is deterministic.
        Chunks scoring 0.0 are dropped: no shared term, no evidence.
        """
        query_vec = tfidf_vector(content_tokens(query), self.idf)
        scored = []
        for chunk, vec in zip(self.chunks, self.vectors):
            score = cosine_similarity(query_vec, vec)
            if score > 0.0:
                scored.append((chunk, score))
        scored.sort(key=lambda pair: (-pair[1], pair[0].chunk_id))
        return scored[:top_k]


def answer_question(retriever, query, top_k=3, max_sentences=2):
    """Answer extractively from the retrieved chunks.

    Each retrieved chunk contributes its single best sentence, scored
    by IDF-weighted query coverage: the sum of the IDF weights of
    the query terms the sentence contains, divided by the sum for
    all query terms that occur in the corpus. A sentence that covers
    more of the question wins, a rare term like evaporation counts
    more than a common one like water, and a short topic sentence
    cannot outrank the sentence that answers the question on the
    strength of two topic words alone (the failure plain cosine
    showed on the water cycle questions; ties keep the earlier
    sentence). The first picked
    sentence is always kept. A later sentence is kept only when its
    coverage is at least 0.30, so a weak second chunk cannot
    drag an off-topic sentence into the answer. Sentences are
    returned in retrieval rank order, at most max_sentences of them.
    Every sentence carries its citation. Returns a dict with keys:
    query, retrieved, sentences, answer, citations. Answer is the
    sentences joined by a space; citations is a list of
    (sentence, doc_id, chunk_id) in the same order.
    """
    retrieved = retriever.retrieve(query, top_k=top_k)
    query_terms = {t for t in content_tokens(query) if t in retriever.idf}
    query_weight = sum(retriever.idf[t] for t in query_terms)
    picked = []
    for chunk, score in retrieved:
        best_sentence = None
        best_coverage = 0.0
        for sentence in split_sentences(chunk.text):
            shared = query_terms & set(content_tokens(sentence))
            coverage = (
                sum(retriever.idf[t] for t in shared) / query_weight
                if query_weight else 0.0
            )
            if coverage > best_coverage:
                best_coverage = coverage
                best_sentence = sentence
        if best_sentence is not None:
            if picked and best_coverage < 0.30:
                continue
            picked.append({
                "sentence": best_sentence,
                "doc_id": chunk.doc_id,
                "chunk_id": chunk.chunk_id,
                "score": score,
                "sentence_score": best_coverage,
            })
        if len(picked) >= max_sentences:
            break
    return {
        "query": query,
        "retrieved": retrieved,
        "sentences": picked,
        "answer": " ".join(p["sentence"] for p in picked),
        "citations": [(p["sentence"], p["doc_id"], p["chunk_id"]) for p in picked],
    }


# Small built-in corpus: six short documents, each two or three
# sentences, on topics with little vocabulary overlap so retrieval
# results can be checked by eye. Synthetic teaching data by design.
CORPUS = [
    (
        "photosynthesis",
        "Photosynthesis is how green plants make food using sunlight. "
        "Plants absorb carbon dioxide from the air and water from the soil. "
        "Inside leaves, sunlight powers a chemical change that makes "
        "glucose, and plants release oxygen into the air.",
    ),
    (
        "water-cycle",
        "The water cycle moves water between the earth and the sky. "
        "Heat from the sun causes evaporation from oceans, lakes, and rivers. "
        "Water vapour cools, condensation forms clouds, and precipitation "
        "falls as rain or snow before collecting again.",
    ),
    (
        "gravity",
        "Gravity is a force that pulls objects toward each other. "
        "Isaac Newton described gravity as a universal attraction "
        "between masses. The gravity of Earth pulls objects toward its "
        "centre, which is why dropped objects fall down.",
    ),
    (
        "bees",
        "Honey bees collect nectar and pollen from flowers. "
        "Bees communicate the location of flowers by performing a "
        "waggle dance inside the hive. A colony has one queen bee, "
        "many worker bees, and a smaller number of drone bees.",
    ),
    (
        "volcanoes",
        "A volcano is an opening where molten rock can erupt from "
        "below the surface of the earth. Magma becomes lava when it "
        "reaches the surface during an eruption. Volcanic ash and "
        "lava flows can change the landscape for many years.",
    ),
    (
        "library",
        "The Northlight library opens at eight in the morning on "
        "weekdays and closes at nine in the evening. Members can "
        "borrow up to ten books for three weeks. The library offers "
        "free wifi, printing, and a quiet study room on the second floor.",
    ),
]


def build_retriever(chunk_size=40, overlap=10):
    """Build the default retriever over the built-in corpus."""
    return Retriever(chunk_corpus(CORPUS, chunk_size, overlap))
