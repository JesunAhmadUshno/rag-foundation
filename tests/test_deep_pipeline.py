"""Level 3 Deep tests. The HyDE expectations were computed by hand
from the co-occurrence formula in src/deep_pipeline.py
before the assertions were written (worked in the comments). The
crafted multi-hop corpus is built so hop 1 cannot reach the target
document at all: the target shares no query term, only bridge
terms with the anchor document.
Run: python -m unittest discover -s tests -p "test_deep*.py" -v
"""
import json
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))

from corpus import DOCUMENTS  # noqa: E402
from deep_pipeline import (  # noqa: E402
    DeepPipeline,
    HydeGenerator,
    evaluate_doc_pairs,
    rewrite_query,
)
from pipeline import Chunk, compute_idf, content_tokens  # noqa: E402


class TestRewrite(unittest.TestCase):
    def test_rewrite_expands_synonyms_in_token_order(self):
        expanded, expansions = rewrite_query(
            "What creates the rumble heard after a flash?"
        )
        self.assertEqual(
            expansions,
            [("rumble", ["thunder"]), ("flash", ["lightning"])],
        )
        self.assertTrue(
            expanded.startswith("What creates the rumble heard after a flash?")
        )
        self.assertTrue(expanded.endswith("thunder lightning"))

    def test_rewrite_keys_are_build_stemmed_tokens(self):
        # Build tokenisation stems "droplets" to "droplet" and
        # "debris" to "debri"; the table is keyed on those stems.
        _, expansions = rewrite_query("How do droplets gather?")
        self.assertIn(("droplet", ["condensation", "cloud"]), expansions)
        _, expansions = rewrite_query("What debris do streams carry?")
        self.assertIn(("debri", ["stones", "soil"]), expansions)
        self.assertIn(("stream", ["river"]), expansions)

    def test_rewrite_no_hit_leaves_question_unchanged(self):
        question = "What does magma become when it reaches the surface?"
        expanded, expansions = rewrite_query(question)
        self.assertEqual(expanded, question)
        self.assertEqual(expansions, [])

    def test_rewrite_deterministic(self):
        question = "How does moisture in the atmosphere become droplets?"
        self.assertEqual(rewrite_query(question), rewrite_query(question))


class TestHyde(unittest.TestCase):
    def setUp(self):
        # Chunks: a "cat sat mat", b "cat ate fish", c "dog barked
        # loudly". N = 3. df: cat 2, every other term 1.
        # idf(cat) = log(4/3) + 1, idf(other) = log(4/2) + 1.
        # Query "cat": co-occurring terms sat, mat, ate, fish, each
        # with count 1, so each scores 1 * idf = log(2) + 1 and the
        # top 3 break alphabetically: ate, fish, mat.
        self.chunks = [
            Chunk("a", 0, "cat sat mat"),
            Chunk("b", 0, "cat ate fish"),
            Chunk("c", 0, "dog barked loudly"),
        ]
        token_lists = [content_tokens(c.text) for c in self.chunks]
        self.generator = HydeGenerator(self.chunks, compute_idf(token_lists))

    def test_hyde_hand_computed(self):
        self.assertEqual(self.generator.generate("cat"), "cat ate fish mat.")

    def test_hyde_two_term_question(self):
        self.assertEqual(
            self.generator.generate("cat dog"),
            "cat ate fish mat. dog barked loudly.",
        )

    def test_hyde_unseen_term_gives_empty_document(self):
        # The stated lexical limit: a term with no corpus presence
        # has no co-occurrences and contributes no sentence.
        self.assertEqual(self.generator.generate("zebra"), "")

    def test_hyde_b10_document_names_pollination_terms(self):
        pipe = DeepPipeline(DOCUMENTS)
        text = pipe.hyde.generate(
            "What carries pollen from flower to flower so pollination "
            "can happen?"
        )
        self.assertIn("stigma", text)
        self.assertIn("fertilisation", text)


