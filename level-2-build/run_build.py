"""Run the Level 2 Build ablation and a demo query.

Usage: python level-2-build/run_build.py

Ablation: the SAME 24 labelled questions and the SAME chunking are
run through four modes: BM25 only, vector only (TF-IDF cosine),
hybrid (reciprocal rank fusion), and hybrid plus rerank. Per mode
the runner reports top-1 accuracy, recall at 3, and MRR at document
level, and writes the full per-question table to results_build.json
beside this file. Exit code 0 when the run completes: a miss is
data, and the summary prints either way.
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from corpus import DOCUMENTS  # noqa: E402
from pipeline import RagPipeline, doc_ranking, evaluate_rankings  # noqa: E402

MODES = ("bm25", "vector", "hybrid", "hybrid_rerank")


def load_questions():
    with open(os.path.join(HERE, "questions.json"), encoding="utf-8") as fh:
        return json.load(fh)


def mode_ranked_docs(pipeline, question):
    """Document ranking per mode for one question."""
    stages = pipeline.rankings(question)
    return {
        "bm25": doc_ranking([c for c, _ in stages["bm25"]]),
        "vector": doc_ranking([c for c, _ in stages["vector"]]),
        "hybrid": doc_ranking([c for c, _ in stages["hybrid"]]),
        "hybrid_rerank": doc_ranking([e["chunk"] for e in stages["reranked"]]),
    }


def run_ablation(pipeline, questions):
    per_question = []
    rankings_by_mode = {mode: [] for mode in MODES}
    for item in questions:
        ranked = mode_ranked_docs(pipeline, item["question"])
        row = {"id": item["id"], "expected_doc": item["expected_doc"]}
        for mode in MODES:
            docs = ranked[mode]
            rankings_by_mode[mode].append(docs)
            row[mode] = {
                "top1_doc": docs[0] if docs else None,
                "top1_hit": bool(docs) and docs[0] == item["expected_doc"],
                "rank_of_expected": (
                    docs.index(item["expected_doc"]) + 1
                    if item["expected_doc"] in docs else None
                ),
                "ranked_docs": docs,
            }
        per_question.append(row)
    expected = [item["expected_doc"] for item in questions]
    summary = {
        mode: evaluate_rankings(rankings_by_mode[mode], expected)
        for mode in MODES
    }
    return summary, per_question


def main():
    pipeline = RagPipeline(DOCUMENTS)
    questions = load_questions()
    topics = sorted({d["topic"] for d in DOCUMENTS})
    print(
        f"corpus: {len(DOCUMENTS)} documents, {len(topics)} topics "
        f"({', '.join(topics)}), {len(pipeline.chunks)} chunks"
    )
    print(f"questions: {len(questions)} labelled")
    summary, per_question = run_ablation(pipeline, questions)
    print("mode            top1   recall@3  mrr")
    for mode in MODES:
        s = summary[mode]
        print(
            f"{mode:<15} {s['top1_accuracy']:.3f}  {s['recall_at_3']:.3f}"
            f"     {s['mrr']:.3f}"
        )
    print(
        "id              expected          bm25_top1         vector_top1       "
        "hybrid_top1       rerank_top1       rank_rerank"
    )
    for row in per_question:
        print(
            f"{row['id']:<15} {row['expected_doc']:<17} "
            f"{str(row['bm25']['top1_doc']):<17} "
            f"{str(row['vector']['top1_doc']):<17} "
            f"{str(row['hybrid']['top1_doc']):<17} "
            f"{str(row['hybrid_rerank']['top1_doc']):<17} "
            f"{row['hybrid_rerank']['rank_of_expected']}"
        )
    results = {
        "documents": len(DOCUMENTS),
        "topics": topics,
        "chunks": len(pipeline.chunks),
        "questions": len(questions),
        "summary": summary,
        "per_question": per_question,
    }
    out_path = os.path.join(HERE, "results_build.json")
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(results, fh, indent=2, sort_keys=True)
    print(f"results written: {out_path}")

    demo = pipeline.query(
        "How many books can members borrow from the Northlight library?"
    )
    print("demo query:", demo["question"])
    for stage, entries in demo["stages"].items():
        view = ", ".join(
            f"{e['chunk_id']}={e['score']:.4f}" for e in entries
        )
        print(f"  {stage}: {view}")
    print(f"  answer: {demo['answer']}")
    print(
        "  citations: "
        + "; ".join(f"[{doc}:{chunk}]" for _, doc, chunk in demo["citations"])
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
