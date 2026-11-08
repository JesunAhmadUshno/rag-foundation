"""Level 1 Learn tests. Every expected value below was computed by
hand from the formulas in src/rag.py before the code ran.
Run: python -m unittest discover -s tests -p "test_learn*.py" -v
"""
import math
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))

from rag import (  # noqa: E402
    Chunk,
    Retriever,
    answer_question,
    build_retriever,
    chunk_document,
    compute_idf,
    content_tokens,
    cosine_similarity,
    split_sentences,
    tfidf_vector,
)


class TestChunking(unittest.TestCase):
    def test_chunk_boundaries_no_overlap(self):
        # 7 words, size 3, overlap 0, step 3: starts 0, 3, 6.
        chunks = chunk_document("d", "one two three four five six seven", 3, 0)
        self.assertEqual(
            [c.text for c in chunks],
            ["one two three", "four five six", "seven"],
        )
        self.assertEqual([c.chunk_id for c in chunks], ["d-c0", "d-c1", "d-c2"])

    def test_chunk_boundaries_with_overlap(self):
        # 7 words, size 3, overlap 1, step 2: starts 0, 2, 4, then
        # start 4 plus size 3 reaches the end, so it stops.
        chunks = chunk_document("d", "one two three four five six seven", 3, 1)
        self.assertEqual(
            [c.text for c in chunks],
            ["one two three", "three four five", "five six seven"],
        )

    def test_short_text_single_chunk(self):
        chunks = chunk_document("d", "only three words", 40, 10)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].text, "only three words")
        self.assertEqual(chunks[0].doc_id, "d")

    def test_overlap_must_be_below_size(self):
        with self.assertRaises(ValueError):
            chunk_document("d", "some words here", 3, 3)


class TestTokensAndSentences(unittest.TestCase):
    def test_content_tokens_drop_stopwords(self):
        # "the" and "is" are stopwords, "what" and "how" also drop.
        self.assertEqual(
            content_tokens("The Cat is on the Mat."), ["cat", "mat"]
        )

    def test_split_sentences(self):
        self.assertEqual(
            split_sentences("Cats sleep. Dogs bark! Birds sing?"),
            ["Cats sleep.", "Dogs bark!", "Birds sing?"],
        )


class TestVectors(unittest.TestCase):
    def test_cosine_identical_is_one(self):
        self.assertAlmostEqual(
            cosine_similarity({"a": 1.0, "b": 2.0}, {"a": 1.0, "b": 2.0}), 1.0
        )

    def test_cosine_orthogonal_is_zero(self):
        self.assertEqual(cosine_similarity({"a": 1.0}, {"b": 1.0}), 0.0)

    def test_cosine_hand_value(self):
        # dot = 1, norms sqrt(2) and 1, cosine = 1 / sqrt(2) = 0.707107.
        self.assertAlmostEqual(
            cosine_similarity({"a": 1.0, "b": 1.0}, {"a": 1.0}),
            1 / math.sqrt(2),
            places=6,
        )

    def test_idf_hand_values(self):
        # N = 2. cat in both chunks: log(3/3) + 1 = 1.0.
        # sat in one chunk: log(3/2) + 1 = 1.405465 (6 dp).
        idf = compute_idf([["cat", "sat"], ["cat", "dog"]])
        self.assertAlmostEqual(idf["cat"], 1.0)
        self.assertAlmostEqual(idf["sat"], math.log(3 / 2) + 1.0, places=6)
        self.assertAlmostEqual(idf["dog"], math.log(3 / 2) + 1.0, places=6)

    def test_tfidf_vector_hand_value(self):
        # Raw count 2 times idf 1.5 gives 3.0. Unseen term is skipped.
        vec = tfidf_vector(["cat", "cat", "dog"], {"cat": 1.5, "dog": 2.0})
        self.assertEqual(vec, {"cat": 3.0, "dog": 2.0})
        self.assertEqual(tfidf_vector(["zebra"], {"cat": 1.5}), {})


class TestRetrievalAndAnswer(unittest.TestCase):
    def setUp(self):
        self.chunks = [
            Chunk("cats", 0, "The cat sat on the mat all day."),
            Chunk("dogs", 0, "The dog barked at the mail carrier."),
            Chunk("birds", 0, "The bird sang a song at dawn."),
        ]
        self.retriever = Retriever(self.chunks)

    def test_retrieval_ranking_tiny_example(self):
        # Query terms cat and sat occur only in the cats chunk, so it
        # must rank first, and it is the only chunk scoring above 0
        # apart from any chunk sharing no term (none do here beyond
        # stopwords, which are removed).
        results = self.retriever.retrieve("cat sat", top_k=3)
        self.assertEqual(results[0][0].doc_id, "cats")
        self.assertGreater(results[0][1], 0.0)
        self.assertTrue(all(doc != "cats" or i == 0 for i, (c, _) in enumerate(results) for doc in [c.doc_id]))

    def test_every_answer_sentence_has_citation(self):
        retriever = build_retriever()
        result = answer_question(
            retriever, "What gas do plants absorb from the air for photosynthesis?"
        )
        self.assertTrue(result["sentences"])
        self.assertEqual(len(result["citations"]), len(result["sentences"]))
        for sentence, doc_id, chunk_id in result["citations"]:
            self.assertIn(sentence, result["answer"])
            self.assertTrue(chunk_id.startswith(doc_id + "-c"))

    def test_corpus_question_top1(self):
        retriever = build_retriever()
        results = retriever.retrieve(
            "How do bees communicate the location of flowers?", top_k=3
        )
        self.assertEqual(results[0][0].doc_id, "bees")

    def test_answer_picks_the_answering_sentence(self):
        # Regression: the short topic sentence of the water cycle
        # document ("The water cycle moves water...") shares the two
        # topic terms with both questions below and outscored the
        # answering sentences under plain cosine. IDF-weighted query
        # coverage picks the sentence that answers the question.
        retriever = build_retriever()
        clouds = answer_question(
            retriever, "What process forms clouds in the water cycle?"
        )
        self.assertIn("condensation forms clouds", clouds["answer"])
        evap = answer_question(
            retriever, "What causes evaporation in the water cycle?"
        )
        self.assertIn("causes evaporation", evap["answer"])


if __name__ == "__main__":
    unittest.main()