class TestDeepModesOnCorpus(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pipe = DeepPipeline(DOCUMENTS)
        with open(
            os.path.join(ROOT, "experiments", "questions_deep.json"),
            encoding="utf-8",
        ) as fh:
            cls.questions = json.load(fh)

    def rankings_for(self, question_id):
        item = next(q for q in self.questions if q["id"] == question_id)
        return self.pipe.rankings(item["question"])

    def test_b10_rerank_loses_and_deep_modes_recover_pollination(self):
        docs, _ = self.rankings_for("b10-pollen")
        # The Build regression case, kept as recorded at Build:
        # hybrid plus rerank puts bees first.
        self.assertEqual(docs["hybrid_rerank"][0], "bees")
        self.assertEqual(docs["hybrid"][0], "pollination")
        for mode in ("rewrite", "hyde", "multihop", "combined"):
            self.assertEqual(docs[mode][0], "pollination", mode)

    def test_paraphrase_questions_rewrite_fixes_named_misses(self):
        for question_id, hybrid_top in (
            ("p01-condensation", "volcanoes"),
            ("p03-rumble", "seed-dispersal"),
        ):
            item = next(q for q in self.questions if q["id"] == question_id)
            docs, _ = self.pipe.rankings(item["question"])
            self.assertEqual(docs["hybrid"][0], hybrid_top, question_id)
            self.assertEqual(
                docs["rewrite"][0], item["expected_doc"], question_id
            )
            self.assertEqual(
                docs["combined"][0], item["expected_doc"], question_id
            )

    def test_rewrite_keeps_all_regression_top1(self):
        for item in self.questions:
            if item["category"] != "regression":
                continue
            docs, _ = self.pipe.rankings(item["question"])
            self.assertEqual(
                docs["rewrite"][0], item["expected_doc"], item["id"]
            )

    def test_rankings_deterministic(self):
        question = "What creates the rumble heard after a flash?"
        first, _ = self.pipe.rankings(question)
        second, _ = self.pipe.rankings(question)
        self.assertEqual(first, second)


class TestMultihop(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pipe = DeepPipeline(DOCUMENTS)

    def test_trace_structure_and_m02_bridge(self):
        _, trace = self.pipe.rankings(
            "Newton described a universal attraction between masses. "
            "What does that attraction cause on coasts twice each day?"
        )
        hop = trace["multihop"]
        self.assertEqual(hop["anchor_doc"], "gravity")
        self.assertIn("tide", hop["bridge_terms"])
        self.assertIn("moon", hop["bridge_terms"])
        self.assertIn("ocean-tides", hop["hop2_top_docs"][:3])

    def test_multihop_never_moves_hop1_top3(self):
        for question in (
            "What gas do plants absorb from the air for photosynthesis?",
            "How does moisture in the atmosphere become droplets?",
            "Members can borrow ten books for three weeks at a "
            "library. What are that library weekday hours?",
        ):
            docs, _ = self.pipe.rankings(question)
            # The union keeps the full hop 1 order as its prefix;
            # hop 2 only documents come after it.
            prefix = docs["hybrid"]
            self.assertEqual(docs["multihop"][: len(prefix)], prefix)
            self.assertEqual(docs["multihop"][0], docs["hybrid"][0])

    def test_crafted_corpus_hop2_reaches_unreachable_doc(self):
        documents = [
            {
                "id": "zebras",
                "text": (
                    "Zebras have striped coats and zebras live in "
                    "herds. Zebras graze on savanna grass near the "
                    "riverbank willow."
                ),
            },
            {
                "id": "tigers",
                "text": (
                    "Tigers have striped coats in the jungle. Tigers "
                    "hunt alone and tigers sleep in shade."
                ),
            },
            {
                "id": "horses",
                "text": (
                    "Horses live in herds on farms. Horses eat hay "
                    "and horses pull carts."
                ),
            },
            {
                "id": "otters",
                "text": (
                    "Otters swim at the riverbank willow bend. "
                    "Otters catch fish and otters play in the water."
                ),
            },
        ]
        pipe = DeepPipeline(documents)
        docs, trace = pipe.rankings(
            "What animals have striped coats and live in herds?"
        )
        # Hop 1 cannot reach otters: it shares no query term, so it
        # is absent from the hybrid ranking entirely.
        self.assertNotIn("otters", docs["hybrid"])
        self.assertEqual(trace["multihop"]["anchor_doc"], "zebras")
        self.assertIn("riverbank", trace["multihop"]["bridge_terms"])
        self.assertIn("willow", trace["multihop"]["bridge_terms"])
        self.assertEqual(trace["multihop"]["hop2_top_docs"][0], "otters")
        self.assertIn("otters", docs["multihop"])
        self.assertEqual(docs["multihop"][:3], docs["hybrid"][:3])


class TestPairMetrics(unittest.TestCase):
    def test_evaluate_doc_pairs_fixture(self):
        # Question 1 finds both expected in top 3 (recall 1.0, pair
        # yes). Question 2 finds 1 of 2 in top 3 (recall 0.5, pair
        # no). Means: recall at 3 and at 5 are 0.75, pair at 3 and
        # at 5 are 0.5.
        metrics = evaluate_doc_pairs(
            [["a", "b", "c"], ["x", "a"]],
            [["a", "b"], ["a", "y"]],
        )
        self.assertAlmostEqual(metrics["doc_recall_at_3"], 0.75)
        self.assertAlmostEqual(metrics["doc_recall_at_5"], 0.75)
        self.assertAlmostEqual(metrics["pair_at_3"], 0.5)
        self.assertAlmostEqual(metrics["pair_at_5"], 0.5)

    def test_evaluate_doc_pairs_empty(self):
        metrics = evaluate_doc_pairs([], [])
        self.assertEqual(metrics["n"], 0)
        self.assertEqual(metrics["pair_at_3"], 0.0)


if __name__ == "__main__":
    unittest.main()
