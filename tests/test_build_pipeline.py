"""Level 2 Build tests. Expected values were computed by hand from
the formulas in level-2-build/pipeline.py before assertions were
written (the BM25 and RRF arithmetic is worked in the comments).
Run: python -m unittest discover -s tests -p "test_build*.py" -v
"""
import json
import math
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "level-2-build"))
sys.path.insert(0, os.path.join(ROOT, "level-1-learn"))

from corpus import DOCUMENTS  # noqa: E402
from pipeline import (  # noqa: E402
    BM25Retriever,
    Chunk,
    RagPipeline,
    VectorRetriever,
    chunk_document as build_chunk_document,
    content_tokens,
    coverage_f1,
    doc_ranking,
    evaluate_rankings,
    rerank,
    rrf_fuse,
)
from rag import chunk_document as learn_chunk_document  # noqa: E402


class TestBM25(unittest.TestCase):
    def setUp(self):
        # Chunk a: tokens cat, sat, cat (dl 3). Chunk b: dog, sat
        # (dl 2). N = 2, avgdl = 2.5.
        # df: cat 1, sat 2, dog 1.
        # idf(cat) = ln(1 + 1.5 / 1.5) = ln(2) = 0.693147.
        # idf(sat) = ln(1 + 0.5 / 2.5) = ln(1.2) = 0.182322.
        self.chunks = [
            Chunk("a", 0, "cat sat cat"),
            Chunk("b", 0, "dog sat"),
        ]
        self.index = BM25Retriever(self.chunks)

    def test_bm25_idf_hand_values(self):
        self.assertAlmostEqual(self.index.idf["cat"], math.log(2), places=6)
        self.assertAlmostEqual(self.index.idf["sat"], math.log(1.2), places=6)
        self.assertAlmostEqual(self.index.avgdl, 2.5)

    def test_bm25_score_hand_computed(self):
        # Query "cat sat", chunk a:
        # cat tf 2: denom 2 + 1.5 * (0.25 + 0.75 * 3 / 2.5) = 3.725,
        #   term = ln(2) * 2 * 2.5 / 3.725 = ln(2) * 5 / 3.725.
        # sat tf 1: denom 1 + 1.725 = 2.725,
        #   term = ln(1.2) * 2.5 / 2.725.
        # Total 1.097666 (6 dp).
        expected = math.log(2) * 5 / 3.725 + math.log(1.2) * 2.5 / 2.725
        score = self.index.score(content_tokens("cat sat"), 0)
        self.assertAlmostEqual(score, expected, places=9)
        self.assertAlmostEqual(score, 1.097666, places=6)

    def test_bm25_ranking_and_zero_drop(self):
        results = self.index.retrieve("cat sat")
        self.assertEqual([c.chunk_id for c, _ in results], ["a-c0", "b-c0"])
        # A query with no shared term scores zero everywhere and the
        # ranking is empty: zero scores are dropped, not returned.
        self.assertEqual(self.index.retrieve("zebra"), [])


class TestVector(unittest.TestCase):
    def test_vector_ranking_tiny_example(self):
        chunks = [
            Chunk("cats", 0, "The cat sat on the mat all day."),
            Chunk("dogs", 0, "The dog barked at the mail carrier."),
        ]
        retriever = VectorRetriever(chunks)
        results = retriever.retrieve("cat sat", top_k=3)
        self.assertEqual(results[0][0].doc_id, "cats")
        self.assertGreater(results[0][1], 0.0)

    def test_chunking_matches_learn(self):
        text = " ".join(f"word{i}" for i in range(95))
        built = build_chunk_document("d", text, 40, 10)
        learned = learn_chunk_document("d", text, 40, 10)
        self.assertEqual(
            [(c.chunk_id, c.text) for c in built],
            [(c.chunk_id, c.text) for c in learned],
        )


