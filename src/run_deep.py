"""Run the Level 3 Deep evaluation.

Usage: python src/run_deep.py

The 42 questions in experiments/questions_deep.json (24 Build regression, 10
paraphrase, 8 multi-hop, all labelled before the run) are run
through the four Build modes and the four Deep modes on the same
20-document, 41-chunk corpus. Single document categories report
top-1, recall at 3, and MRR per mode and per category. The
multi-hop category also reports document recall at 3 and 5 and
pair completeness at 3 and 5. The full per-question record,
including rewrite expansions, hypothetical documents, and
multi-hop traces, is written to results/results_deep.json. Exit code 0 when the run completes: a miss is data.
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.dirname(HERE)

from corpus import DOCUMENTS  # noqa: E402
from deep_pipeline import DeepPipeline, evaluate_doc_pairs  # noqa: E402
from pipeline import evaluate_rankings  # noqa: E402

MODES = (
    "bm25",
    "vector",
    "hybrid",
    "hybrid_rerank",
    "rewrite",
    "hyde",
    "multihop",
    "combined",
)
CATEGORIES = ("regression", "paraphrase", "multihop")


def load_questions():
    with open(os.path.join(ROOT, "experiments", "questions_deep.json"), encoding="utf-8") as fh:
        return json.load(fh)


def primary_doc(item):
    return item.get("expected_doc") or item["expected_docs"][0]


def run_evaluation(pipeline, questions):
    per_question = []
    rankings = {mode: {} for mode in MODES}
    for item in questions:
        docs_by_mode, trace = pipeline.rankings(item["question"])
        expected_docs = item.get("expected_docs") or [item["expected_doc"]]
        row = {
            "id": item["id"],
            "category": item["category"],
            "question": item["question"],
            "expected_docs": expected_docs,
            "modes": {},
            "trace": trace,
        }
        for mode in MODES:
            docs = docs_by_mode[mode]
            rankings[mode][item["id"]] = docs
            row["modes"][mode] = {
                "top1_doc": docs[0] if docs else None,
                "top1_hit_primary": bool(docs) and docs[0] == expected_docs[0],
                "ranks_of_expected": [
                    docs.index(d) + 1 if d in docs else None
                    for d in expected_docs
                ],
                "ranked_docs": docs,
            }
        per_question.append(row)

    summary = {}
    for category in CATEGORIES:
        items = [q for q in questions if q["category"] == category]
        ids = [q["id"] for q in items]
        summary[category] = {}
        for mode in MODES:
            entry = evaluate_rankings(
                [rankings[mode][i] for i in ids],
                [primary_doc(q) for q in items],
            )
            if category == "multihop":
                entry.update(
                    evaluate_doc_pairs(
                        [rankings[mode][i] for i in ids],
                        [q["expected_docs"] for q in items],
                    )
                )
                del entry["n"]
            summary[category][mode] = entry
    single_items = [q for q in questions if q["category"] != "multihop"]
    single_ids = [q["id"] for q in single_items]
    summary["single_doc_all"] = {
        mode: evaluate_rankings(
            [rankings[mode][i] for i in single_ids],
            [primary_doc(q) for q in single_items],
        )
        for mode in MODES
    }
    return summary, per_question


def fmt(value):
    return f"{value:.3f}"


def print_tables(summary):
    for category in CATEGORIES:
        print(f"category: {category}")
        if category == "multihop":
            print(
                "mode            top1   recall@3  mrr    "
                "docR@3  docR@5  pair@3  pair@5"
            )
            for mode in MODES:
                s = summary[category][mode]
                print(
                    f"{mode:<15} {fmt(s['top1_accuracy'])}  "
                    f"{fmt(s['recall_at_3'])}     {fmt(s['mrr'])}  "
                    f"{fmt(s['doc_recall_at_3'])}   {fmt(s['doc_recall_at_5'])}"
                    f"   {fmt(s['pair_at_3'])}   {fmt(s['pair_at_5'])}"
                )
        else:
            print("mode            top1   recall@3  mrr")
            for mode in MODES:
                s = summary[category][mode]
                print(
                    f"{mode:<15} {fmt(s['top1_accuracy'])}  "
                    f"{fmt(s['recall_at_3'])}     {fmt(s['mrr'])}"
                )
    print("category: single_doc_all (regression plus paraphrase)")
    for mode in MODES:
        s = summary["single_doc_all"][mode]
        print(
            f"{mode:<15} {fmt(s['top1_accuracy'])}  "
            f"{fmt(s['recall_at_3'])}     {fmt(s['mrr'])}"
        )


def main():
    pipeline = DeepPipeline(DOCUMENTS)
    questions = load_questions()
    counts = {
        category: len([q for q in questions if q["category"] == category])
        for category in CATEGORIES
    }
    print(
        f"corpus: {len(DOCUMENTS)} documents, "
        f"{len(pipeline.chunks)} chunks"
    )
    print(
        "questions: "
        + ", ".join(f"{c} {counts[c]}" for c in CATEGORIES)
        + f", total {len(questions)}"
    )
    summary, per_question = run_evaluation(pipeline, questions)
    print_tables(summary)
    b10 = next(r for r in per_question if r["id"] == "b10-pollen")
    print("b10-pollen expected pollination, top1 by mode:")
    for mode in MODES:
        print(f"  {mode:<15} {b10['modes'][mode]['top1_doc']}")
    results = {
        "documents": len(DOCUMENTS),
        "chunks": len(pipeline.chunks),
        "questions": len(questions),
        "category_counts": counts,
        "summary": summary,
        "per_question": per_question,
    }
    out_path = os.path.join(ROOT, "results", "results_deep.json")
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(results, fh, indent=2, sort_keys=True)
    print(f"results written: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