class TestFusion(unittest.TestCase):
    def test_rrf_arithmetic_hand_computed(self):
        # Rankings: [x, y] and [x, z], k = 60, ranks 1-based.
        # x: 1/61 + 1/61 = 2/61 = 0.032787. y: 1/62. z: 1/62.
        # y and z tie on score and break on chunk_id.
        x = Chunk("x", 0, "alpha")
        y = Chunk("y", 0, "beta")
        z = Chunk("z", 0, "gamma")
        fused = rrf_fuse([[(x, 9.0), (y, 8.0)], [(x, 7.0), (z, 6.0)]])
        self.assertEqual([c.chunk_id for c, _ in fused], ["x-c0", "y-c0", "z-c0"])
        self.assertAlmostEqual(fused[0][1], 2 / 61, places=9)
        self.assertAlmostEqual(fused[1][1], 1 / 62, places=9)
        self.assertAlmostEqual(fused[2][1], 1 / 62, places=9)

    def test_rrf_single_ranking_chunk_gets_one_term(self):
        # A chunk in only one ranking keeps exactly that one term.
        a = Chunk("a", 0, "only here")
        fused = rrf_fuse([[(a, 3.0)], []])
        self.assertEqual(len(fused), 1)
        self.assertAlmostEqual(fused[0][1], 1 / 61, places=9)


class TestReranker(unittest.TestCase):
    def test_coverage_f1_hand_values(self):
        # Query terms: wind, carry (stemmed from carries), light,
        # seed (stemmed from seeds): 4 terms, all in the passage.
        # Passage terms: wind, carry, light, seed, wing, across,
        # field: 7 terms. coverage 1.0, precision 4/7,
        # f1 = 2 * (4/7) * 1 / (4/7 + 1) = 0.727273 (6 dp).
        coverage, f1 = coverage_f1(
            "wind carries light seeds",
            "Wind carries light seeds with wings across fields.",
        )
        self.assertAlmostEqual(coverage, 1.0)
        self.assertAlmostEqual(f1, 0.727273, places=6)

    def test_reranker_flips_wrong_on_top(self):
        # Crafted wrong-on-top case: the first hybrid hit repeats one
        # query term (high hybrid score) but covers 1 of 5 query
        # terms; the second covers all 5. Coverage must flip them.
        query = "wind carries light seeds wings"
        wrong = Chunk("wrong", 0, "Wind wind wind blows over the fields all day long.")
        right = Chunk("right", 0, "Wind carries light seeds with wings across fields.")
        out = rerank(query, [(wrong, 0.030), (right, 0.020)])
        self.assertEqual(out[0]["chunk"].chunk_id, "right-c0")
        self.assertEqual(out[1]["chunk"].chunk_id, "wrong-c0")
        self.assertAlmostEqual(out[0]["coverage"], 1.0)
        self.assertLess(out[1]["coverage"], out[0]["coverage"])

    def test_reranker_deterministic_on_ties(self):
        query = "cat sat"
        a = Chunk("a", 0, "cat sat here")
        b = Chunk("b", 0, "cat sat there")
        hits = [(a, 0.02), (b, 0.02)]
        first = [e["chunk"].chunk_id for e in rerank(query, hits)]
        second = [e["chunk"].chunk_id for e in rerank(query, list(hits))]
        self.assertEqual(first, second)
        self.assertEqual(first, ["a-c0", "b-c0"])


class TestCorpusAndQuestions(unittest.TestCase):
    def test_corpus_size_and_topics(self):
        self.assertGreaterEqual(len(DOCUMENTS), 16)
        topics = {d["topic"] for d in DOCUMENTS}
        self.assertGreaterEqual(len(topics), 6)
        ids = [d["id"] for d in DOCUMENTS]
        self.assertEqual(len(ids), len(set(ids)))

    def test_questions_labelled_and_answerable(self):
        with open(
            os.path.join(ROOT, "level-2-build", "questions.json"),
            encoding="utf-8",
        ) as fh:
            questions = json.load(fh)
        self.assertGreaterEqual(len(questions), 20)
        doc_ids = {d["id"] for d in DOCUMENTS}
        for item in questions:
            self.assertIn(item["expected_doc"], doc_ids)
            self.assertTrue(item["question"])
            self.assertTrue(item["id"])


class TestQueryAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pipe = RagPipeline(DOCUMENTS)

    def test_api_returns_citation_per_sentence(self):
        result = self.pipe.query(
            "How many books can members borrow from the Northlight library?"
        )
        self.assertTrue(result["sentences"])
        self.assertIn("ten books", result["answer"])
        self.assertEqual(len(result["citations"]), len(result["sentences"]))
        for sentence, doc_id, chunk_id in result["citations"]:
            self.assertIn(sentence, result["answer"])
            self.assertTrue(chunk_id.startswith(doc_id + "-c"))

    def test_api_answer_sentences_are_extractive(self):
        corpus_text = " ".join(d["text"] for d in DOCUMENTS)
        for question in (
            "How do bees communicate the location of flowers?",
            "What does magma become when it reaches the surface?",
            "How do birds navigate during migration?",
        ):
            result = self.pipe.query(question)
            self.assertTrue(result["sentences"])
            for entry in result["sentences"]:
                self.assertIn(entry["sentence"], corpus_text)

    def test_api_stage_breakdown_complete(self):
        result = self.pipe.query(
            "What spins the blades of a wind turbine to make electricity?"
        )
        self.assertEqual(
            set(result["stages"]), {"bm25", "vector", "hybrid", "reranked"}
        )
        for entries in result["stages"].values():
            self.assertTrue(entries)
            for entry in entries:
                self.assertIn("chunk_id", entry)
                self.assertIn("doc_id", entry)
                self.assertIn("score", entry)
        for entry in result["stages"]["reranked"]:
            self.assertIn("coverage", entry)
            self.assertIn("f1", entry)
        self.assertEqual(result["stages"]["reranked"][0]["doc_id"], "wind-power")

    def test_api_determinism(self):
        question = "What pulls on ocean water to cause a high tide?"
        first = self.pipe.query(question)
        second = self.pipe.query(question)
        self.assertEqual(first["answer"], second["answer"])
        self.assertEqual(first["citations"], second["citations"])
        self.assertEqual(first["stages"], second["stages"])

    def test_api_no_match_returns_empty_answer(self):
        result = self.pipe.query("zxqvbn wobblefruit quixotic")
        self.assertEqual(result["answer"], "")
        self.assertEqual(result["citations"], [])
        self.assertEqual(result["sentences"], [])


class TestAblationMetrics(unittest.TestCase):
    def test_evaluate_rankings_fixture(self):
        # Rankings: question 1 ranks expected first, question 2 ranks
        # it second. top1 = 1/2, recall at 3 = 2/2,
        # MRR = (1 + 1/2) / 2 = 0.75.
        metrics = evaluate_rankings(
            [["a", "b", "c"], ["x", "a", "y"]], ["a", "a"]
        )
        self.assertAlmostEqual(metrics["top1_accuracy"], 0.5)
        self.assertAlmostEqual(metrics["recall_at_3"], 1.0)
        self.assertAlmostEqual(metrics["mrr"], 0.75)

    def test_evaluate_rankings_absent_doc(self):
        metrics = evaluate_rankings([["x", "y"]], ["a"])
        self.assertEqual(metrics["top1_accuracy"], 0.0)
        self.assertEqual(metrics["recall_at_3"], 0.0)
        self.assertEqual(metrics["mrr"], 0.0)

    def test_doc_ranking_dedupes_chunks(self):
        chunks = [
            Chunk("a", 0, "one"),
            Chunk("a", 1, "two"),
            Chunk("b", 0, "three"),
        ]
        self.assertEqual(doc_ranking(chunks), ["a", "b"])


if __name__ == "__main__":
    unittest.main()
